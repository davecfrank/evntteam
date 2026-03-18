import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import NotificationEmail from '../../../emails/NotificationEmail'

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

export async function POST(req: NextRequest) {
  try {
    const { eventId, type, title, body, url, excludeUserId, sendEmail, emailSubject } = await req.json()

    if (!eventId || !title) {
      return NextResponse.json({ error: 'Missing eventId or title' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Get event details
    const { data: event } = await db.from('events').select('name, owner_id').eq('id', eventId).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    // Get all members + owner
    const { data: members } = await db.from('event_members').select('user_email, user_id').eq('event_id', eventId)

    // Collect all recipient user IDs (members + owner)
    const recipientEmails = new Set<string>()
    const recipientUserIds = new Set<string>()

    // Add owner
    if (event.owner_id && event.owner_id !== excludeUserId) {
      recipientUserIds.add(event.owner_id)
      // Get owner email
      const { data: ownerProfile } = await db.from('profiles').select('id').eq('id', event.owner_id).single()
      if (ownerProfile) {
        const { data: { user: ownerUser } } = await db.auth.admin.getUserById(event.owner_id)
        if (ownerUser?.email) recipientEmails.add(ownerUser.email)
      }
    }

    // Add members
    if (members) {
      for (const m of members) {
        if (m.user_id && m.user_id !== excludeUserId) {
          recipientUserIds.add(m.user_id)
        }
        if (m.user_email && m.user_id !== excludeUserId) {
          recipientEmails.add(m.user_email)
        }
      }
    }

    // Also exclude sender's email
    if (excludeUserId) {
      const { data: { user: senderUser } } = await db.auth.admin.getUserById(excludeUserId)
      if (senderUser?.email) recipientEmails.delete(senderUser.email)
    }

    const eventUrl = url || `https://evnt.team/event?id=${eventId}`
    let pushSent = 0
    let pushFailed = 0

    // Send push notifications
    const vapidReady = setupWebPush()
    if (vapidReady && recipientUserIds.size > 0) {
      const { data: subscriptions } = await db
        .from('push_subscriptions')
        .select('*')
        .in('user_id', Array.from(recipientUserIds))

      if (subscriptions) {
        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify({
                title,
                body: body || '',
                url: eventUrl,
                tag: `${type}-${eventId}`,
              })
            )
            pushSent++
          } catch (err: any) {
            pushFailed++
            // Remove expired subscriptions (410 Gone or 404)
            if (err.statusCode === 410 || err.statusCode === 404) {
              await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
          }
        }
      }
    }

    // Send email notifications
    let emailSent = 0
    if (sendEmail && recipientEmails.size > 0) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const emailHtml = await render(NotificationEmail({
        eventName: event.name,
        type: type || 'update',
        title,
        body: body || '',
        eventUrl,
      }))

      for (const email of recipientEmails) {
        try {
          await resend.emails.send({
            from: 'Evnt.Team <noreply@evnt.team>',
            to: email,
            subject: emailSubject || title,
            html: emailHtml,
          })
          emailSent++
        } catch (err) {
          console.error('Email notification failed:', email, err)
        }
      }
    }

    return NextResponse.json({ ok: true, pushSent, pushFailed, emailSent })
  } catch (err: any) {
    console.error('Send notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
