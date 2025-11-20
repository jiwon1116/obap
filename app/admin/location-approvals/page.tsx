'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CompanyLocationRequest, Profile } from '@/types/database'

interface RequestWithProfile extends CompanyLocationRequest {
  user_profile?: Profile
}

export default function LocationApprovalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<RequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<RequestWithProfile | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>()

      if (profileData?.role !== 'admin') {
        alert('관리자 권한이 필요합니다')
        router.push('/')
        return
      }

      setProfile(profileData)
      await fetchRequests()
    } catch (error) {
      console.error('권한 확인 실패:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/company-location-requests')
      if (response.ok) {
        const data = await response.json()

        // 사용자 정보도 함께 가져오기
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

        setRequests(requestsWithProfiles)
      }
    } catch (error) {
      console.error('요청 목록 조회 실패:', error)
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
        alert('승인되었습니다')
        setSelectedRequest(null)
        setReviewNote('')
        await fetchRequests()
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
        await fetchRequests()
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

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const processedRequests = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-4 shadow-sm"
        style={{ backgroundColor: '#38BDF8' }}
      >
        <button
          onClick={() => router.back()}
          className="text-white hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">회사 위치 승인 관리</h1>
      </header>

      {/* 콘텐츠 */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* 대기중인 요청 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={20} style={{ color: '#38BDF8' }} />
            승인 대기 중 ({pendingRequests.length})
          </h2>

          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">대기 중인 요청이 없습니다</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900">
                          {request.user_profile?.nickname || '사용자'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({request.user_profile?.email})
                        </span>
                      </div>
                      {request.company_name && (
                        <p className="font-medium text-gray-800">{request.company_name}</p>
                      )}
                      <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                        <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{request.company_address}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
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
          )}
        </div>

        {/* 처리된 요청 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">처리 완료 ({processedRequests.length})</h2>

          {processedRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">처리된 요청이 없습니다</p>
          ) : (
            <div className="space-y-4">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
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
                      <p className="text-xs text-gray-500 mt-2">
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
          )}
        </div>
      </div>
    </div>
  )
}
