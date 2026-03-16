import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { eventId, memberId, memberEmail, userId } = await req.json()

  if (!eventId || !userId || (!memberId && !memberEmail)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the requesting user is the event owner or a cohost
  const { data: event } = await db.from('events').select('owner_id').eq('id', eventId).single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const isOwner = event.owner_id === userId
  if (!isOwner) {
    const { data: membership } = await db.from('event_members').select('role_level').eq('event_id', eventId).eq('user_id', userId).maybeSingle()
    if (!membership || membership.role_level !== 'cohost') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
  }

  if (memberId) {
    await db.from('event_members').delete().eq('id', memberId)
  } else {
    await db.from('event_members').delete().eq('event_id', eventId).eq('user_email', memberEmail)
  }

  return NextResponse.json({ success: true })
}
