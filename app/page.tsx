import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/profile'
import LogoutButton from '@/components/logout-button'
import PlaceSearch from '@/components/place-search'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = await getCurrentUserProfile()

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              O!BAP
            </h1>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="text-sm text-gray-600">
                    {profile?.email}
                    {profile?.role === 'employee' && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        직장인
                      </span>
                    )}
                    {profile?.role === 'guest' && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        게스트
                      </span>
                    )}
                  </div>
                  <LogoutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            O!BAP
          </h2>
          <p className="text-lg text-gray-600">
            직장인을 위한 맛집 지도
          </p>
        </div>

        {/* 네이버 지도 + 검색 섹션 */}
        <div className="mb-8">
          <PlaceSearch />
        </div>

        {user && profile && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">
                모든 사용자 이용 가능
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>✓ 맛집 지도 검색</li>
                <li>✓ 맛집 상세 정보 확인</li>
                <li>✓ 리뷰 보기</li>
              </ul>
            </div>

            {profile.role === 'employee' ? (
              <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
                <h3 className="text-xl font-semibold mb-4 text-blue-900">
                  직장인 전용 기능
                </h3>
                <ul className="space-y-2 text-blue-800">
                  <li>✓ 리뷰 작성 및 수정</li>
                  <li>✓ 회사 커뮤니티 참여</li>
                  <li>✓ 팀 채팅</li>
                  <li>✓ 직장인 추천 맛집</li>
                </ul>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg shadow border-2 border-gray-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">
                  직장인 전용 기능
                </h3>
                <p className="text-gray-600 mb-4">
                  회사 이메일로 로그인하면 직장인 전용 기능을 이용할 수
                  있습니다. (Gmail, Naver 등 공개 이메일 제외)
                </p>
                <ul className="space-y-2 text-gray-500">
                  <li>🔒 리뷰 작성 및 수정</li>
                  <li>🔒 회사 커뮤니티 참여</li>
                  <li>🔒 팀 채팅</li>
                  <li>🔒 직장인 추천 맛집</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg"
            >
              시작하기
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
