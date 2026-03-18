import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = createServerClient()
    
    // Call the RPC we just defined in the migration
    const { error } = await supabase.rpc('rmc_reset_database')
    
    if (error) {
      console.error('Database reset error:', error)
      return NextResponse.json(
        { error: 'Failed to reset database: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
