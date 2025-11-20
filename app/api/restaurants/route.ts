import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RestaurantWithDistance } from '@/types/database'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  // Filters
  const category = searchParams.get('category')
  const priceTier = searchParams.get('price_tier')
  const newlyOpened = searchParams.get('newly_opened') === 'true'
  const query = searchParams.get('query') // 검색어

  // Location filters
  const latitude = searchParams.get('latitude')
  const longitude = searchParams.get('longitude')
  const radius = parseInt(searchParams.get('radius') || '2000') // Default 2km

  // Sorting
  const sortBy = searchParams.get('sort') || 'distance' // distance, rating, review_count, newest

  try {
    const supabase = await createClient()

    // If location provided, use PostGIS function for distance filtering
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)

      const { data, error } = await supabase.rpc('find_restaurants_within_radius', {
        center_lat: lat,
        center_lng: lng,
        radius_meters: radius,
      } as never)

      if (error) {
        console.error('Error fetching restaurants:', error)
        return NextResponse.json(
          { error: '식당 조회에 실패했습니다' },
          { status: 500 }
        )
      }

      let restaurants = data as RestaurantWithDistance[]

      // Apply filters
      if (query) {
        const lowerQuery = query.toLowerCase()
        restaurants = restaurants.filter(
          (r) =>
            r.name.toLowerCase().includes(lowerQuery) ||
            r.category.toLowerCase().includes(lowerQuery) ||
            (r.description && r.description.toLowerCase().includes(lowerQuery)) ||
            (r.address && r.address.toLowerCase().includes(lowerQuery))
        )
      }

      if (category) {
        restaurants = restaurants.filter((r) => r.category.includes(category))
      }

      if (priceTier) {
        restaurants = restaurants.filter((r) => r.price_tier === priceTier)
      }

      if (newlyOpened) {
        restaurants = restaurants.filter((r) => r.is_newly_opened)
      }

      // Apply sorting
      switch (sortBy) {
        case 'rating':
          restaurants.sort((a, b) => b.avg_rating - a.avg_rating)
          break
        case 'review_count':
          restaurants.sort((a, b) => b.review_count - a.review_count)
          break
        case 'newest':
          restaurants.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          break
        case 'distance':
        default:
          // Already sorted by distance from the function
          break
      }

      // Apply pagination
      const total = restaurants.length
      const paginatedRestaurants = restaurants.slice(offset, offset + limit)

      return NextResponse.json({
        restaurants: paginatedRestaurants,
        meta: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      })
    } else {
      // No location provided, fetch all restaurants
      let query = supabase.from('restaurants').select('*', { count: 'exact' })

      // Apply filters
      if (category) {
        query = query.ilike('category', `%${category}%`)
      }

      if (priceTier) {
        query = query.eq('price_tier', priceTier)
      }

      // Note: is_newly_opened is calculated dynamically, only available in location-based queries
      // if (newlyOpened) {
      //   query = query.eq('is_newly_opened', true)
      // }

      // Apply sorting
      switch (sortBy) {
        case 'rating':
          query = query.order('avg_rating', { ascending: false })
          break
        case 'review_count':
          query = query.order('review_count', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
          break
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching restaurants:', error)
        return NextResponse.json(
          { error: '식당 조회에 실패했습니다' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        restaurants: data,
        meta: {
          total: count || 0,
          page,
          limit,
          total_pages: Math.ceil((count || 0) / limit),
        },
      })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Check if user is an employee
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as { role: string }).role !== 'employee') {
      return NextResponse.json(
        { error: '직장인 회원만 식당을 등록할 수 있습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'category', 'address', 'latitude', 'longitude']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} 필드는 필수입니다` },
          { status: 400 }
        )
      }
    }

    // Insert restaurant
    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name: body.name,
        category: body.category,
        phone: body.phone || null,
        address: body.address,
        road_address: body.road_address || null,
        latitude: body.latitude,
        longitude: body.longitude,
        place_url: body.place_url || null,
        price_tier: body.price_tier || null,
        description: body.description || null,
        opening_date: body.opening_date || null,
        naver_place_id: body.naver_place_id || null,
        created_by: user.id,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating restaurant:', error)
      return NextResponse.json(
        { error: '식당 등록에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
