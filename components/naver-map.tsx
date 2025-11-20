'use client'

import { useEffect, useRef, useState } from 'react'
import { Navigation } from 'lucide-react'
import { Place } from '@/types/place'
import { Restaurant } from '@/types/database'

// 네이버 지도 타입 확장
declare global {
  interface Window {
    naver: any
    MarkerClustering: any
  }
}

interface NaverMapProps {
  places?: Place[]
  restaurants?: Restaurant[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onRestaurantClick?: (restaurant: Restaurant) => void
  companyLocation?: { latitude: number; longitude: number } | null
}

export default function NaverMap({
  places = [],
  restaurants = [],
  center,
  zoom = 15,
  height = '500px',
  onRestaurantClick,
  companyLocation,
}: NaverMapProps) {
  // 회사 위치가 있으면 그것을 중심으로, 없으면 기본 좌표 사용
  const mapCenter = companyLocation
    ? { lat: companyLocation.latitude, lng: companyLocation.longitude }
    : center || { lat: 37.4824, lng: 126.8958 }
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<naver.maps.Map | null>(null)
  const [markers, setMarkers] = useState<naver.maps.Marker[]>([])
  const [infoWindows, setInfoWindows] = useState<naver.maps.InfoWindow[]>([])
  const [markerClustering, setMarkerClustering] = useState<any>(null)

  const handleZoomIn = () => {
    if (map) {
      map.setZoom(map.getZoom() + 1)
    }
  }

  const handleZoomOut = () => {
    if (map) {
      map.setZoom(map.getZoom() - 1)
    }
  }

  const handleGoToMyLocation = () => {
    if (map && companyLocation) {
      map.setCenter(new window.naver.maps.LatLng(companyLocation.latitude, companyLocation.longitude))
      map.setZoom(15)
    }
  }

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.naver) return

    const mapOptions: naver.maps.MapOptions = {
      center: new window.naver.maps.LatLng(mapCenter.lat, mapCenter.lng),
      zoom,
      zoomControl: false,
    }

    const mapInstance = new window.naver.maps.Map(mapRef.current, mapOptions)
    setMap(mapInstance)

