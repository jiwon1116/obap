import { useState } from 'react'
import { Restaurant, RestaurantWithDistance, PriceTier } from '@/types/database'

interface FetchRestaurantsParams {
  page?: number
  limit?: number
  category?: string
  price_tier?: PriceTier
  newly_opened?: boolean
  latitude?: number
  longitude?: number
  radius?: number // in meters
  sort?: 'distance' | 'rating' | 'review_count' | 'newest'
  query?: string // 검색어
}

interface RestaurantsResponse {
  restaurants: Restaurant[] | RestaurantWithDistance[]
  meta: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<
    Restaurant[] | RestaurantWithDistance[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  })

  const fetchRestaurants = async (params: FetchRestaurantsParams = {}) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()

      if (params.page) queryParams.set('page', params.page.toString())
      if (params.limit) queryParams.set('limit', params.limit.toString())
      if (params.category) queryParams.set('category', params.category)
      if (params.price_tier) queryParams.set('price_tier', params.price_tier)
      if (params.newly_opened !== undefined)
        queryParams.set('newly_opened', params.newly_opened.toString())
      if (params.latitude !== undefined)
        queryParams.set('latitude', params.latitude.toString())
      if (params.longitude !== undefined)
        queryParams.set('longitude', params.longitude.toString())
      if (params.radius) queryParams.set('radius', params.radius.toString())
      if (params.sort) queryParams.set('sort', params.sort)
      if (params.query) queryParams.set('query', params.query)

      const response = await fetch(`/api/restaurants?${queryParams}`)

      if (!response.ok) {
        throw new Error('식당 목록 조회에 실패했습니다')
      }

      const data: RestaurantsResponse = await response.json()
      setRestaurants(data.restaurants)
      setMeta(data.meta)

      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '식당 목록 조회 중 오류가 발생했습니다'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createRestaurant = async (
    restaurantData: Partial<Restaurant>
  ): Promise<Restaurant> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restaurantData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '식당 등록에 실패했습니다')
      }

      const data: Restaurant = await response.json()
      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '식당 등록 중 오류가 발생했습니다'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getRestaurant = async (id: string): Promise<Restaurant> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/restaurants/${id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '식당 조회에 실패했습니다')
      }

      const data: Restaurant = await response.json()
      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '식당 조회 중 오류가 발생했습니다'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateRestaurant = async (
    id: string,
    updates: Partial<Restaurant>
  ): Promise<Restaurant> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '식당 수정에 실패했습니다')
      }

      const data: Restaurant = await response.json()
      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '식당 수정 중 오류가 발생했습니다'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteRestaurant = async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '식당 삭제에 실패했습니다')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '식당 삭제 중 오류가 발생했습니다'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    restaurants,
    loading,
    error,
    meta,
    fetchRestaurants,
    createRestaurant,
    getRestaurant,
    updateRestaurant,
    deleteRestaurant,
  }
}
