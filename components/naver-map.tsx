'use client'

import { useEffect, useRef, useState } from 'react'
import { Place } from '@/types/place'

interface NaverMapProps {
  places: Place[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
}

export default function NaverMap({
  places,
  center = { lat: 37.5665, lng: 126.978 }, // 서울 시청 기본 좌표
  zoom = 13,
  height = '500px',
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<naver.maps.Map | null>(null)
  const [markers, setMarkers] = useState<naver.maps.Marker[]>([])
  const [infoWindows, setInfoWindows] = useState<naver.maps.InfoWindow[]>([])

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.naver) return

    const mapOptions: naver.maps.MapOptions = {
      center: new window.naver.maps.LatLng(center.lat, center.lng),
      zoom,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    }

    const mapInstance = new window.naver.maps.Map(mapRef.current, mapOptions)
    setMap(mapInstance)

    return () => {
      mapInstance.destroy()
    }
  }, [center.lat, center.lng, zoom])

  // 마커 및 InfoWindow 업데이트
  useEffect(() => {
    if (!map || !window.naver) return

    // 기존 마커 및 InfoWindow 제거
    markers.forEach((marker) => marker.setMap(null))
    infoWindows.forEach((infoWindow) => infoWindow.close())

    if (places.length === 0) {
      setMarkers([])
      setInfoWindows([])
      return
    }

    // 새 마커 및 InfoWindow 생성
    const newMarkers: naver.maps.Marker[] = []
    const newInfoWindows: naver.maps.InfoWindow[] = []

    places.forEach((place) => {
      if (!place.y || !place.x) return

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(place.y, place.x),
        map,
        title: place.name,
      })

      const infoWindowContent = `
        <div style="padding: 10px; min-width: 200px;">
          <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">${place.name}</h4>
          <p style="margin: 3px 0; font-size: 12px; color: #666;">${place.category}</p>
          ${place.roadAddress ? `<p style="margin: 3px 0; font-size: 11px; color: #888;">${place.roadAddress}</p>` : ''}
          ${place.phone ? `<p style="margin: 3px 0; font-size: 11px; color: #888;">📞 ${place.phone}</p>` : ''}
          ${place.placeUrl ? `<a href="${place.placeUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #03C75A; text-decoration: none;">네이버 지도에서 보기 →</a>` : ''}
        </div>
      `

      const infoWindow = new window.naver.maps.InfoWindow({
        content: infoWindowContent,
      })

      // 마커 클릭 이벤트
      let isOpen = false
      window.naver.maps.Event.addListener(marker, 'click', () => {
        // 다른 InfoWindow 닫기
        newInfoWindows.forEach((iw) => iw.close())

        // 현재 InfoWindow 토글
        if (isOpen) {
          infoWindow.close()
          isOpen = false
        } else {
          infoWindow.open(map, marker)
          isOpen = true
        }
      })

      newMarkers.push(marker)
      newInfoWindows.push(infoWindow)
    })

    setMarkers(newMarkers)
    setInfoWindows(newInfoWindows)

    // 지도 범위를 마커에 맞춤
    if (newMarkers.length > 0) {
      const bounds = new window.naver.maps.LatLngBounds()
      newMarkers.forEach((marker) => {
        bounds.extend(marker.getPosition())
      })
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    }
  }, [map, places])

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  )
}
