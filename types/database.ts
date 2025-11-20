export type UserRole = 'employee' | 'guest' | 'admin'
export type PriceTier = 'under_8000' | 'around_10000' | 'premium'
export type LocationApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  username: string
  nickname: string
  role: UserRole
  company_domain: string | null
  company_name: string | null
  company_address: string | null
  company_latitude: number | null
  company_longitude: number | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Restaurant {
  id: string
  name: string
  category: string
  phone: string | null
  address: string
  road_address: string | null
  latitude: number
  longitude: number
  place_url: string | null
  price_tier: PriceTier | null
  description: string | null
  avg_rating: number
  review_count: number
  opening_date: string | null
  is_newly_opened: boolean
  naver_place_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RestaurantWithDistance extends Restaurant {
  distance_meters: number
  walking_minutes: number
}

export interface CompanyLocationRequest {
  id: string
  user_id: string
  company_name: string | null
  company_address: string
  latitude: number
  longitude: number
  status: LocationApprovalStatus
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export interface Menu {
  id: string
  restaurant_id: string
  menu_name: string
  price: number
  description: string | null
  image_url: string | null
  is_signature: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      restaurants: {
        Row: Restaurant
        Insert: Omit<Restaurant, 'id' | 'avg_rating' | 'review_count' | 'is_newly_opened' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Restaurant, 'id' | 'avg_rating' | 'review_count' | 'is_newly_opened' | 'created_at' | 'updated_at'>>
      }
      company_location_requests: {
        Row: CompanyLocationRequest
        Insert: Omit<CompanyLocationRequest, 'id' | 'status' | 'requested_at' | 'reviewed_at' | 'reviewed_by' | 'review_note' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CompanyLocationRequest, 'id' | 'user_id' | 'requested_at' | 'created_at'>>
      }
      menus: {
        Row: Menu
        Insert: Omit<Menu, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Menu, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>>
      }
    }
    Functions: {
      check_email_exists: {
        Args: { check_email: string }
        Returns: boolean
      }
      check_username_exists: {
        Args: { check_username: string }
        Returns: boolean
      }
      check_nickname_exists: {
        Args: { check_nickname: string }
        Returns: boolean
      }
      find_restaurants_within_radius: {
        Args: {
          center_lat: number
          center_lng: number
          radius_meters: number
        }
        Returns: RestaurantWithDistance[]
      }
      calculate_walking_distance_minutes: {
        Args: {
          from_lat: number
          from_lng: number
          to_lat: number
          to_lng: number
        }
        Returns: number
      }
      approve_company_location_request: {
        Args: {
          request_id: string
          admin_id: string
          note?: string
        }
        Returns: boolean
      }
      reject_company_location_request: {
        Args: {
          request_id: string
          admin_id: string
          note?: string
        }
        Returns: boolean
      }
    }
  }
}
