import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = () => createClient(
  'https://gwpdynchjkrytobpgjod.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAccess(db: any, eventId: string, userId: string, userEmail: string) {
  const { data: event } = await db.from('events').select('id, owner_id').eq('id', eventId).single()
  if (!event) return null
  if (event.owner_id === userId) return event
  const { data: membership } = await db.from('event_members').select('id').eq('event_id', eventId).eq('user_email', userEmail).maybeSingle()
  if (!membership) return null
  return event
}

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  const userId = req.nextUrl.searchParams.get('userId')
  const userEmail = req.nextUrl.searchParams.get('userEmail')

  if (!eventId || !userId || !userEmail) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const event = await verifyAccess(db, eventId, userId, userEmail)
  if (!event) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { data: polls } = await db
    .from('polls')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (!polls || polls.length === 0) {
    return NextResponse.json({ polls: [], options: {}, votes: {} })
  }

  const pollIds = polls.map((p: any) => p.id)

  const { data: optionsData } = await db
    .from('poll_options')
    .select('*')
    .in('poll_id', pollIds)
    .order('sort_order', { ascending: true })

  const { data: votesData } = await db
    .from('poll_votes')
    .select('*')
    .in('poll_id', pollIds)

  const options: Record<string, any[]> = {}
  ;(optionsData || []).forEach((o: any) => {
    if (!options[o.poll_id]) options[o.poll_id] = []
    options[o.poll_id].push(o)
  })

  const votes: Record<string, any[]> = {}
  ;(votesData || []).forEach((v: any) => {
    if (!votes[v.poll_id]) votes[v.poll_id] = []
    votes[v.poll_id].push(v)
  })

  return NextResponse.json({ polls, options, votes })
}

export async function POST(req: NextRequest) {
  const { eventId, userId, userEmail, question, options } = await req.json()

  if (!eventId || !userId || !userEmail || !question || !options || options.length < 2) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const event = await verifyAccess(db, eventId, userId, userEmail)
  if (!event) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { data: poll, error: pollError } = await db
    .from('polls')
    .insert({
      event_id: eventId,
      question: question.trim(),
      created_by: userId,
      created_by_email: userEmail,
    })
    .select()
    .single()

  if (pollError || !poll) {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }

  const optionRows = options.map((label: string, i: number) => ({
    poll_id: poll.id,
    label: label.trim(),
    sort_order: i,
  }))

  const { data: createdOptions, error: optError } = await db
    .from('poll_options')
    .insert(optionRows)
    .select()

  if (optError) {
    await db.from('polls').delete().eq('id', poll.id)
    return NextResponse.json({ error: 'Failed to create options' }, { status: 500 })
  }

  return NextResponse.json({ poll, options: createdOptions })
}
