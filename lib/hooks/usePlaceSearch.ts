import { useState } from 'react'
import { Place, PlaceSearchResponse } from '@/types/place'

interface SearchParams {
  query: string
  x?: number // 경도
  y?: number // 위도
  radius?: number // 반경(미터)
  category?: string
}

export function usePlaceSearch() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPlaces = async (params: SearchParams) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        query: params.query,
        ...(params.x && { x: params.x.toString() }),
        ...(params.y && { y: params.y.toString() }),
        ...(params.radius && { radius: params.radius.toString() }),
        ...(params.category && { category: params.category }),
      })

      const response = await fetch(`/api/search-places?${queryParams}`)

      if (!response.ok) {
        throw new Error('검색에 실패했습니다')
      }

      const data: PlaceSearchResponse = await response.json()
      setPlaces(data.places)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '검색 중 오류가 발생했습니다'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    places,
    loading,
    error,
    searchPlaces,
  }
}
