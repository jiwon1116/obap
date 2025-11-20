import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 현재 로그인한 사용자 가져오기
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 이미 프로필이 있는지 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists' })
    }

    // metadata에서 정보 추출
    const username =
      user.user_metadata?.username || user.email?.split('@')[0] || ''
    const nickname = user.user_metadata?.nickname || username
    const emailDomain = user.email?.split('@')[1] || ''

    // 공개 이메일 도메인 목록
    const publicDomains = [
      'gmail.com',
      'naver.com',
      'daum.net',
      'kakao.com',
      'hanmail.net',
      'yahoo.com',
      'yahoo.co.kr',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'icloud.com',
      'nate.com',
      'korea.com',
    ]

    // 영문 도메인 체크
    const isEnglishDomain = /^[a-zA-Z0-9.-]+$/.test(emailDomain)
    const isPublicDomain = publicDomains.includes(emailDomain)

    // 역할 결정
    const isEmployee = !isPublicDomain && isEnglishDomain
    const role = isEmployee ? 'employee' : 'guest'
    const companyDomain = isEmployee ? emailDomain : null

    // 프로필 생성
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      username,
      nickname,
      role,
      company_domain: companyDomain,
    } as any)

    if (insertError) {
      console.error('Error creating profile:', insertError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Profile created successfully' })
  } catch (error) {
    console.error('Error in create-profile API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
