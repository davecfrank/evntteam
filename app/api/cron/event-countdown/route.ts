import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import ReminderEmail from '../../../../emails/ReminderEmail'

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
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = supabaseAdmin()
  const vapidReady = setupWebPush()
  const resend = new Resend(process.env.RESEND_API_KEY)

  const now = new Date()
  const checkDays = [7, 3, 1]

  let totalPush = 0
  let totalEmail = 0

  for (const daysAhead of checkDays) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + daysAhead)
    const dateStr = targetDate.toISOString().split('T')[0]

    // Find events starting on this date
    const { data: events } = await db
      .from('events')
      .select('id, name, destination, dates, event_type')
      .eq('dates', dateStr)

    if (!events || events.length === 0) continue

    for (const event of events) {
      const eventUrl = `https://evnt.team/event?id=${event.id}`
      const daysLabel = daysAhead === 1 ? 'tomorrow' : `in ${daysAhead} days`
      const title = `🎉 ${event.name} starts ${daysLabel}!`
      const body = event.destination
        ? `Your event in ${event.destination} is coming up. Make sure everything is ready!`
        : `Your event is coming up. Make sure everything is ready!`

      // Get all members + owner
      const { data: eventDetails } = await db.from('events').select('owner_id').eq('id', event.id).single()
      const { data: members } = await db.from('event_members').select('user_id, user_email').eq('event_id', event.id)

      const userIds = new Set<string>()
      const emails = new Set<string>()

      if (eventDetails?.owner_id) {
        userIds.add(eventDetails.owner_id)
        const { data: { user: ownerUser } } = await db.auth.admin.getUserById(eventDetails.owner_id)
        if (ownerUser?.email) emails.add(ownerUser.email)
      }
      if (members) {
        members.forEach(m => {
          if (m.user_id) userIds.add(m.user_id)
          if (m.user_email) emails.add(m.user_email)
        })
      }

      // Send push notifications
      if (vapidReady && userIds.size > 0) {
        const { data: subscriptions } = await db
          .from('push_subscriptions')
          .select('*')
          .in('user_id', Array.from(userIds))

        if (subscriptions) {
          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({ title, body, url: eventUrl, tag: `countdown-${event.id}-${daysAhead}` })
              )
              totalPush++
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
              }
            }
          }
        }
      }

      // Send email notifications
      if (emails.size > 0) {
        const emailHtml = await render(ReminderEmail({
          eventName: event.name,
          reminderType: 'countdown',
          title,
          body,
          eventUrl,
          daysUntil: daysAhead,
        }))

        for (const email of emails) {
          try {
            await resend.emails.send({
              from: 'Evnt.Team <noreply@evnt.team>',
              to: email,
              subject: title,
              html: emailHtml,
            })
            totalEmail++
          } catch (err) {
            console.error('Countdown email failed:', email, err)
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, totalPush, totalEmail })
}
