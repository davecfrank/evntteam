import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../../lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const svixId = req.headers.get('svix-id') || ''
  const svixTimestamp = req.headers.get('svix-timestamp') || ''
  const svixSignature = req.headers.get('svix-signature') || ''

  // Verify webhook signature
  let event: any
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Only handle inbound emails
  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const data = event.data
  const inboxAddress = data.to?.find((addr: string) => addr.endsWith('@inbox.evnt.team'))
  if (!inboxAddress) {
    return NextResponse.json({ ok: true })
  }

  const slug = inboxAddress.split('@')[0]

  // Look up user by slug
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('import_email_slug', slug)
    .single()

  if (!profile) {
    return NextResponse.json({ ok: true }) // Unknown slug, discard
  }

  // Deduplicate — check if we already processed this email
  const emailId = data.email_id
  const { data: existing } = await supabaseAdmin
    .from('pending_imports')
    .select('id')
    .eq('source_email_id', emailId)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, deduplicated: true })
  }

  // Fetch full email body from Resend
  const { data: fullEmail, error: fetchError } = await resend.emails.receiving.get(emailId)
  if (fetchError || !fullEmail) {
    console.error('Failed to fetch email body:', fetchError)
    return NextResponse.json({ ok: true })
  }

  const emailContent = fullEmail.text || fullEmail.html || ''
  if (!emailContent) {
    return NextResponse.json({ ok: true })
  }

  // Parse with Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let responseText = ''
  try {
    const parseResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a travel reservation parser. Extract structured data from this email confirmation.

Return ONLY a JSON object or array (no markdown, no explanation).

Each reservation should have this structure:
{
  "type": "flight" | "lodging" | "rental_car",
  "confidence": "high" | "medium" | "low",
  "data": { ... }
}

For "flight" data fields: airline, flight_number, departure_airport (3-letter code), arrival_airport (3-letter code), departure_time (ISO 8601 datetime or null), arrival_time (ISO 8601 datetime or null), notes
For "lodging" data fields: hotel_name, address, check_in (YYYY-MM-DD or null), check_out (YYYY-MM-DD or null), confirmation_code, notes
For "rental_car" data fields: company, confirmation_code, pickup_location, pickup_time (ISO 8601 or null), dropoff_location, dropoff_time (ISO 8601 or null), notes

If the email contains multiple reservations, return a JSON array.
If no travel reservation is found, return: {"type": "unknown", "confidence": "low", "data": {}}
Set confidence based on how clearly the fields were stated in the email.

Email subject: ${fullEmail.subject || ''}
Email from: ${data.from || ''}

Email body:
${emailContent.slice(0, 12000)}`,
      }],
    })

    responseText = parseResponse.content[0].type === 'text' ? parseResponse.content[0].text : ''
  } catch (err) {
    console.error('Claude parse failed:', err)
    // Store as parse failure
    await supabaseAdmin.from('pending_imports').insert({
      user_id: profile.id,
      user_email: data.from || '',
      type: 'unknown',
      parsed_data: {},
      raw_subject: fullEmail.subject || data.subject,
      raw_from: data.from,
      source_email_id: emailId,
      status: 'pending',
    })
    return NextResponse.json({ ok: true, parse_failed: true })
  }

  // Parse Claude's JSON response
  let parsed
  try {
    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('Claude returned invalid JSON:', responseText)
    await supabaseAdmin.from('pending_imports').insert({
      user_id: profile.id,
      user_email: data.from || '',
      type: 'unknown',
      parsed_data: { raw_response: responseText },
      raw_subject: fullEmail.subject || data.subject,
      raw_from: data.from,
      source_email_id: emailId,
      status: 'pending',
    })
    return NextResponse.json({ ok: true, parse_failed: true })
  }

  // Normalize to array
  const reservations = Array.isArray(parsed) ? parsed : [parsed]

  // Get user email from auth
  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
  const userEmail = authData?.user?.email || data.from

  let imported = 0
  for (const reservation of reservations) {
    if (reservation.type === 'unknown' && reservation.confidence === 'low') continue

    // Map type to our table naming
    const type = reservation.type === 'rental_car' ? 'rental_car'
      : reservation.type === 'lodging' ? 'lodging'
      : reservation.type === 'flight' ? 'flight'
      : 'unknown'

    await supabaseAdmin.from('pending_imports').insert({
      user_id: profile.id,
      user_email: userEmail,
      type,
      parsed_data: reservation.data || {},
      raw_subject: fullEmail.subject || data.subject,
      raw_from: data.from,
      source_email_id: emailId,
      status: 'pending',
    })
    imported++
  }

  return NextResponse.json({ ok: true, imported })
}
