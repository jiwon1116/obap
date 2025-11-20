import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // auth.users와 profiles 둘 다 확인
    const { data, error } = await supabase.rpc('check_username_exists', {
      check_username: username,
    } as any)

    if (error) {
      console.error('Error checking username:', error)
      // RPC 함수가 없는 경우 profiles 테이블로 폴백
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking username in profiles:', profileError)
        return NextResponse.json(
          { error: 'Failed to check username' },
          { status: 500 }
        )
      }

      return NextResponse.json({ available: !profileData })
    }

    // data가 false면 사용 가능, true면 이미 사용 중
    return NextResponse.json({ available: !data })
  } catch (error) {
    console.error('Error in check-username API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
