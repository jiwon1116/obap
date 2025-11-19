'use client'

import { useEffect, useRef } from 'react'
import { useKakaoLoader } from '@/lib/hooks/useKakaoLoader'

interface KakaoMapProps {
  latitude?: number
  longitude?: number
  level?: number
  className?: string
}

export default function KakaoMap({
  latitude = 37.5665, // 서울 시청 기본 위치
  longitude = 126.978,
  level = 3,
  className = 'w-full h-[600px]',
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const { isLoaded, error } = useKakaoLoader()

  useEffect(() => {
    if (!isLoaded || !mapContainer.current) return

    const { kakao } = window

    try {
      // 지도 중심 좌표
      const center = new kakao.maps.LatLng(latitude, longitude)

      // 지도 옵션
      const options = {
        center,
        level, // 지도 확대 레벨 (1~14, 숫자가 작을수록 확대)
      }

      // 지도 생성
      const map = new kakao.maps.Map(mapContainer.current, options)

      // 지도 타입 컨트롤 추가 (일반 지도 / 스카이뷰)
      const mapTypeControl = new kakao.maps.MapTypeControl()
      map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT)

      // 줌 컨트롤 추가
      const zoomControl = new kakao.maps.ZoomControl()
      map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT)

      // 마커 추가 (현재 위치)
      const marker = new kakao.maps.Marker({
        position: center,
      })
      marker.setMap(map)
    } catch (err) {
      console.error('지도 생성 중 오류:', err)
    }
  }, [isLoaded, latitude, longitude, level])

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-red-50 rounded-lg border-2 border-red-200">
          <div className="text-center p-4">
            <p className="text-red-600 font-semibold mb-2">지도 로드 실패</p>
            <p className="text-red-500 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">
              브라우저 콘솔(F12)에서 자세한 오류를 확인하세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-gray-500">지도를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return <div ref={mapContainer} className={className} />
}
