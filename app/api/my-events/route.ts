import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const userEmail = req.nextUrl.searchParams.get('userEmail')

  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'Missing userId or userEmail' }, { status: 400 })
  }

  // Use service role key to bypass RLS
  const supabaseAdmin = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch events the user owns
  const { data: ownedEvents } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  // Fetch events the user is a member of
  const { data: memberships } = await supabaseAdmin
    .from('event_members')
    .select('event_id')
    .eq('user_email', userEmail)

  let memberEvents: any[] = []
  if (memberships && memberships.length > 0) {
    const memberEventIds = memberships.map(m => m.event_id)
    const { data: mEvents } = await supabaseAdmin
      .from('events')
      .select('*')
      .in('id', memberEventIds)
      .order('created_at', { ascending: false })
    memberEvents = mEvents || []
  }

  // Combine and deduplicate
  const ownedIds = new Set((ownedEvents || []).map((e: any) => e.id))
  const combined = [
    ...(ownedEvents || []),
    ...memberEvents.filter((e: any) => !ownedIds.has(e.id))
  ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ events: combined })
}
