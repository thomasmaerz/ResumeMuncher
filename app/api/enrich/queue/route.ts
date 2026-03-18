import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // First get all staging IDs that already have claims
    const { data: claimedIds } = await supabase
      .from('rmc_claims')
      .select('staging_id')
      .not('staging_id', 'is', null)

    const claimedIdList = (claimedIds || [])
      .map(c => c.staging_id)
      .filter(Boolean)

    // Get staging rows that have no claims and are not duplicates
    let query = supabase
      .from('rmc_experience_staging')
      .select(`
        id,
        source_resume_id,
        raw_text,
        company_name_raw,
        job_title
      `)
      .eq('is_duplicate', false)
      .order('created_at', { ascending: true })

    // If we have claimed IDs, exclude them
    if (claimedIdList.length > 0) {
      query = query.not('id', 'in', `(${claimedIdList.map(id => `"${id}"`).join(',')})`)
    }

    const { data: queue, error } = await query

    if (error) {
      console.error('Queue fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      )
    }

    const formatted = (queue || []).map((item: any) => ({
      id: item.id,
      raw_text: item.raw_text,
      company_name: item.company_name_raw || 'Unknown',
      job_title: item.job_title || null,
    }))

    return NextResponse.json(formatted, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Queue error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
