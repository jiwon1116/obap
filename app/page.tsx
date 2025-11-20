'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlaceSearch from '@/components/place-search'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Check if admin and not explicitly requesting main page
        if (profile && (profile as { role: string }).role === 'admin') {
          // Check if there's a flag to stay on main page
          const stayOnMain = sessionStorage.getItem('viewMainPage')
          if (!stayOnMain) {
            router.push('/admin/restaurants')
            return
          }
          // Clear the flag after checking
          sessionStorage.removeItem('viewMainPage')
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="w-full h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </main>
    )
  }

  return (
    <main className="w-full h-screen overflow-hidden">
      <PlaceSearch />
    </main>
  )
}
