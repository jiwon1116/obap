export interface Place {
  id: string
  name: string
  category: string
  phone: string
  address: string
  roadAddress: string
  x: number // 경도 (longitude)
  y: number // 위도 (latitude)
  placeUrl: string
  distance?: string
}

export interface PlaceSearchResponse {
  places: Place[]
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
  }
}
