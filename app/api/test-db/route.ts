import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. 연결 테스트
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        success: false,
        message: 'Supabase 연결 실패',
        error: testError
      }, { status: 500 })
    }

    // 2. restaurants 테이블 확인
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('count')
      .limit(1)

    if (restaurantError) {
      return NextResponse.json({
        success: false,
        supabase_connected: true,
        restaurants_table_exists: false,
        message: 'restaurants 테이블이 아직 생성되지 않았습니다',
        error: restaurantError.message,
        instruction: 'Supabase SQL Editor에서 SETUP_RESTAURANTS_ONLY.sql을 실행하세요'
      })
    }

    return NextResponse.json({
      success: true,
      supabase_connected: true,
      restaurants_table_exists: true,
      message: '✅ 모든 준비 완료! 테스트를 시작할 수 있습니다.'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '예상치 못한 오류 발생',
      error: error.message
    }, { status: 500 })
  }
}
