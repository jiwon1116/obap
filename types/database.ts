export type UserRole = 'employee' | 'guest'

export interface Profile {
  id: string
  email: string
  username: string
  nickname: string
  role: UserRole
  company_domain: string | null
  avatar_url: string | null
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
    }
  }
}
