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

    // username으로 email 찾기
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('Error getting email by username:', error)
      return NextResponse.json(
        { error: 'Failed to get email' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ email: data.email })
  } catch (error) {
    console.error('Error in get-email-by-username API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
