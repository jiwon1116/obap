'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, MapPin, Clock, CheckCircle, XCircle, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CompanyLocationRequest } from '@/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [locationRequests, setLocationRequests] = useState<CompanyLocationRequest[]>([])
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [locationForm, setLocationForm] = useState({
    company_name: '',
    company_address: '',
  })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchUserProfile()
    fetchLocationRequests()
  }, [])

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

  const fetchLocationRequests = async () => {
    try {
      const response = await fetch('/api/company-location-requests')
      if (response.ok) {
        const data = await response.json()

        // 사용자 정보도 함께 가져오기 (관리자인 경우 필요)
        const supabase = createClient()
        const requestsWithProfiles = await Promise.all(
          (data.requests || []).map(async (request: CompanyLocationRequest) => {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', request.user_id)
              .single()

            return {
              ...request,
              user_profile: userProfile,
            }
          })
        )

        setLocationRequests(requestsWithProfiles as any)

        if (data.error && data.error.includes('Table not found')) {
          setTableExists(false)
        }
      } else {
        console.error('위치 요청 조회 실패:', response.status, response.statusText)
        // 500 에러면 테이블이 없을 가능성이 높음
        if (response.status === 500) {
          setTableExists(false)
        }
      }
    } catch (error) {
      console.error('위치 요청 조회 실패:', error)
      setTableExists(false)
    }
  }

  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/search-places?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      console.log('검색 결과:', data)
      console.log('places 배열:', data.places)

      if (!response.ok) {
        console.error('API 에러:', data.error)
        alert(data.error || '검색에 실패했습니다')
        setSearchResults([])
        return
      }

      if (data.places && data.places.length > 0) {
        setSearchResults(data.places)
      } else {
        alert('검색 결과가 없습니다')
        setSearchResults([])
      }
    } catch (error) {
      console.error('주소 검색 실패:', error)
      alert('주소 검색 중 오류가 발생했습니다')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectAddress = (place: any) => {
    setLocationForm({
      company_name: place?.title?.replace(/<[^>]*>/g, '') || '', // HTML 태그 제거
      company_address: place?.roadAddress || place?.address || '',
    })
    setSearchResults([place]) // 선택한 장소를 저장해서 나중에 좌표를 가져올 수 있게 함
  }

  const submitLocationRequest = async () => {
    if (!locationForm.company_address) {
      alert('회사 주소를 선택해주세요')
      return
    }

    // 검색 결과에서 선택한 장소의 좌표를 찾기
    const selectedPlace = searchResults.find(
      (p) => (p.roadAddress || p.address) === locationForm.company_address
    )

    if (!selectedPlace) {
      alert('주소를 다시 검색하여 선택해주세요')
      return
    }

    console.log('Selected place:', selectedPlace)

    // 좌표 변환: API 응답에서 받은 데이터가 이미 변환된 형태인지 확인
    let latitude: number
    let longitude: number

    if (selectedPlace.y && selectedPlace.x) {
      // 이미 변환된 좌표 (search-places API에서 변환됨)
      latitude = selectedPlace.y
      longitude = selectedPlace.x
    } else if (selectedPlace.mapy && selectedPlace.mapx) {
      // 원본 KATEC 좌표 (변환 필요)
      latitude = parseFloat(selectedPlace.mapy) / 10000000
      longitude = parseFloat(selectedPlace.mapx) / 10000000
    } else {
      alert('좌표 정보가 없습니다')
      return
    }

    console.log('Submitting coordinates:', { latitude, longitude })

    try {
      const response = await fetch('/api/company-location-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: locationForm.company_name,
          company_address: locationForm.company_address,
          latitude,
          longitude,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert('회사 위치 승인 요청이 제출되었습니다')
        setShowLocationForm(false)
        setLocationForm({ company_name: '', company_address: '' })
        fetchLocationRequests()
      } else {
        alert(data.error || '요청 실패')
      }
    } catch (error) {
      console.error('요청 제출 실패:', error)
      alert('요청 제출 중 오류가 발생했습니다')
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!confirm('이 요청을 승인하시겠습니까?')) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/company-location-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reviewNote }),
      })

      if (response.ok) {
        alert('승인되었습니다. 승인된 사용자의 프로필이 업데이트되었습니다.')
        setSelectedRequest(null)
        setReviewNote('')
        // 프로필 다시 로드 (관리자 본인의 프로필도 업데이트될 수 있음)
        await fetchUserProfile()
        await fetchLocationRequests()
      } else {
        const data = await response.json()
        alert(data.error || '승인 실패')
      }
    } catch (error) {
      console.error('승인 처리 실패:', error)
      alert('승인 처리 중 오류가 발생했습니다')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!reviewNote.trim()) {
      alert('거부 사유를 입력해주세요')
      return
    }

    if (!confirm('이 요청을 거부하시겠습니까?')) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/company-location-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reviewNote }),
      })

      if (response.ok) {
        alert('거부되었습니다')
        setSelectedRequest(null)
        setReviewNote('')
        await fetchLocationRequests()
      } else {
        const data = await response.json()
        alert(data.error || '거부 실패')
      }
    } catch (error) {
      console.error('거부 처리 실패:', error)
      alert('거부 처리 중 오류가 발생했습니다')
    } finally {
      setProcessing(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-gray-600">로그인이 필요합니다</p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-3 rounded-lg font-medium text-white"
          style={{ backgroundColor: '#38BDF8' }}
        >
          로그인하기
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 헤더 */}
      <header
        className="flex-shrink-0 px-4 py-4 flex items-center gap-4 shadow-sm"
        style={{ backgroundColor: '#38BDF8' }}
      >
        <button
          onClick={() => router.back()}
          className="text-white hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">회원 정보</h1>
        <button
          onClick={handleLogout}
          className="text-white hover:opacity-80 transition-opacity"
        >
          <LogOut size={24} />
        </button>
      </header>

      {/* 콘텐츠 - 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-6 mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
              style={{ backgroundColor: '#38BDF8' }}
            >
              {profile?.nickname?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">
                {profile?.nickname || '사용자'}
              </h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            {profile?.username && (
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600 font-medium">아이디</span>
                <span className="text-gray-900">{profile.username}</span>
              </div>
            )}

            {profile?.role && (
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600 font-medium">역할</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium text-white flex items-center gap-1 ${
                    profile.role === 'admin' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''
                  }`}
                  style={profile.role !== 'admin' ? { backgroundColor: '#38BDF8' } : undefined}
                >
                  {profile.role === 'admin' && <Crown size={14} />}
                  {profile.role === 'admin'
                    ? '관리자'
                    : profile.role === 'employee'
                    ? '직장인'
                    : '게스트'}
                </span>
              </div>
            )}

            {profile?.company_domain && (
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600 font-medium">회사 도메인</span>
                <span className="text-gray-900">{profile.company_domain}</span>
              </div>
            )}

            {profile?.company_address && (
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600 font-medium">회사 위치</span>
                <span className="text-gray-900 text-sm">{profile.company_address}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600 font-medium">가입일</span>
              <span className="text-gray-900">
                {new Date(profile?.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </div>

        {/* 관리자 전용: 모든 요청 관리 */}
        {profile?.role === 'admin' && locationRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin size={20} style={{ color: '#38BDF8' }} />
              회사 위치 승인 관리 (총 {locationRequests.length}건)
            </h3>

            {/* 승인 대기 중 */}
            {locationRequests.filter((r: any) => r.status === 'pending').length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock size={16} style={{ color: '#38BDF8' }} />
                  승인 대기 중 ({locationRequests.filter((r: any) => r.status === 'pending').length}건)
                </h4>
                <div className="space-y-3">
                  {locationRequests
                    .filter((r: any) => r.status === 'pending')
                    .map((request: any) => (
                      <div
                        key={request.id}
                        className="p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">
                                {request.user_profile?.nickname || '사용자'}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({request.user_profile?.email})
                              </span>
                            </div>
                            {request.company_name && (
                              <p className="font-medium text-gray-800">{request.company_name}</p>
                            )}
                            <p className="text-sm text-gray-600">{request.company_address}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              요청일: {new Date(request.requested_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {selectedRequest?.id === request.id ? (
                          <div className="mt-4 space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                검토 의견 (선택)
                              </label>
                              <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="승인/거부 사유를 입력하세요"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={processing}
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                <CheckCircle size={18} />
                                승인
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={processing}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                <XCircle size={18} />
                                거부
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(null)
                                  setReviewNote('')
                                }}
                                disabled={processing}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="w-full mt-3 py-2 rounded-lg font-medium text-white"
                            style={{ backgroundColor: '#38BDF8' }}
                          >
                            검토하기
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 처리 완료 */}
            {locationRequests.filter((r: any) => r.status !== 'pending').length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">
                  처리 완료 ({locationRequests.filter((r: any) => r.status !== 'pending').length}건)
                </h4>
                <div className="space-y-3">
                  {locationRequests
                    .filter((r: any) => r.status !== 'pending')
                    .map((request: any) => (
                      <div
                        key={request.id}
                        className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">
                                {request.user_profile?.nickname || '사용자'}
                              </span>
                              {request.status === 'approved' && (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                                  <CheckCircle size={14} />
                                  승인됨
                                </span>
                              )}
                              {request.status === 'rejected' && (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                                  <XCircle size={14} />
                                  거부됨
                                </span>
                              )}
                            </div>
                            {request.company_name && (
                              <p className="font-medium text-gray-800">{request.company_name}</p>
                            )}
                            <p className="text-sm text-gray-600">{request.company_address}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              처리일: {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString('ko-KR')}
                            </p>
                            {request.review_note && (
                              <p className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200">
                                {request.review_note}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 회사 위치 섹션 */}
        {profile?.role === 'employee' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MapPin size={20} style={{ color: '#38BDF8' }} />
                회사 위치
              </h3>
              {!showLocationForm && !profile?.company_address && (
                <button
                  onClick={() => setShowLocationForm(true)}
                  className="px-4 py-2 rounded-lg font-medium text-white text-sm"
                  style={{ backgroundColor: '#38BDF8' }}
                >
                  위치 등록
                </button>
              )}
            </div>

            {showLocationForm && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    회사명 (선택)
                  </label>
                  <input
                    type="text"
                    value={locationForm.company_name}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, company_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="회사명 입력"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    회사 주소 검색
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="address-search-input"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="회사명 또는 주소 입력"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const input = e.currentTarget
                          searchAddress(input.value)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('address-search-input') as HTMLInputElement
                        if (input) searchAddress(input.value)
                      }}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: '#38BDF8' }}
                    >
                      검색
                    </button>
                  </div>
                  {searching && (
                    <p className="text-sm text-gray-500 mt-2">검색 중...</p>
                  )}
                  {!searching && searchResults.length === 0 && locationForm.company_address === '' && (
                    <p className="text-sm text-gray-500 mt-2">회사명 또는 주소를 입력하고 검색 버튼을 눌러주세요</p>
                  )}
                  {!searching && searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {searchResults.map((place, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectAddress(place)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <p className="font-medium text-sm">
                            {place?.title?.replace(/<[^>]*>/g, '') || '이름 없음'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {place?.roadAddress || place?.address || '주소 없음'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {locationForm.company_address && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">선택한 주소:</p>
                    <p className="text-sm text-gray-900 mt-1">{locationForm.company_address}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={submitLocationRequest}
                    className="flex-1 py-3 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#38BDF8' }}
                  >
                    승인 요청
                  </button>
                  <button
                    onClick={() => {
                      setShowLocationForm(false)
                      setLocationForm({ company_name: '', company_address: '' })
                      setSearchResults([])
                    }}
                    className="flex-1 py-3 bg-gray-200 rounded-lg font-medium text-gray-700"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 위치 요청 목록 */}
            {locationRequests.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-bold text-gray-700">요청 내역</h4>
                {locationRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {request.company_name && (
                          <p className="font-medium text-gray-900">{request.company_name}</p>
                        )}
                        <p className="text-sm text-gray-600">{request.company_address}</p>
                      </div>
                      <div>
                        {request.status === 'pending' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                            <Clock size={14} />
                            대기중
                          </span>
                        )}
                        {request.status === 'approved' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            <CheckCircle size={14} />
                            승인됨
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                            <XCircle size={14} />
                            거부됨
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      요청일: {new Date(request.requested_at).toLocaleDateString('ko-KR')}
                    </p>
                    {request.review_note && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded">
                        {request.review_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={() => alert('프로필 수정 기능은 준비 중입니다')}
            className="w-full py-4 rounded-xl font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#38BDF8' }}
          >
            프로필 수정
          </button>

          <button
            onClick={() => alert('비밀번호 변경 기능은 준비 중입니다')}
            className="w-full py-4 bg-white rounded-xl font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            비밀번호 변경
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-4 bg-white rounded-xl font-medium text-red-600 shadow-sm hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
