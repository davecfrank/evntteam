import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { action, pollId, userId } = await req.json()

  if (!action || !pollId || !userId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch poll + event to check permissions
  const { data: poll } = await db.from('polls').select('*, events!inner(owner_id)').eq('id', pollId).single()
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

  const isCreator = poll.created_by === userId
  const isOwner = poll.events?.owner_id === userId

  // Check cohost
  let isCohost = false
  if (!isCreator && !isOwner) {
    const { data: membership } = await db
      .from('event_members')
      .select('role_level')
      .eq('event_id', poll.event_id)
      .eq('user_id', userId)
      .maybeSingle()
    isCohost = membership?.role_level === 'cohost'
  }

  if (!isCreator && !isOwner && !isCohost) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  if (action === 'close') {
    const { error } = await db.from('polls').update({ is_closed: true }).eq('id', pollId)
    if (error) return NextResponse.json({ error: 'Failed to close poll' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    // Cascade: votes → options → poll (ON DELETE CASCADE handles this, but be explicit)
    await db.from('poll_votes').delete().eq('poll_id', pollId)
    await db.from('poll_options').delete().eq('poll_id', pollId)
    const { error } = await db.from('polls').delete().eq('id', pollId)
    if (error) return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
