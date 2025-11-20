import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nickname = searchParams.get('nickname')

    if (!nickname) {
      return NextResponse.json(
        { error: 'Nickname is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // auth.users와 profiles 둘 다 확인
    const { data, error } = await supabase.rpc('check_nickname_exists', {
      check_nickname: nickname,
    } as any)

    if (error) {
      console.error('Error checking nickname:', error)
      // RPC 함수가 없는 경우 profiles 테이블로 폴백
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking nickname in profiles:', profileError)
        return NextResponse.json(
          { error: 'Failed to check nickname' },
          { status: 500 }
        )
      }

      return NextResponse.json({ available: !profileData })
    }

    // data가 false면 사용 가능, true면 이미 사용 중
    return NextResponse.json({ available: !data })
  } catch (error) {
    console.error('Error in check-nickname API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
