import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { importId, userId } = await req.json()

  if (!importId || !userId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the import belongs to this user
  const { data: imp } = await db.from('pending_imports').select('id, user_id').eq('id', importId).single()
  if (!imp || imp.user_id !== userId) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 })
  }

  const { error } = await db.from('pending_imports').delete().eq('id', importId)
  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })

  return NextResponse.json({ success: true })
}
