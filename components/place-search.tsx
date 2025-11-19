'use client'

import { useState } from 'react'
import { usePlaceSearch } from '@/lib/hooks/usePlaceSearch'
import NaverMap from './naver-map'

export default function PlaceSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const { places, loading, error, searchPlaces } = usePlaceSearch()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      alert('검색어를 입력해주세요')
      return
    }

    try {
      await searchPlaces({ query: searchQuery })
    } catch (err) {
      console.error('검색 실패:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">음식점 검색</h2>

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="음식점 이름을 입력하세요 (예: 강남 치킨)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </form>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* 지도 + 검색 결과 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 네이버 지도 - 항상 표시 */}
        <div className="lg:sticky lg:top-6 h-fit">
          <h3 className="text-lg font-semibold mb-3">지도</h3>
          <NaverMap places={places} height="600px" />
        </div>

        {/* 검색 결과 리스트 */}
        {places.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold mb-3">
              검색 결과 ({places.length}개)
            </h3>
            <div className="space-y-3">
              {places.map((place) => (
                <div
                  key={place.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <h4 className="font-semibold text-lg text-gray-900">
                    {place.name}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{place.category}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {place.roadAddress || place.address}
                  </p>
                  {place.phone && (
                    <p className="text-sm text-gray-600 mt-1">📞 {place.phone}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <a
                      href={place.placeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline"
                    >
                      네이버 지도에서 보기 →
                    </a>
                    <span className="text-xs text-gray-400">
                      좌표: {place.y.toFixed(6)}, {place.x.toFixed(6)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">검색 결과가 없습니다</p>
              <p className="text-sm">위 검색창에서 맛집을 검색해보세요!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
