/**
 * 구로디지털 지역 식당 일괄 수집 스크립트
 *
 * 사용법:
 * npx ts-node scripts/seed-guro-restaurants.ts
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// 구로 디지털 단지 좌표
const GURO_DIGITAL_CENTER = {
  lat: 37.4824,
  lng: 126.8958,
}

// 검색할 카테고리와 검색어
const SEARCH_QUERIES = [
  '구로디지털단지 한식',
  '구로디지털단지 양식',
  '구로디지털단지 일식',
  '구로디지털단지 중식',
  '구로디지털단지 카페',
  '구로디지털단지 맛집',
]

interface NaverPlace {
  title: string
  category: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string
  mapy: string
  link: string
}

interface NaverSearchResponse {
  total: number
  start: number
  display: number
  items: NaverPlace[]
}

async function searchPlaces(query: string): Promise<NaverPlace[]> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('Naver API keys are not set')
  }

  const params = new URLSearchParams({
    query,
    display: '100', // 최대 100개
    sort: 'random',
  })

  const response = await fetch(
    `https://openapi.naver.com/v1/search/local.json?${params}`,
    {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status}`)
  }

  const data: NaverSearchResponse = await response.json()
  return data.items || []
}

async function saveToDatabase(places: NaverPlace[]) {
  const response = await fetch(`${API_BASE_URL}/api/search-places?save=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ places }),
  })

  if (!response.ok) {
    throw new Error(`Failed to save to database: ${response.status}`)
  }

  return response.json()
}

async function main() {
  console.log('🍽️  구로디지털 지역 식당 수집 시작...\n')

  let totalCollected = 0
  const allPlaces: NaverPlace[] = []

  for (const query of SEARCH_QUERIES) {
    console.log(`🔍 검색 중: "${query}"`)

    try {
      const places = await searchPlaces(query)
      console.log(`   ✅ ${places.length}개 발견`)

      allPlaces.push(...places)
      totalCollected += places.length

      // API 호출 제한을 피하기 위해 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`   ❌ 검색 실패:`, error)
    }
  }

  console.log(`\n📊 총 ${totalCollected}개 장소 수집 완료`)

  // 중복 제거 (같은 이름 + 같은 주소)
  const uniquePlaces = Array.from(
    new Map(
      allPlaces.map(place => [
        `${place.title}-${place.address}`,
        place
      ])
    ).values()
  )

  console.log(`📌 중복 제거 후: ${uniquePlaces.length}개\n`)

  console.log('💾 데이터베이스에 저장 중...')

  // 검색 API를 통해 저장 (이미 구현된 중복 체크 로직 활용)
  let savedCount = 0
  for (const place of uniquePlaces) {
    try {
      const queryParams = new URLSearchParams({
        query: place.title,
        save: 'true',
      })

      const response = await fetch(`${API_BASE_URL}/api/search-places?${queryParams}`)

      if (response.ok) {
        savedCount++
        console.log(`   ✅ ${savedCount}/${uniquePlaces.length}: ${place.title}`)
      }

      // API 호출 제한을 피하기 위해 대기
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`   ❌ 저장 실패: ${place.title}`)
    }
  }

  console.log(`\n🎉 완료! ${savedCount}개 식당이 데이터베이스에 저장되었습니다.`)
}

main().catch(console.error)
