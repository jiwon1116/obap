import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

/**
 * 현재 로그인한 사용자의 프로필을 가져옵니다
 * @server-only 서버 컴포넌트에서만 사용 가능
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * 사용자가 직장인(employee) 역할인지 확인합니다
 */
export async function isEmployee(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'employee'
}

/**
 * 사용자가 게스트(guest) 역할인지 확인합니다
 */
export async function isGuest(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'guest'
}
