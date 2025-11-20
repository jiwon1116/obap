import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '식당을 찾을 수 없습니다' },
          { status: 404 }
        )
      }
      console.error('Error fetching restaurant:', error)
      return NextResponse.json(
        { error: '식당 조회에 실패했습니다' },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Get restaurant to check ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!restaurant) {
      return NextResponse.json(
        { error: '식당을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check if user is the creator or an employee
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isCreator = (restaurant as { created_by: string | null }).created_by === user.id
    const isEmployee = (profile as { role: string } | null)?.role === 'employee'

    if (!isCreator && !isEmployee) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Fields that can be updated
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name',
      'category',
      'phone',
      'address',
      'road_address',
      'latitude',
      'longitude',
      'place_url',
      'price_tier',
      'description',
      'opening_date',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Update restaurant
    const { data, error } = await supabase
      .from('restaurants')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating restaurant:', error)
      return NextResponse.json(
        { error: '식당 수정에 실패했습니다' },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Get restaurant to check ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!restaurant) {
      return NextResponse.json(
        { error: '식당을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Only creator can delete
    if ((restaurant as { created_by: string | null }).created_by !== user.id) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('restaurants').delete().eq('id', id)

    if (error) {
      console.error('Error deleting restaurant:', error)
      return NextResponse.json(
        { error: '식당 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '식당이 삭제되었습니다' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
