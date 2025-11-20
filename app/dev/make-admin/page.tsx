'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MakeAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentProfile, setCurrentProfile] = useState<any>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setCurrentUser(user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setCurrentProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const makeAdmin = async () => {
    if (!confirm('현재 로그인한 계정을 관리자로 변경하시겠습니까?')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/dev/make-admin', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ ' + data.message)
        alert(data.message)
        // 사용자 정보 다시 가져오기
        await fetchCurrentUser()
      } else {
        setMessage('❌ ' + (data.error || '실패'))
        alert(data.error || '관리자 권한 부여 실패')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ 오류 발생')
      alert('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 프로덕션에서는 접근 차단
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">접근 불가</h1>
          <p className="text-gray-600">
            이 페이지는 개발 환경에서만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          개발용: 관리자 권한 부여
        </h1>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ 이 기능은 개발 환경에서만 사용 가능합니다.
            <br />
            현재 로그인한 계정에 관리자 권한을 부여합니다.
          </p>
        </div>

        {/* 현재 사용자 상태 */}
        {currentProfile && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
            <h2 className="font-bold text-sm mb-2 text-gray-900">현재 로그인 정보</h2>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">이메일:</span> {currentUser?.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">닉네임:</span> {currentProfile.nickname}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">현재 역할:</span>{' '}
                <span
                  className={`font-bold ${
                    currentProfile.role === 'admin'
                      ? 'text-green-600'
                      : currentProfile.role === 'employee'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {currentProfile.role === 'admin'
                    ? '관리자 (Admin) ✅'
                    : currentProfile.role === 'employee'
                    ? '직장인 (Employee)'
                    : '게스트 (Guest)'}
                </span>
              </p>
            </div>
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        <button
          onClick={makeAdmin}
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '처리 중...' : '관리자 권한 부여'}
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-3 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          홈으로 돌아가기
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
          <h2 className="font-bold text-sm mb-2 text-gray-900">
            다른 방법: Supabase SQL
          </h2>
          <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
            {`UPDATE profiles
SET role = 'admin'
WHERE email = 'your@email.com';`}
          </pre>
          <p className="text-xs text-gray-600 mt-2">
            Supabase Dashboard → SQL Editor에서 실행
          </p>
        </div>
      </div>
    </div>
  )
}
