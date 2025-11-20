import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 개발 환경에서만 사용하는 관리자 계정 생성 API
 * 프로덕션에서는 비활성화됨
 */
export async function POST(request: NextRequest) {
  // 프로덕션 환경에서는 비활성화
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()

    // 현재 로그인한 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 해당 사용자를 관리자로 변경
    const updateData: { role: 'admin' } = { role: 'admin' }
    const { data, error } = await (supabase.from('profiles') as any)
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating role:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: '관리자 권한이 부여되었습니다',
      profile: data,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