    return () => {
      mapInstance.destroy()
    }
  }, [mapCenter.lat, mapCenter.lng, zoom])

  // 마커 및 InfoWindow 업데이트
  useEffect(() => {
    if (!map || !window.naver) return

    // 기존 마커 및 InfoWindow 제거
    markers.forEach((marker) => marker.setMap(null))
    infoWindows.forEach((infoWindow) => infoWindow.close())

    // 기존 클러스터 제거
    if (markerClustering) {
      markerClustering.setMap(null)
    }

    // 새 마커 및 InfoWindow 생성
    const newMarkers: naver.maps.Marker[] = []
    const newInfoWindows: naver.maps.InfoWindow[] = []
    const restaurantMarkers: naver.maps.Marker[] = []

    // Places 마커 (검색 결과)
    places.forEach((place) => {
      if (!place.y || !place.x) return

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(place.y, place.x),
        map,
        title: place.name,
        icon: {
          content: '<div style="background: #10B981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">📍</div>',
          anchor: new window.naver.maps.Point(15, 15),
        },
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

      let isOpen = false
      window.naver.maps.Event.addListener(marker, 'click', () => {
        newInfoWindows.forEach((iw) => iw.close())
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

    // Restaurant 마커 (DB 데이터) - 클러스터링 사용 시 map 설정 안 함
    restaurants.forEach((restaurant) => {
      if (!restaurant.latitude || !restaurant.longitude) return

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(restaurant.latitude, restaurant.longitude),
        // 클러스터링이 없으면 map에 직접 추가, 있으면 클러스터링에서 관리
        title: restaurant.name,
        icon: {
          content: '<div style="background: #3B82F6; color: white; padding: 6px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>',
          anchor: new window.naver.maps.Point(14, 14),
        },
      })

      // 마커에 레스토랑 데이터 저장
      ;(marker as any).restaurantData = restaurant

      // 마커 클릭 시 슬라이더 표시
      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (onRestaurantClick) {
          onRestaurantClick(restaurant)
        }
      })

      restaurantMarkers.push(marker)
      newMarkers.push(marker)
    })

    // 회사 위치 마커 추가
    if (companyLocation) {
      const companyMarker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(companyLocation.latitude, companyLocation.longitude),
        map,
        title: '내 회사',
        icon: {
          content: '<div style="background: #FF8A00; color: white; padding: 10px; border-radius: 50%; font-size: 20px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 3px solid white; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
          anchor: new window.naver.maps.Point(22, 22),
        },
        zIndex: 1000, // 가장 위에 표시
      })

      const companyInfoWindow = new window.naver.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 180px; text-align: center;">
            <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #9333EA;">🏢 내 회사 위치</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">1km 반경 내 식당을 표시합니다</p>
          </div>
        `,
      })

      let isCompanyInfoOpen = false
      window.naver.maps.Event.addListener(companyMarker, 'click', () => {
        if (isCompanyInfoOpen) {
          companyInfoWindow.close()
          isCompanyInfoOpen = false
        } else {
          newInfoWindows.forEach((iw) => iw.close())
          companyInfoWindow.open(map, companyMarker)
          isCompanyInfoOpen = true
        }
      })

      newMarkers.push(companyMarker)
      newInfoWindows.push(companyInfoWindow)
    }

    setMarkers(newMarkers)
    setInfoWindows(newInfoWindows)

    // 지도 범위 조정
    // 회사 위치가 있으면 회사 위치 중심으로, 없으면 마커에 맞춤
    if (!companyLocation && newMarkers.length > 0) {
      const bounds = new window.naver.maps.LatLngBounds()
      newMarkers.forEach((marker) => {
        bounds.extend(marker.getPosition())
      })
      map.fitBounds(bounds, { top: 100, right: 50, bottom: 200, left: 50 })
    } else if (companyLocation) {
      // 회사 위치가 있으면 해당 위치를 중심으로 유지
      map.setCenter(new window.naver.maps.LatLng(companyLocation.latitude, companyLocation.longitude))
    }

    // 마커 클러스터링 적용 (식당 마커만)
    if (window.naver?.maps?.MarkerClustering && restaurantMarkers.length > 0) {
      try {
        const htmlMarker = {
          content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:14px;color:white;text-align:center;font-weight:bold;background:#38BDF8;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
          size: window.naver.maps.Size(40, 40),
          anchor: window.naver.maps.Point(20, 20),
        }

        const clustering = new window.naver.maps.MarkerClustering({
          minClusterSize: 2,
          maxZoom: 17,
          map: map,
          markers: restaurantMarkers,
          disableClickZoom: false,
          gridSize: 100,
          icons: [htmlMarker],
          indexGenerator: [10, 50, 100, 200, 500],
          stylingFunction: (clusterMarker: any, count: number) => {
            const element = clusterMarker.getElement()
            const div = element.querySelector('div:first-child')
            if (div) {
              div.innerText = count.toString()
            }
          },
        })

        setMarkerClustering(clustering)
      } catch (error) {
        console.error('클러스터링 오류:', error)
        restaurantMarkers.forEach((marker) => marker.setMap(map))
      }
    } else {
      // 클러스터링이 없으면 마커를 직접 지도에 추가
      restaurantMarkers.forEach((marker) => marker.setMap(map))
    }
  }, [map, places, restaurants, onRestaurantClick, companyLocation])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />

      {/* 내 위치로 버튼 */}
      {companyLocation && (
        <button
          onClick={handleGoToMyLocation}
          style={{
            position: 'absolute',
            bottom: '160px',
            left: '20px',
            width: '44px',
            height: '44px',
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#333',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FF8A00'
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#333'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <Navigation size={20} />
        </button>
      )}

      {/* 커스텀 줌 컨트롤 */}
      <div
        style={{
          position: 'absolute',
          bottom: '160px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            width: '44px',
            height: '44px',
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#38BDF8'
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#333'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            width: '44px',
            height: '44px',
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#38BDF8'
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#333'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          −
        </button>
      </div>
    </div>
  )
}
