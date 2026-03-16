import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { membershipId, userId, status } = await req.json()

  if (!membershipId || !userId || !status) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the membership belongs to this user
  const { data: membership } = await db
    .from('event_members')
    .select('id, user_id, user_email')
    .eq('id', membershipId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  // Allow if user_id matches or if user_id is null (invited by email before account creation)
  if (membership.user_id && membership.user_id !== userId) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const { error } = await db
    .from('event_members')
    .update({ rsvp_status: status, user_id: userId })
    .eq('id', membershipId)

  if (error) return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 })

  return NextResponse.json({ success: true })
}
