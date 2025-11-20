'use client'

import { useState, useEffect } from 'react'
import { usePlaceSearch } from '@/lib/hooks/usePlaceSearch'
import { useRestaurants } from '@/lib/hooks/useRestaurants'
import NaverMap from './naver-map'
import RestaurantSlider from './restaurant-slider'
import { Restaurant, Profile } from '@/types/database'
import { Search, Mic, Heart, Edit, Home, MessageCircle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['한식', '양식', '일식', '중식'] as const

export default function PlaceSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [showSlider, setShowSlider] = useState(false)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [companyLocation, setCompanyLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  const { places, loading, error, searchPlaces } = usePlaceSearch()
  const { restaurants, loading: restaurantsLoading, fetchRestaurants } = useRestaurants()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      console.log('🔍 User:', user?.email)

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single<Profile>()

        console.log('👤 Profile:', profile)
        console.log('📍 Company Location:', {
          company_name: profile?.company_name,
          company_address: profile?.company_address,
          latitude: profile?.company_latitude,
          longitude: profile?.company_longitude,
        })

        if (error) {
          console.error('❌ Profile fetch error:', error)
        }

        setUserProfile(profile)

        // 승인된 회사 위치가 있으면 설정
        if (profile?.company_latitude && profile?.company_longitude) {
          console.log('✅ 회사 위치 설정됨:', {
            latitude: profile.company_latitude,
            longitude: profile.company_longitude,
          })

          setCompanyLocation({
            latitude: profile.company_latitude,
            longitude: profile.company_longitude,
          })

          // 회사 위치 3km 반경 내 식당 가져오기
          console.log('🍽️ 3km 반경 내 식당 검색 시작...')
          fetchRestaurants({
            latitude: profile.company_latitude,
            longitude: profile.company_longitude,
            radius: 3000, // 3km
            limit: 20,
          })
        } else {
          console.log('⚠️ 회사 위치가 등록되지 않음')
          // 회사 위치가 없으면 기본 식당 목록
          fetchRestaurants({ limit: 20 })
        }
      } else {
        console.log('⚠️ 로그인되지 않음')
        // 로그인하지 않은 경우 기본 식당 목록
        fetchRestaurants({ limit: 20 })
      }
    } catch (error) {
      console.error('❌ 프로필 조회 실패:', error)
      // 에러 발생 시에도 기본 식당 목록 표시
      fetchRestaurants({ limit: 20 })
    }
  }

  useEffect(() => {
    fetchUserProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      alert('검색어를 입력해주세요')
      return
    }

    // 회사 위치가 있으면 3km 반경 내에서 검색
    if (companyLocation) {
      console.log('🔍 회사 위치 기준 3km 반경 검색:', searchQuery)
      fetchRestaurants({
        query: searchQuery,
        latitude: companyLocation.latitude,
        longitude: companyLocation.longitude,
        radius: 3000, // 3km
        limit: 20,
      })
    } else {
      // 회사 위치가 없으면 Naver API로 검색
      console.log('🔍 Naver API 검색:', searchQuery)
      try {
        await searchPlaces({ query: searchQuery })
      } catch (err) {
        console.error('검색 실패:', err)
      }
    }
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category)

    // 회사 위치가 있으면 3km 반경 필터 적용
    if (companyLocation) {
      console.log('📂 카테고리 필터 (3km 반경):', category)
      fetchRestaurants({
        category: category === selectedCategory ? undefined : category,
        latitude: companyLocation.latitude,
        longitude: companyLocation.longitude,
        radius: 3000, // 3km
        limit: 20,
      })
    } else {
      fetchRestaurants({
        category: category === selectedCategory ? undefined : category,
        limit: 20
      })
    }
  }

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setShowSlider(true)
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 검색바 */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <form onSubmit={handleSearch} className="w-full">
          <div className="bg-white rounded-full shadow-lg flex items-center px-4 py-3">
            <Search size={20} className="text-gray-400 mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 outline-none text-gray-800"
            />
            <button type="submit" className="text-gray-400 ml-3">
              <Mic size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* 카테고리 버튼 */}
      <div className="absolute top-20 left-0 right-0 z-30 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                selectedCategory === category
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
              style={{
                backgroundColor: selectedCategory === category ? '#38BDF8' : undefined
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="absolute top-36 left-4 right-4 z-30 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* 네이버 지도 - 전체 화면 */}
      <div className="w-full h-full">
        <NaverMap
          places={places}
          restaurants={restaurants}
          height="100%"
          onRestaurantClick={handleRestaurantClick}
          companyLocation={companyLocation}
        />
      </div>

      {/* 하단 슬라이더 - 항상 표시 */}
      <RestaurantSlider
        restaurants={restaurants}
        selectedRestaurant={selectedRestaurant}
        onClose={() => {
          setShowSlider(false)
          setSelectedRestaurant(null)
        }}
        companyLocation={companyLocation}
      />

      {/* 하단 네비게이션 바 - 항상 고정 */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-50 shadow-lg"
        style={{ backgroundColor: '#38BDF8' }}
      >
        <button
          onClick={() => alert('찜한 식당 기능은 준비 중입니다')}
          className="flex flex-col items-center justify-center text-white p-2 hover:opacity-80 transition-opacity"
        >
          <Heart size={24} />
        </button>
        <button
          onClick={() => alert('리뷰 작성 기능은 준비 중입니다')}
          className="flex flex-col items-center justify-center text-white p-2 hover:opacity-80 transition-opacity"
        >
          <Edit size={24} />
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="flex flex-col items-center justify-center text-white p-2 hover:opacity-80 transition-opacity"
        >
          <Home size={28} fill="white" />
        </button>
        <button
          onClick={() => alert('채팅 기능은 준비 중입니다')}
          className="flex flex-col items-center justify-center text-white p-2 hover:opacity-80 transition-opacity"
        >
          <MessageCircle size={24} />
        </button>
        <button
          onClick={() => window.location.href = '/profile'}
          className="flex flex-col items-center justify-center text-white p-2 hover:opacity-80 transition-opacity"
        >
          <User size={24} />
        </button>
      </nav>
    </div>
  )
}
