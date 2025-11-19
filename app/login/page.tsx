'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      let loginEmail = emailOrUsername.trim()

      // 이메일 형식인지 확인 (@가 포함되어 있으면 이메일)
      const isEmail = loginEmail.includes('@')

      // 아이디로 로그인하는 경우, username으로 email 조회
      if (!isEmail) {
        const res = await fetch(
          `/api/get-email-by-username?username=${encodeURIComponent(loginEmail)}`
        )
        const data = await res.json()

        if (!res.ok || !data.email) {
          throw new Error('존재하지 않는 아이디입니다')
        }

        loginEmail = data.email
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(loginEmail)) {
        throw new Error('올바른 이메일 형식이 아닙니다')
      }

      // 비밀번호 확인
      if (!password || password.length < 6) {
        throw new Error('비밀번호를 확인해주세요')
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        // Supabase 에러 메시지 번역
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('이메일 인증이 완료되지 않았습니다')
        } else {
          throw new Error(error.message)
        }
      }

      setMessage({
        type: 'success',
        text: '로그인 성공! 메인 페이지로 이동합니다.',
      })

      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '로그인 실패',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">O!BAP</h1>
          <p className="mt-2 text-sm text-gray-600">
            직장인을 위한 맛집 지도
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            로그인
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="emailOrUsername"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                이메일
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="your.email@company.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              계정이 없으신가요?{' '}
              <Link
                href="/signup"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
