import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/menus/[id] - Get a specific menu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching menu:', error)
      return NextResponse.json(
        { error: '메뉴 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '메뉴를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/menus/[id] - Update a menu (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as { role: string }).role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update menu
    const { data, error } = await supabase
      .from('menus')
      .update(body as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating menu:', error)
      return NextResponse.json(
        { error: '메뉴 수정에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/menus/[id] - Delete a menu (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as { role: string }).role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    // Delete menu
    const { error } = await supabase.from('menus').delete().eq('id', id)

    if (error) {
      console.error('Error deleting menu:', error)
      return NextResponse.json(
        { error: '메뉴 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '메뉴가 삭제되었습니다' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
