import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const display = searchParams.get('display') || '15' // 한 번에 가져올 결과 수

  if (!query) {
    return NextResponse.json(
      { error: '검색어가 필요합니다' },
      { status: 400 }
    )
  }

  const naverClientId = process.env.NAVER_CLIENT_ID
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET

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
      throw new Error(`Naver API error: ${response.status}`)
    }

    const data = await response.json()

    // 결과 가공
    const places = data.items.map((place: any, index: number) => ({
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
