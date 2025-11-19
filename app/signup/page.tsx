'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { isCompanyEmail } from '@/lib/auth/utils'

type Step = 'form' | 'verify'
type CheckStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // 중복 체크 상태
  const [emailStatus, setEmailStatus] = useState<CheckStatus>('idle')
  const [usernameStatus, setUsernameStatus] = useState<CheckStatus>('idle')
  const [nicknameStatus, setNicknameStatus] = useState<CheckStatus>('idle')
  const [passwordValid, setPasswordValid] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // 이메일 중복 체크
  useEffect(() => {
    // 기본적인 이메일 형식 체크
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailStatus('idle')
      return
    }

    setEmailStatus('checking')

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-email?email=${encodeURIComponent(email)}`
        )
        const data = await res.json()
        setEmailStatus(data.available ? 'available' : 'unavailable')
      } catch (error) {
        setEmailStatus('idle')
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [email])

  // 비밀번호 유효성 검사
  useEffect(() => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
    setPasswordValid(passwordRegex.test(password))
  }, [password])

  // 아이디 중복 체크
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-username?username=${encodeURIComponent(username)}`
        )
        const data = await res.json()
        setUsernameStatus(data.available ? 'available' : 'unavailable')
      } catch (error) {
        setUsernameStatus('idle')
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [username])

  // 닉네임 중복 체크
  useEffect(() => {
    if (nickname.length < 2) {
      setNicknameStatus('idle')
      return
    }

    setNicknameStatus('checking')

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-nickname?nickname=${encodeURIComponent(nickname)}`
        )
        const data = await res.json()
        setNicknameStatus(data.available ? 'available' : 'unavailable')
      } catch (error) {
        setNicknameStatus('idle')
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [nickname])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // 유효성 검사
      if (username.length < 3) {
        throw new Error('아이디는 최소 3자 이상이어야 합니다')
      }

      if (nickname.length < 2) {
        throw new Error('닉네임은 최소 2자 이상이어야 합니다')
      }

      if (password !== passwordConfirm) {
        throw new Error('비밀번호가 일치하지 않습니다')
      }

      // 비밀번호: 영문, 숫자 포함 8자 이상
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
      if (!passwordRegex.test(password)) {
        throw new Error('비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다')
      }

      // 중복 체크 상태 확인
      if (emailStatus !== 'available') {
        throw new Error('이메일 중복 확인이 필요합니다')
      }

      if (usernameStatus !== 'available') {
        throw new Error('아이디 중복 확인이 필요합니다')
      }

      if (nicknameStatus !== 'available') {
        throw new Error('닉네임 중복 확인이 필요합니다')
      }

      // username 형식 검증 (영문, 숫자, 언더스코어만)
      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(username)) {
        throw new Error('아이디는 영문, 숫자, 언더스코어(_)만 사용 가능합니다')
      }

      // 회원가입
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            nickname,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      // 이메일 인증이 필요 없는 경우 (바로 로그인된 경우) 프로필 생성
      if (data.user && data.session) {
        try {
          await fetch('/api/create-profile', {
            method: 'POST',
          })
        } catch (profileError) {
          console.error('Error creating profile:', profileError)
        }

        setMessage({
          type: 'success',
          text: '회원가입이 완료되었습니다! 메인 페이지로 이동합니다.',
        })

        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 2000)
      } else {
        // 이메일 인증이 필요한 경우
        setMessage({
          type: 'success',
          text: '이메일로 인증 코드를 발송했습니다. 메일함을 확인해주세요.',
        })
        setStep('verify')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '회원가입 실패',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      })

      if (error) throw error

      // OTP 인증 성공 후 프로필 자동 생성
      try {
        const profileRes = await fetch('/api/create-profile', {
          method: 'POST',
        })

        if (!profileRes.ok) {
          console.error('Failed to create profile')
        }
      } catch (profileError) {
        console.error('Error creating profile:', profileError)
        // 프로필 생성 실패해도 회원가입은 완료된 것으로 처리
      }

      setMessage({
        type: 'success',
        text: '이메일 인증이 완료되었습니다! 로그인 페이지로 이동합니다.',
      })

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '인증 실패',
      })
    } finally {
      setLoading(false)
    }
  }

  const emailDomain = email.split('@')[1]
  const isEmployeeEmail = email && isCompanyEmail(email)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">O!BAP</h1>
          <p className="mt-2 text-sm text-gray-600">직장인을 위한 맛집 지도</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {step === 'form' ? '회원가입' : '이메일 인증'}
          </h2>

          {step === 'form' ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {email && (
                  <div className="mt-2 space-y-1">
                    <p
                      className={`text-xs ${
                        isEmployeeEmail ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {isEmployeeEmail
                        ? `✓ 회사 이메일 (${emailDomain}) - 직장인 전용 기능 이용 가능`
                        : '공개 이메일 - 기본 기능만 이용 가능'}
                    </p>
                    {emailStatus !== 'idle' && (
                      <p
                        className={`text-xs ${
                          emailStatus === 'checking'
                            ? 'text-gray-500'
                            : emailStatus === 'available'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {emailStatus === 'checking'
                          ? '중복 확인 중...'
                          : emailStatus === 'available'
                          ? '✓ 사용 가능한 이메일입니다'
                          : '✗ 이미 사용 중인 이메일입니다'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  아이디 (@username)
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username123"
                  required
                  minLength={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {username.length >= 3 && (
                  <p
                    className={`mt-1 text-xs ${
                      usernameStatus === 'checking'
                        ? 'text-gray-500'
                        : usernameStatus === 'available'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {usernameStatus === 'checking'
                      ? '확인 중...'
                      : usernameStatus === 'available'
                      ? '✓ 사용 가능한 아이디입니다'
                      : '✗ 이미 사용 중인 아이디입니다'}
                  </p>
                )}
                {username.length < 3 && username.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    영문, 숫자, 언더스코어(_) 3자 이상
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="nickname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  닉네임 (표시 이름)
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="맛집헌터"
                  required
                  minLength={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {nickname.length >= 2 && (
                  <p
                    className={`mt-1 text-xs ${
                      nicknameStatus === 'checking'
                        ? 'text-gray-500'
                        : nicknameStatus === 'available'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {nicknameStatus === 'checking'
                      ? '확인 중...'
                      : nicknameStatus === 'available'
                      ? '✓ 사용 가능한 닉네임입니다'
                      : '✗ 이미 사용 중인 닉네임입니다'}
                  </p>
                )}
                {nickname.length < 2 && nickname.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    다른 사람에게 보여질 이름 (2자 이상)
                  </p>
                )}
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
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {password.length > 0 ? (
                  <p
                    className={`mt-1 text-xs ${
                      passwordValid ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {passwordValid
                      ? '✓ 사용 가능한 비밀번호입니다'
                      : '✗ 영문, 숫자를 포함하여 8자 이상 입력해주세요'}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    영문, 숫자 포함 8자 이상
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="passwordConfirm"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  비밀번호 확인
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
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
                {loading ? '처리 중...' : '회원가입'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  인증 코드
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {email}로 발송된 6자리 코드를 입력하세요
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '인증 중...' : '인증 완료'}
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="w-full text-gray-600 text-sm hover:text-gray-900"
              >
                ← 돌아가기
              </button>
            </form>
          )}

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
