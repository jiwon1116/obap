import { NextResponse, NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// 테스트용 식당 데이터 (구디 디지털 단지 근처)
const testRestaurants = [
  {
    name: '맛있는 김밥',
    category: '한식',
    address: '서울특별시 구로구 디지털로34길 27',
    road_address: '서울특별시 구로구 디지털로34길 27',
    latitude: 37.4824,
    longitude: 126.8958,
    phone: '02-1234-5678',
    price_tier: 'under_8000',
    description: '구디 최고의 김밥집',
  },
  {
    name: '점심 특선 한식당',
    category: '한식',
    address: '서울특별시 구로구 디지털로33길 28',
    road_address: '서울특별시 구로구 디지털로33길 28',
    latitude: 37.4834,
    longitude: 126.8968,
    phone: '02-2345-6789',
    price_tier: 'around_10000',
    description: '든든한 한끼',
  },
  {
    name: '중국집 차이나타운',
    category: '중식',
    address: '서울특별시 구로구 디지털로32가길 19',
    road_address: '서울특별시 구로구 디지털로32가길 19',
    latitude: 37.4814,
    longitude: 126.8948,
    phone: '02-3456-7890',
    price_tier: 'under_8000',
    description: '짜장면 맛집',
  },
  {
    name: '일식당 스시마루',
    category: '일식',
    address: '서울특별시 구로구 디지털로31길 20',
    road_address: '서울특별시 구로구 디지털로31길 20',
    latitude: 37.4844,
    longitude: 126.8978,
    phone: '02-4567-8901',
    price_tier: 'premium',
    description: '프리미엄 초밥',
  },
  {
    name: '카페 디지털',
    category: '카페',
    address: '서울특별시 구로구 디지털로30길 21',
    road_address: '서울특별시 구로구 디지털로30길 21',
    latitude: 37.4804,
    longitude: 126.8938,
    phone: '02-5678-9012',
    price_tier: 'under_8000',
    description: '조용한 카페',
  },
]

export async function POST() {
  try {
    // Service Role 클라이언트 사용 (RLS 우회)
    const supabase = createServiceRoleClient()

    // 각 테스트 식당 삽입
    const results: Array<{ name: string; success: boolean; error?: string; id?: string }> = []
    for (const restaurant of testRestaurants) {
      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          ...restaurant,
          created_by: null, // 테스트 데이터는 created_by null
        } as any)
        .select()
        .single()

      if (error) {
        console.error('Error inserting restaurant:', error)
        results.push({ name: restaurant.name, success: false, error: error.message })
      } else {
        results.push({ name: restaurant.name, success: true, id: (data as any)?.id })
      }
    }

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      message: `✅ ${successCount}개의 테스트 식당이 추가되었습니다!`,
      results,
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: '테스트 데이터 추가 실패',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seed-restaurants
 * 구로디지털 지역 식당을 네이버 API로 수집해서 DB에 저장
 */
export async function GET() {
  const supabase = createServiceRoleClient()

  const naverClientId = process.env.NAVER_CLIENT_ID
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET

  if (!naverClientId || !naverClientSecret) {
    return NextResponse.json(
      { error: 'Naver API 키가 설정되지 않았습니다' },
      { status: 500 }
    )
  }

  try {
    const searchQueries = [
      // 구로디지털단지
      '구로디지털단지 한식',
      '구로디지털단지 양식',
      '구로디지털단지 일식',
      '구로디지털단지 중식',
      '구로디지털단지 맛집',
      '구로디지털단지 식당',
      // 남구로
      '남구로 한식',
      '남구로 양식',
      '남구로 일식',
      '남구로 중식',
      '남구로 맛집',
      '남구로 식당',
      // 가산디지털단지
      '가산디지털단지 한식',
      '가산디지털단지 양식',
      '가산디지털단지 일식',
      '가산디지털단지 중식',
      '가산디지털단지 맛집',
      '가산디지털단지 식당',
    ]

    let totalSaved = 0
    let totalSearched = 0
    const results: { query: string; found: number; saved: number }[] = []

    for (const query of searchQueries) {
      try {
        // 네이버 API 검색
        const params = new URLSearchParams({
          query,
          display: '100',
          sort: 'random',
        })

        const response = await fetch(
          `https://openapi.naver.com/v1/search/local.json?${params}`,
          {
            headers: {
              'X-Naver-Client-Id': naverClientId,
              'X-Naver-Client-Secret': naverClientSecret,
            },
          }
        )

        if (!response.ok) {
          console.error(`Naver API error for query "${query}": ${response.status}`)
          continue
        }

        const data = await response.json()
        const items = data.items || []
        totalSearched += items.length

        let savedCount = 0

        // 각 장소를 DB에 저장
        for (const place of items) {
          try {
            const name = place.title.replace(/<\/?b>/g, '')
            const address = place.address || ''
            const lat = place.mapy ? parseFloat(place.mapy) / 10000000 : null
            const lng = place.mapx ? parseFloat(place.mapx) / 10000000 : null

            if (!lat || !lng) continue

            // 중복 확인
            const { data: existing } = await supabase
              .from('restaurants')
              .select('id')
              .eq('name', name)
              .eq('address', address)
              .maybeSingle()

            if (!existing) {
              // 카테고리 추출
              let category = '기타'
              const categoryStr = place.category || ''
              if (categoryStr.includes('한식') || query.includes('한식')) {
                category = '한식'
              } else if (
                categoryStr.includes('양식') ||
                categoryStr.includes('이탈리아') ||
                query.includes('양식')
              ) {
                category = '양식'
              } else if (
                categoryStr.includes('일식') ||
                categoryStr.includes('초밥') ||
                query.includes('일식')
              ) {
                category = '일식'
              } else if (categoryStr.includes('중식') || query.includes('중식')) {
                category = '중식'
              }

              const { error } = await supabase.from('restaurants').insert({
                name,
                category,
                phone: place.telephone || null,
                address,
                road_address: place.roadAddress || null,
                latitude: lat,
                longitude: lng,
                place_url: place.link || null,
                created_by: null,
              } as any)

              if (!error) {
                savedCount++
                totalSaved++
              }
            }
          } catch (err) {
            console.error('Error saving place:', err)
          }
        }

        results.push({
          query,
          found: items.length,
          saved: savedCount,
        })

        // API 호출 제한을 위해 1초 대기
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (err) {
        console.error(`Error processing query "${query}":`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `총 ${totalSearched}개 검색, ${totalSaved}개 신규 저장`,
      results,
      summary: {
        totalSearched,
        totalSaved,
      },
    })
  } catch (error) {
    console.error('Seed restaurants error:', error)
    return NextResponse.json(
      { error: '식당 수집 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/seed-restaurants
 * 테스트 식당 데이터 삭제
 */
export async function DELETE() {
  const supabase = createServiceRoleClient()

  try {
    // 테스트 식당 이름 목록
    const testRestaurantNames = [
      '맛있는 김밥',
      '점심 특선 한식당',
      '중국집 차이나타운',
      '일식당 스시마루',
      '카페 디지털',
    ]

    // 테스트 식당 삭제 (이름이 일치하는 것들)
    const { data: deletedByName, error: error1 } = await supabase
      .from('restaurants')
      .delete()
      .in('name', testRestaurantNames)
      .select()

    // created_by가 null인 식당도 삭제 (테스트 데이터)
    const { data: deletedByNull, error: error2 } = await supabase
      .from('restaurants')
      .delete()
      .is('created_by', null)
      .select()

    const totalDeleted = (deletedByName?.length || 0) + (deletedByNull?.length || 0)

    if (error1 || error2) {
      console.error('Delete errors:', { error1, error2 })
    }

    return NextResponse.json({
      success: true,
      message: `${totalDeleted}개의 테스트 식당이 삭제되었습니다`,
      deletedByName: deletedByName?.length || 0,
      deletedByNull: deletedByNull?.length || 0,
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: '테스트 데이터 삭제 실패' },
      { status: 500 }
    )
  }
}
