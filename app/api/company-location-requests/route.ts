import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// GET - 사용자의 위치 승인 요청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 프로필 확인 (관리자인지 확인)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    // 관리자는 모든 요청을 볼 수 있고, 일반 사용자는 자신의 요청만
    let query = supabase
      .from('company_location_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    if (profile?.role !== 'admin') {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching location requests:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      // 테이블이 존재하지 않는 경우에도 빈 배열 반환
      if (error.code === '42P01') {
        console.log('Table does not exist, returning empty array')
        return NextResponse.json({ requests: [], error: 'Table not found. Please run migrations.' })
      }
      return NextResponse.json({
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: 500 })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 새로운 위치 승인 요청 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { company_name, company_address, latitude, longitude } = body

    console.log('Received request body:', {
      company_name,
      company_address,
      latitude,
      longitude,
      latitude_type: typeof latitude,
      longitude_type: typeof longitude,
    })

    // 필수 필드 확인
    if (!company_address || latitude === undefined || longitude === undefined) {
      console.error('Missing required fields:', {
        company_address: !!company_address,
        latitude: latitude !== undefined,
        longitude: longitude !== undefined,
      })
      return NextResponse.json(
        { error: 'Missing required fields: company_address, latitude, longitude' },
        { status: 400 }
      )
    }

    // 좌표 유효성 확인
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates:', { latitude, longitude })
      return NextResponse.json(
        { error: 'Invalid latitude or longitude values' },
        { status: 400 }
      )
    }

    // 이미 pending 상태의 요청이 있는지 확인
    const { data: existingRequest } = await supabase
      .from('company_location_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        { error: '이미 승인 대기 중인 요청이 있습니다' },
        { status: 400 }
      )
    }

    // 새 요청 생성
    const { data, error } = await supabase
      .from('company_location_requests')
      .insert({
        user_id: user.id,
        company_name,
        company_address,
        latitude,
        longitude,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating location request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { message: '위치 승인 요청이 생성되었습니다', request: data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
