import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // auth.users 테이블에서 이메일이 이미 존재하는지 확인
    const { data, error } = await supabase.rpc('check_email_exists', {
      check_email: email,
    } as any)

    if (error) {
      console.error('Error checking email:', error)
      // RPC 함수가 없는 경우 profiles 테이블로 폴백
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking email in profiles:', profileError)
        return NextResponse.json(
          { error: 'Failed to check email' },
          { status: 500 }
        )
      }

      return NextResponse.json({ available: !profileData })
    }

    // data가 false면 사용 가능, true면 이미 사용 중
    return NextResponse.json({ available: !data })
  } catch (error) {
    console.error('Error in check-email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
