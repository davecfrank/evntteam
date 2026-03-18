import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  // Use service role key to bypass RLS — this is a public invite lookup
  const supabaseAdmin = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('id, name, destination, dates, end_date, event_type, event_time, requires_flights, requires_lodging, owner_id')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Get member count
  const { count } = await supabaseAdmin
    .from('event_members')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  // Get host name
  let hostName: string | null = null
  if (event.owner_id) {
    const { data: hostProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', event.owner_id)
      .single()
    hostName = hostProfile?.full_name || null
  }

  return NextResponse.json({ event, memberCount: (count || 0) + 1, hostName })
}
