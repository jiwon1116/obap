import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const display = searchParams.get('display') || '15' // 한 번에 가져올 결과 수
  const saveToDb = searchParams.get('save') === 'true' // DB 저장 옵션

  if (!query) {
    return NextResponse.json(
      { error: '검색어가 필요합니다' },
      { status: 400 }
    )
  }

  const naverClientId = process.env.NAVER_CLIENT_ID
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET

  console.log('Naver API Keys:', {
    clientId: naverClientId ? `${naverClientId.substring(0, 5)}...` : 'NOT SET',
    clientSecret: naverClientSecret ? `${naverClientSecret.substring(0, 5)}...` : 'NOT SET',
  })

  if (!naverClientId || !naverClientSecret) {
    return NextResponse.json(
      { error: 'Naver API 키가 설정되지 않았습니다' },
      { status: 500 }
    )
  }

  try {
    // 네이버 지역검색 API 호출
    const params = new URLSearchParams({
      query,
      display,
      sort: 'random', // random 또는 comment (카페/블로그 리뷰 개수 순)
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
      const errorText = await response.text()
      console.error('Naver API Error Response:', {
        status: response.status,
        body: errorText,
      })
      throw new Error(`Naver API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Naver API Response:', JSON.stringify(data, null, 2))

    // Local Search 결과가 없고, 주소 형태의 검색어인 경우 Geocoding API 시도
    if ((!data.items || data.items.length === 0) && (query.includes('로') || query.includes('길') || query.includes('동'))) {
      console.log('Local Search 결과 없음. Geocoding API 시도...')

      const geocodingResponse = await fetch(
        `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'X-NCP-APIGW-API-KEY-ID': naverClientId,
            'X-NCP-APIGW-API-KEY': naverClientSecret,
          },
        }
      )

      if (geocodingResponse.ok) {
        const geocodingData = await geocodingResponse.json()
        console.log('Geocoding API Response:', JSON.stringify(geocodingData, null, 2))

        if (geocodingData.addresses && geocodingData.addresses.length > 0) {
          // Geocoding 결과를 Local Search와 동일한 형태로 변환
          const geocodingItems = geocodingData.addresses.map((addr: any, index: number) => ({
            title: addr.roadAddress || addr.jibunAddress,
            category: '주소',
            telephone: '',
            address: addr.jibunAddress || '',
            roadAddress: addr.roadAddress || '',
            mapx: String(Math.round(parseFloat(addr.x) * 10000000)),
            mapy: String(Math.round(parseFloat(addr.y) * 10000000)),
            link: '',
          }))

          // Geocoding 결과를 data.items에 추가
          data.items = geocodingItems
          data.total = geocodingData.meta.totalCount
        }
      }
    }

    // 응답 데이터 구조 확인
    if (!data.places && !data.items) {
      console.error('Unexpected API response structure:', data)
      throw new Error('Unexpected API response structure')
    }

    // 결과 가공 (NCP Place API는 places 배열 사용)
    const items = data.places || data.items || []
    const places = items.map((place: any, index: number) => ({
      id: `naver-${index}-${Date.now()}`, // 네이버 API는 고유 ID를 제공하지 않으므로 생성
      name: place.title.replace(/<\/?b>/g, ''), // HTML 태그 제거
      category: place.category || '',
      phone: place.telephone || '',
      address: place.address || '',
      roadAddress: place.roadAddress || '',
      x: place.mapx ? parseFloat(place.mapx) / 10000000 : 0, // 경도 (KATEC → WGS84)
      y: place.mapy ? parseFloat(place.mapy) / 10000000 : 0, // 위도 (KATEC → WGS84)
      placeUrl: place.link || '',
      distance: '',
    }))

    // DB 저장 옵션이 활성화된 경우
    if (saveToDb) {
      const supabase = await createClient()

      // 사용자 인증 확인
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // 직장인 여부 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if ((profile as { role: string } | null)?.role === 'employee') {
          // 각 장소를 DB에 저장 (중복 체크)
          const savedPlaces = []
          for (const place of places) {
            try {
              // 이미 존재하는지 확인 (같은 이름, 같은 주소)
              const { data: existing } = await supabase
                .from('restaurants')
                .select('id')
                .eq('name', place.name)
                .eq('address', place.address)
                .maybeSingle()

              if (!existing && place.y && place.x) {
                // 존재하지 않으면 새로 저장
                const { data: saved, error } = await supabase
                  .from('restaurants')
                  .insert({
                    name: place.name,
                    category: place.category,
                    phone: place.phone || null,
                    address: place.address,
                    road_address: place.roadAddress || null,
                    latitude: place.y,
                    longitude: place.x,
                    place_url: place.placeUrl || null,
                    created_by: user.id,
                  } as never)
                  .select()
                  .single()

                if (!error && saved) {
                  savedPlaces.push(saved)
                }
              }
            } catch (err) {
              // 개별 저장 실패는 무시하고 계속 진행
              console.error('Error saving place:', err)
            }
          }

          console.log(`Saved ${savedPlaces.length} new restaurants to database`)
        }
      }
    }

    return NextResponse.json({
      places,
      meta: {
        total_count: data.total,
        pageable_count: data.display,
        is_end: data.start + data.display >= data.total,
      },
    })
  } catch (error) {
    console.error('Naver Local API Error:', error)
    return NextResponse.json(
      { error: '음식점 검색에 실패했습니다' },
      { status: 500 }
    )
  }
}
