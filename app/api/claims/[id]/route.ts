import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = createServerClient()

    const updateData: Record<string, any> = {}

    if (body.rewritten_sentence !== undefined) {
      updateData.rewritten_sentence = body.rewritten_sentence
    }
    if (body.tech_stack !== undefined) {
      updateData.tech_stack = body.tech_stack
    }
    if (body.metric_type !== undefined) {
      updateData.metric_type = body.metric_type
    }
    if (body.metric_value !== undefined) {
      updateData.metric_value = body.metric_value
    }
    if (body.scope !== undefined) {
      updateData.scope = body.scope
    }
    if (body.job_title !== undefined) {
      updateData.job_title = body.job_title
    }

    const { data, error } = await supabase
      .from('rmc_claims')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update claim' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Claim patch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
