import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  const userId = req.nextUrl.searchParams.get('userId')
  const userEmail = req.nextUrl.searchParams.get('userEmail')

  if (!eventId || !userId || !userEmail) {
    return NextResponse.json({ error: 'Missing eventId, userId, or userEmail' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch event
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (eventError || !eventData) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Verify access: user must be owner or a member
  const isOwner = eventData.owner_id === userId
  if (!isOwner) {
    const { data: membership } = await supabaseAdmin
      .from('event_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_email', userEmail)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Fetch members (deduplicated server-side)
  const { data: membersRaw } = await supabaseAdmin
    .from('event_members')
    .select('*')
    .eq('event_id', eventId)

  const seen = new Set<string>()
  const members = (membersRaw || []).filter((m: any) => {
    if (seen.has(m.user_email)) return false
    seen.add(m.user_email)
    return true
  })

  // Fetch flights & lodging if needed
  let flights: any[] = []
  let lodgings: any[] = []
  if (eventData.requires_flights) {
    const { data } = await supabaseAdmin.from('member_flights').select('*').eq('event_id', eventId)
    flights = data || []
  }
  if (eventData.requires_lodging) {
    const { data } = await supabaseAdmin.from('member_lodging').select('*').eq('event_id', eventId)
    lodgings = data || []
  }

  // Collect all user IDs for profile lookup
  const userIds = new Set<string>()
  const emailToId: Record<string, string> = {}
  userIds.add(userId)
  emailToId[userEmail] = userId
  if (eventData.owner_id) userIds.add(eventData.owner_id)
  members.forEach((m: any) => { if (m.user_id) { userIds.add(m.user_id); if (m.user_email) emailToId[m.user_email] = m.user_id } })
  flights.forEach((f: any) => { if (f.user_id) { userIds.add(f.user_id); if (f.user_email) emailToId[f.user_email] = f.user_id } })
  lodgings.forEach((l: any) => { if (l.user_id) { userIds.add(l.user_id); if (l.user_email) emailToId[l.user_email] = l.user_id } })

  // Photo + chat user IDs
  const { data: photoUsers } = await supabaseAdmin.from('event_photos').select('user_id, user_email').eq('event_id', eventId)
  if (photoUsers) photoUsers.forEach((p: any) => { if (p.user_id) { userIds.add(p.user_id); if (p.user_email) emailToId[p.user_email] = p.user_id } })
  const { data: chatUsers } = await supabaseAdmin.from('chat_messages').select('user_id, user_email').eq('event_id', eventId)
  if (chatUsers) chatUsers.forEach((m: any) => { if (m.user_id) { userIds.add(m.user_id); if (m.user_email) emailToId[m.user_email] = m.user_id } })

  // Announcements
  const { data: announcementsData } = await supabaseAdmin
    .from('event_announcements')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (announcementsData) announcementsData.forEach((a: any) => { if (a.user_id) { userIds.add(a.user_id); if (a.user_email) emailToId[a.user_email] = a.user_id } })

  // Bulk fetch profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(userIds))

  const profileMap: Record<string, string> = {}
  if (profiles) profiles.forEach((p: any) => { if (p.full_name) profileMap[p.id] = p.full_name })
  // Cross-reference emails to names
  Object.entries(emailToId).forEach(([email, id]) => { if (profileMap[id]) profileMap[email] = profileMap[id] })

  // My profile
  const { data: myProfileData } = await supabaseAdmin
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  // Pending imports count
  const { count: pendingImportsCount } = await supabaseAdmin
    .from('pending_imports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')

  return NextResponse.json({
    event: eventData,
    members,
    flights,
    lodgings,
    announcements: announcementsData || [],
    profileMap,
    emailToIdMap: emailToId,
    myProfile: myProfileData,
    pendingImportsCount: pendingImportsCount || 0,
  })
}
