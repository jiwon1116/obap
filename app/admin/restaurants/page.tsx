'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Restaurant, Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

export default function AdminRestaurantsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<Profile>()

    if (!profile || profile.role !== 'admin') {
      alert('관리자 권한이 필요합니다')
      router.push('/')
      return
    }

    setProfile(profile)
    await fetchRestaurants()
    setLoading(false)
  }

  const fetchRestaurants = async () => {
    const response = await fetch('/api/restaurants?limit=100')
    if (response.ok) {
      const data = await response.json()
      console.log('✅ 식당 목록:', data.restaurants)
      setRestaurants(data.restaurants)
    } else {
      console.error('❌ 식당 목록 조회 실패:', response.status)
    }
  }

  const handleRestaurantClick = (restaurant: Restaurant) => {
    console.log('🍽️ 식당 클릭:', restaurant.name)
    router.push(`/admin/restaurants/${restaurant.id}`)
  }

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃 중 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">식당 관리 (관리자)</h1>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/admin/location-approvals')}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                승인 관리
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem('viewMainPage', 'true')
                  router.push('/')
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                지도 보기
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-xl font-bold mb-4">식당 목록 ({restaurants.length}개)</h2>
          {restaurants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">식당이 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => handleRestaurantClick(restaurant)}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                  style={{ userSelect: 'none' }}
                >
                  <h3 className="font-bold text-lg">{restaurant.name}</h3>
                  <p className="text-sm text-gray-600">{restaurant.category}</p>
                  <p className="text-xs text-gray-500 mt-1">{restaurant.address}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
