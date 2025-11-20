'use client'

import { useState, useEffect } from 'react'
import { useRestaurants } from '@/lib/hooks/useRestaurants'

export default function TestRestaurantsPage() {
  const { restaurants, loading, error, meta, fetchRestaurants, createRestaurant } = useRestaurants()
  const [testResult, setTestResult] = useState<string>('')

  // 테스트 1: 모든 식당 불러오기
  const testFetchAll = async () => {
    setTestResult('모든 식당 조회 중...')
    try {
      await fetchRestaurants({ limit: 10 })
      setTestResult(`✅ 성공! ${restaurants.length}개 식당 조회됨`)
    } catch (err) {
      setTestResult(`❌ 실패: ${err}`)
    }
  }

  // 테스트 2: 위치 기반 검색 (구디 디지털 단지 근처)
  const testLocationSearch = async () => {
    setTestResult('위치 기반 검색 중...')
    try {
      const result = await fetchRestaurants({
        latitude: 37.4824,
        longitude: 126.8958,
        radius: 2000, // 2km
        limit: 10,
      })
      setTestResult(`✅ 성공! 2km 반경 내 ${result.restaurants.length}개 식당 발견`)
    } catch (err) {
      setTestResult(`❌ 실패: ${err}`)
    }
  }

  // 테스트 3: 테스트 식당 생성
  const testCreateRestaurant = async () => {
    setTestResult('테스트 식당 생성 중...')
    try {
      const newRestaurant = await createRestaurant({
        name: '테스트 식당 ' + Date.now(),
        category: '한식',
        address: '서울특별시 구로구 디지털로34길 27',
        road_address: '서울특별시 구로구 디지털로34길 27',
        latitude: 37.4824,
        longitude: 126.8958,
        phone: '02-1234-5678',
        place_url: 'https://example.com',
        price_tier: 'under_8000',
        description: '테스트용 식당입니다',
      })
      setTestResult(`✅ 성공! 식당 생성됨: ${newRestaurant.name}`)
    } catch (err: any) {
      setTestResult(`❌ 실패: ${err.message || err}`)
    }
  }

  // 테스트 4: 카테고리 필터링
  const testCategoryFilter = async () => {
    setTestResult('카테고리 필터링 중...')
    try {
      const result = await fetchRestaurants({
        category: '한식',
        limit: 10,
      })
      setTestResult(`✅ 성공! 한식 카테고리 ${result.restaurants.length}개 발견`)
    } catch (err) {
      setTestResult(`❌ 실패: ${err}`)
    }
  }

  // 테스트 0: 테스트 데이터 추가 (네이버 API 없이)
  const testSeedData = async () => {
    setTestResult('테스트 데이터 추가 중...')
    try {
      const response = await fetch('/api/seed-restaurants', {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        setTestResult(`✅ ${data.message}`)
        // 데이터 추가 후 자동으로 조회
        await fetchRestaurants({ limit: 10 })
      } else {
        setTestResult(`❌ 실패: ${data.error || data.message}`)
      }
    } catch (err: any) {
      setTestResult(`❌ 실패: ${err.message || err}`)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🧪 식당 API 테스트
        </h1>

        {/* 테스트 버튼들 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">테스트 실행</h2>

          {/* 첫 시작 버튼 */}
          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              ⚠️ <strong>처음 시작:</strong> DB가 비어있으면 먼저 이 버튼을 클릭하세요!
            </p>
            <button
              onClick={testSeedData}
              className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold text-lg"
            >
              🌱 테스트 데이터 5개 추가하기 (네이버 API 불필요)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={testFetchAll}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              1. 전체 식당 조회
            </button>
            <button
              onClick={testLocationSearch}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              2. 위치 기반 검색 (구디)
            </button>
            <button
              onClick={testCreateRestaurant}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              3. 테스트 식당 생성
            </button>
            <button
              onClick={testCategoryFilter}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              4. 카테고리 필터 (한식)
            </button>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">⏳ 처리 중...</p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
            <p className="text-red-800">❌ 에러: {error}</p>
          </div>
        )}

        {/* 테스트 결과 */}
        {testResult && (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">테스트 결과:</h3>
            <p className="text-gray-800">{testResult}</p>
          </div>
        )}

        {/* 메타 정보 */}
        {meta.total > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="font-semibold mb-2">📊 조회 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">총 식당 수:</span>{' '}
                <span className="font-semibold">{meta.total}</span>
              </div>
              <div>
                <span className="text-gray-600">현재 페이지:</span>{' '}
                <span className="font-semibold">{meta.page} / {meta.total_pages}</span>
              </div>
              <div>
                <span className="text-gray-600">페이지당 개수:</span>{' '}
                <span className="font-semibold">{meta.limit}</span>
              </div>
              <div>
                <span className="text-gray-600">현재 조회된 수:</span>{' '}
                <span className="font-semibold">{restaurants.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* 식당 목록 */}
        {restaurants.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              📍 식당 목록 ({restaurants.length}개)
            </h2>
            <div className="space-y-4">
              {restaurants.map((restaurant: any) => (
                <div
                  key={restaurant.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {restaurant.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {restaurant.category}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        📍 {restaurant.road_address || restaurant.address}
                      </p>
                      {restaurant.phone && (
                        <p className="text-sm text-gray-600 mt-1">
                          📞 {restaurant.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {restaurant.distance_meters && (
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                          {Math.round(restaurant.distance_meters)}m
                        </div>
                      )}
                      {restaurant.walking_minutes && (
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          도보 {restaurant.walking_minutes}분
                        </div>
                      )}
                      {restaurant.price_tier && (
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mt-2">
                          {restaurant.price_tier === 'under_8000' && '8천원 이하'}
                          {restaurant.price_tier === 'around_10000' && '만원대'}
                          {restaurant.price_tier === 'premium' && '프리미엄'}
                        </div>
                      )}
                      {restaurant.is_newly_opened && (
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mt-2">
                          🆕 신규
                        </div>
                      )}
                    </div>
                  </div>
                  {restaurant.description && (
                    <p className="text-sm text-gray-600 mt-3 pt-3 border-t">
                      {restaurant.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안내 */}
        {restaurants.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-center">
            <p className="text-yellow-800 mb-2">
              ℹ️ 위 버튼을 클릭해서 API를 테스트해보세요!
            </p>
            <p className="text-sm text-yellow-700">
              테스트 3번은 직장인 로그인이 필요합니다.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
