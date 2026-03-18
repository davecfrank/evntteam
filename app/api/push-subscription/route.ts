import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = () => createClient(
  'https://gwpdynchjkrytobpgjod.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json()

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth || !userId) {
      return NextResponse.json({ error: 'Missing subscription data or userId' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Upsert by endpoint (a device can only have one subscription)
    const { error } = await db.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('Push subscription store error:', error)
      return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    const db = supabaseAdmin()
    await db.from('push_subscriptions').delete().eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
