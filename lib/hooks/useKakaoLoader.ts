import { useEffect, useState } from 'react'

export function useKakaoLoader() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY

    console.log('Kakao Maps API Key:', appKey ? `${appKey.substring(0, 10)}...` : 'NOT SET')

    // API 키 확인
    if (!appKey || appKey === 'your_kakao_javascript_key') {
      setError('Kakao Maps API 키가 설정되지 않았습니다.')
      console.error('NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되지 않았습니다.')
      return
    }

    // 이미 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true)
      return
    }

    // 이미 스크립트가 로드 중인지 확인
    const existingScript = document.querySelector(
      'script[src*="dapi.kakao.com"]'
    )
    if (existingScript) {
      // 스크립트가 이미 있으면 로드될 때까지 대기
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao)
          setIsLoaded(true)
        }
      }, 100)
      return () => clearInterval(checkKakao)
    }

    // Kakao Maps SDK 스크립트 로드
    const script = document.createElement('script')
    const scriptUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.src = scriptUrl
    script.async = true

    console.log('Loading Kakao Maps from:', scriptUrl)

    script.onload = () => {
      console.log('Script loaded, checking window.kakao...')
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log('Kakao Maps loaded successfully')
          setIsLoaded(true)
        })
      } else {
        setError('Kakao Maps SDK 로드에 실패했습니다.')
        console.error('Kakao Maps SDK 로드 실패: window.kakao가 없습니다.')
      }
    }

    script.onerror = (e) => {
      setError('Kakao Maps 스크립트 로드에 실패했습니다. 네트워크를 확인하거나 API 키가 올바른지 확인하세요.')
      console.error('Kakao Maps 스크립트 로드 실패:', e)
      console.error('Script URL:', scriptUrl)
    }

    document.head.appendChild(script)
  }, [])

  return { isLoaded, error }
}

// Kakao Maps 타입 정의
declare global {
  interface Window {
    kakao: any
  }
}
