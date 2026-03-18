import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/components'
import InviteEmail from '../../../emails/InviteEmail'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { email, eventName, eventId, inviterEmail, inviterName, eventDate, destination, eventType } = await req.json()

  if (!email || !eventName || !eventId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const inviteUrl = `https://evnt.team/invite/${eventId}`
  const displayName = inviterName || inviterEmail || 'Someone'

  const emailHtml = await render(InviteEmail({
    eventName,
    inviterName: displayName,
    inviteUrl,
    eventDate,
    destination,
    eventType,
  }))

  const { data, error } = await resend.emails.send({
    from: 'Evnt.Team <noreply@evnt.team>',
    to: email,
    subject: `${displayName} invited you to ${eventName} 🎉`,
    html: emailHtml,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
