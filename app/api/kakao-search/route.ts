import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const x = searchParams.get('x') // 경도
  const y = searchParams.get('y') // 위도
  const radius = searchParams.get('radius') || '2000' // 반경(미터)
  const size = searchParams.get('size') || '15' // 결과 개수

  if (!query) {
    return NextResponse.json(
      { error: '검색어가 필요합니다' },
      { status: 400 }
    )
  }

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY

  if (!kakaoApiKey) {
    return NextResponse.json(
      { error: 'Kakao API 키가 설정되지 않았습니다' },
      { status: 500 }
    )
  }

  try {
    const params = new URLSearchParams({
      query,
      size,
    })

    // 좌표 기반 검색
    if (x && y) {
      params.append('x', x)
      params.append('y', y)
      params.append('radius', radius)
    }

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      {
        headers: {
          Authorization: `KakaoAK ${kakaoApiKey}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Kakao API Error Response:', {
        status: response.status,
        body: errorText,
      })
      throw new Error(`Kakao API error: ${response.status}`)
    }

    const data = await response.json()

    // 응답 가공
    const places = data.documents.map((place: any) => ({
      id: place.id,
      name: place.place_name,
      category: place.category_name,
      phone: place.phone || '',
      address: place.address_name,
      roadAddress: place.road_address_name || '',
      x: parseFloat(place.x), // 경도
      y: parseFloat(place.y), // 위도
      placeUrl: place.place_url,
      distance: place.distance || '',
    }))

    return NextResponse.json({
      places,
      meta: {
        total_count: data.meta.total_count,
        pageable_count: data.meta.pageable_count,
        is_end: data.meta.is_end,
      },
    })
  } catch (error) {
    console.error('Kakao Local API Error:', error)
    return NextResponse.json(
      { error: '음식점 검색에 실패했습니다' },
      { status: 500 }
    )
  }
}
