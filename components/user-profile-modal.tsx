'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser(user)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setProfile(profileData)
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!isOpen) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 max-w-md mx-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">회원 정보</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : user ? (
            <div className="space-y-4">
              {/* 프로필 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: '#38BDF8' }}
                  >
                    {profile?.nickname?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{profile?.nickname || '사용자'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {profile?.username && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">아이디</span>
                      <span className="font-medium">{profile.username}</span>
                    </div>
                  )}
                  {profile?.role && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">역할</span>
                      <span className="font-medium">
                        {profile.role === 'employee' ? '직장인' : '게스트'}
                      </span>
                    </div>
                  )}
                  {profile?.company_domain && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">회사 도메인</span>
                      <span className="font-medium">{profile.company_domain}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className="space-y-2">
                <button
                  onClick={() => alert('프로필 수정 기능은 준비 중입니다')}
                  className="w-full py-3 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: '#38BDF8', color: 'white' }}
                >
                  프로필 수정
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">로그인이 필요합니다</p>
              <button
                onClick={() => (window.location.href = '/login')}
                className="px-6 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: '#38BDF8' }}
              >
                로그인하기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
