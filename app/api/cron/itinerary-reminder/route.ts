import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

const supabaseAdmin = () => createClient(
  'https://gwpdynchjkrytobpgjod.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function setupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (publicKey && privateKey) {
    webpush.setVapidDetails('mailto:noreply@evnt.team', publicKey, privateKey)
    return true
  }
  return false
}

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development but block in production without secret
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = supabaseAdmin()
  const vapidReady = setupWebPush()
  if (!vapidReady) return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })

  const now = new Date()
  const in60min = new Date(now.getTime() + 60 * 60 * 1000)
  const in75min = new Date(now.getTime() + 75 * 60 * 1000)

  // Format as date and time strings for comparison
  const today = now.toISOString().split('T')[0]
  const timeFrom = `${String(in60min.getHours()).padStart(2, '0')}:${String(in60min.getMinutes()).padStart(2, '0')}`
  const timeTo = `${String(in75min.getHours()).padStart(2, '0')}:${String(in75min.getMinutes()).padStart(2, '0')}`

  // Find booked itinerary items with start_time in the 60-75 min window
  const { data: items } = await db
    .from('itinerary_items')
    .select('id, event_id, title, start_time, location')
    .eq('date', today)
    .eq('is_booked', true)
    .gte('start_time', timeFrom)
    .lte('start_time', timeTo)

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0 })
  }

  let pushSent = 0

  for (const item of items) {
    // Get all members + owner for this event
    const { data: event } = await db.from('events').select('owner_id').eq('id', item.event_id).single()
    const { data: members } = await db.from('event_members').select('user_id').eq('event_id', item.event_id)

    const userIds = new Set<string>()
    if (event?.owner_id) userIds.add(event.owner_id)
    if (members) members.forEach(m => { if (m.user_id) userIds.add(m.user_id) })

    if (userIds.size === 0) continue

    // Get push subscriptions
    const { data: subscriptions } = await db
      .from('push_subscriptions')
      .select('*')
      .in('user_id', Array.from(userIds))

    if (!subscriptions) continue

    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      const period = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${m.toString().padStart(2, '0')} ${period}`
    }

    const body = `${item.title} starts at ${formatTime(item.start_time)}${item.location ? ` · 📍 ${item.location}` : ''}`

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: `🗓 Coming up in 1 hour`,
            body,
            url: `/event?id=${item.event_id}`,
            tag: `itinerary-${item.id}`,
          })
        )
        pushSent++
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, reminded: items.length, pushSent })
}
