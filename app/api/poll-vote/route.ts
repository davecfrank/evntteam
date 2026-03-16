import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pollId, optionId, eventId, userId, userEmail } = await req.json()

  if (!pollId || !optionId || !eventId || !userId || !userEmail) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify poll exists and is not closed
  const { data: poll } = await db.from('polls').select('id, is_closed').eq('id', pollId).single()
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.is_closed) return NextResponse.json({ error: 'Poll is closed' }, { status: 400 })

  // Check existing vote
  const { data: existing } = await db
    .from('poll_votes')
    .select('id, option_id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Delete existing vote
    await db.from('poll_votes').delete().eq('id', existing.id)

    // If clicking the same option, just toggle off (don't re-insert)
    if (existing.option_id === optionId) {
      return NextResponse.json({ action: 'removed' })
    }
  }

  // Insert new vote
  const { data: vote, error } = await db
    .from('poll_votes')
    .insert({
      poll_id: pollId,
      option_id: optionId,
      event_id: eventId,
      user_id: userId,
      user_email: userEmail,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }

  return NextResponse.json({ action: 'voted', vote })
}
