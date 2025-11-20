import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Menu } from '@/types/database'

// GET /api/menus - Get all menus or menus for a specific restaurant
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const restaurantId = searchParams.get('restaurant_id')

  try {
    const supabase = await createClient()

    let query = supabase
      .from('menus')
      .select('*')
      .eq('is_available', true)
      .order('is_signature', { ascending: false })
      .order('price', { ascending: true })

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching menus:', error)
      // 테이블이 없을 경우 빈 배열 반환
      if (error.code === 'PGRST205') {
        return NextResponse.json({ menus: [] })
      }
      return NextResponse.json(
        { error: '메뉴 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ menus: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/menus - Create a new menu (admin only)
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

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as { role: string }).role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['restaurant_id', 'menu_name', 'price']
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { error: `${field} 필드는 필수입니다` },
          { status: 400 }
        )
      }
    }

    // Insert menu
    const { data, error } = await supabase
      .from('menus')
      .insert({
        restaurant_id: body.restaurant_id,
        menu_name: body.menu_name,
        price: body.price,
        description: body.description || null,
        image_url: body.image_url || null,
        is_signature: body.is_signature || false,
        is_available: body.is_available !== undefined ? body.is_available : true,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating menu:', error)
      return NextResponse.json(
        { error: '메뉴 등록에 실패했습니다' },
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
