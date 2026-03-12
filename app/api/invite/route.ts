import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, eventName, eventId, inviterEmail } = await req.json()

  if (!email || !eventName || !eventId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const inviteUrl = `https://evnt.team/prototype/invite/${eventId}`

  const { data, error } = await resend.emails.send({
    from: 'Evnt.Team <noreply@evnt.team>',
    to: email,
    subject: `You're invited to ${eventName} 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
            
            <div style="margin-bottom:32px;">
              <span style="font-size:22px;font-weight:900;color:#F0F0F0;">Evnt<span style="color:#FF4D00">.Team</span></span>
            </div>

            <div style="background:#161616;border:1px solid #2A2A2A;border-radius:16px;padding:32px;margin-bottom:24px;">
              <div style="font-size:48px;margin-bottom:16px;">🎉</div>
              <h1 style="color:#F0F0F0;font-size:24px;font-weight:800;margin:0 0 8px;">You're invited!</h1>
              <p style="color:#888;font-size:14px;margin:0 0 24px;">
                ${inviterEmail ? `<strong style="color:#F0F0F0">${inviterEmail}</strong> invited you to join` : 'You\'ve been invited to'}
              </p>
              <div style="background:#0A0A0A;border:1px solid #2A2A2A;border-radius:12px;padding:20px;margin-bottom:28px;">
                <div style="font-size:20px;font-weight:800;color:#F0F0F0;">${eventName}</div>
              </div>
              <a href="${inviteUrl}" style="display:block;background:#FF4D00;color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:700;">
                View Event →
              </a>
            </div>

            <p style="color:#444;font-size:12px;text-align:center;margin:0;">
              You received this because someone invited you to an event on Evnt.Team.<br/>
              <a href="${inviteUrl}" style="color:#FF4D00;">${inviteUrl}</a>
            </p>

          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}