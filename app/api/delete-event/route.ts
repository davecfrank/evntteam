import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { eventId, userId } = await req.json()

  if (!eventId || !userId) {
    return NextResponse.json({ error: 'Missing eventId or userId' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the user is the owner of this event
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('id, owner_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.owner_id !== userId) {
    return NextResponse.json({ error: 'Only the event owner can delete this event' }, { status: 403 })
  }

  try {
    // 1. Delete photo-related data (no event_id column — need photo IDs first)
    const { data: photos } = await supabaseAdmin.from('event_photos').select('id').eq('event_id', eventId)
    if (photos && photos.length > 0) {
      const photoIds = photos.map((p: any) => p.id)
      const { data: comments } = await supabaseAdmin.from('photo_comments').select('id').in('photo_id', photoIds)
      if (comments && comments.length > 0) {
        await supabaseAdmin.from('comment_reactions').delete().in('comment_id', comments.map((c: any) => c.id))
      }
      await supabaseAdmin.from('photo_comments').delete().in('photo_id', photoIds)
      await supabaseAdmin.from('photo_reactions').delete().in('photo_id', photoIds)
    }

    // 2. Delete tables with event_id column
    const tables = [
      'event_photos', 'item_votes', 'itinerary_items',
      'bill_splits', 'bills',
      'member_flights', 'member_lodging', 'member_rental_cars',
      'event_announcements', 'event_members',
      'chat_messages', 'chat_groups',
      'poll_votes', 'poll_options', 'polls',
    ]
    for (const table of tables) {
      await supabaseAdmin.from(table).delete().eq('event_id', eventId)
    }

    // 3. Delete the event itself
    const { error: deleteError } = await supabaseAdmin.from('events').delete().eq('id', eventId)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete event: ' + err.message }, { status: 500 })
  }
}
