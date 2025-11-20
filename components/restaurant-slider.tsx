'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Restaurant, RestaurantWithDistance } from '@/types/database'
import { ChevronDown, Clock, Heart } from 'lucide-react'

interface RestaurantSliderProps {
  restaurants: (Restaurant | RestaurantWithDistance)[]
  selectedRestaurant: Restaurant | RestaurantWithDistance | null
  onClose: () => void
  companyLocation?: { latitude: number; longitude: number } | null
}

export default function RestaurantSlider({
  restaurants,
  selectedRestaurant,
  onClose,
  companyLocation,
}: RestaurantSliderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'최신순' | '가격순' | '거리순'>('최신순')
  const [showUserProfile, setShowUserProfile] = useState(false)

  // RestaurantWithDistance 타입 가드
  const hasWalkingTime = (restaurant: Restaurant | RestaurantWithDistance): restaurant is RestaurantWithDistance => {
    return 'walking_minutes' in restaurant && 'distance_meters' in restaurant
  }

  useEffect(() => {
    if (selectedRestaurant) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [selectedRestaurant])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      onClose()
    }, 300) // 애니메이션 완료 후 닫기
  }

  return (
    <>
      {/* 백드롭 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={handleClose}
        />
      )}

      {/* 슬라이더 */}
      <div
        className={`fixed left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 transition-transform duration-300 ease-out bottom-16 ${
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-85px)]'
        }`}
        style={{ maxHeight: 'calc(85vh - 64px)' }}
      >
        {/* 드래그 핸들 */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-12 h-1 rounded-full" style={{ backgroundColor: '#D9D9D9' }} />
        </div>

        {/* O!BAP 로고 이미지 */}
        <div className="px-6 py-3 flex justify-center">
          <Image
            src="/OBAP-1.png"
            alt="O!BAP"
            width={120}
            height={40}
            priority
          />
        </div>

        {/* 필터 버튼 - 슬라이더 열렸을 때만 표시 */}
        {isOpen && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex gap-3 justify-center">
              {(['최신순', '가격순', '거리순'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    activeFilter === filter
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: activeFilter === filter ? '#38BDF8' : undefined
                  }}
                >
                  {filter}
                  <ChevronDown size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 식당 리스트 - 스크롤 가능 */}
        <div
          className="overflow-y-auto px-6 py-4"
          style={{
            maxHeight: 'calc(85vh - 200px)',
            overscrollBehavior: 'contain'
          }}
        >
          {selectedRestaurant ? (
            // 선택된 식당 상세보기
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedRestaurant.name}</h3>
                <button
                  onClick={handleClose}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    평점
                  </span>
                  <span className="font-semibold">{selectedRestaurant.avg_rating || 0}</span>
                </div>
                {companyLocation && hasWalkingTime(selectedRestaurant) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-2 py-1 rounded flex items-center gap-1" style={{ backgroundColor: '#FFF3E0', color: '#FF8A00' }}>
                      <Clock size={14} />
                      도보
                    </span>
                    <span className="font-semibold" style={{ color: '#FF8A00' }}>
                      약 {selectedRestaurant.walking_minutes}분
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(selectedRestaurant.distance_meters / 1000).toFixed(2)}km)
                    </span>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  메뉴: {selectedRestaurant.category}
                </div>
                <div className="text-sm text-gray-600">
                  가격: {selectedRestaurant.price_tier === 'under_8000' ? '8천원대' : selectedRestaurant.price_tier === 'around_10000' ? '1만원대' : '프리미엄'}
                </div>
                <div className="text-sm text-gray-600">
                  리뷰: {selectedRestaurant.review_count || 0}개
                </div>
              </div>

              {selectedRestaurant.description && (
                <p className="text-sm text-gray-700 mb-4">{selectedRestaurant.description}</p>
              )}

              <div className="text-sm text-gray-500">
                📍 {selectedRestaurant.road_address || selectedRestaurant.address}
              </div>
              {selectedRestaurant.phone && (
                <div className="text-sm text-gray-500 mt-1">
                  📞 {selectedRestaurant.phone}
                </div>
              )}
            </div>
          ) : (
            // 전체 식당 목록
            <div className="space-y-4">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-lg">{restaurant.name}</h4>
                    <button className="text-gray-300 hover:text-red-500 transition-colors">
                      <Heart size={24} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      평점
                    </span>
                    <span className="font-semibold">{restaurant.avg_rating || 0}</span>
                  </div>

                  {companyLocation && hasWalkingTime(restaurant) && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ backgroundColor: '#FFF3E0', color: '#FF8A00' }}>
                        <Clock size={12} />
                        도보
                      </span>
                      <span className="text-sm font-medium" style={{ color: '#FF8A00' }}>
                        약 {restaurant.walking_minutes}분
                      </span>
                      <span className="text-xs text-gray-400">
                        ({(restaurant.distance_meters / 1000).toFixed(2)}km)
                      </span>
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-2">
                    메뉴: {restaurant.category}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    가격: {restaurant.price_tier === 'under_8000' ? '8천원대' : restaurant.price_tier === 'around_10000' ? '1만원대' : '프리미엄'}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    리뷰: {restaurant.review_count || 0}개
                  </div>

                  {/* 음식 사진 */}
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="aspect-square bg-gray-200 rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
