import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    'https://gwpdynchjkrytobpgjod.supabase.co',
    'sb_publishable_PSX3RlRr2j2IgOMVlyGlrw_uWlzkIsb',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if slug already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('import_email_slug')
    .eq('id', user.id)
    .single()

  if (profile?.import_email_slug) {
    return NextResponse.json({ slug: profile.import_email_slug })
  }

  // Generate unique slug with retry
  let slug = nanoid(8).toLowerCase()
  let attempts = 0
  while (attempts < 5) {
    const { error } = await supabase
      .from('profiles')
      .update({ import_email_slug: slug })
      .eq('id', user.id)

    if (!error) break
    slug = nanoid(8).toLowerCase()
    attempts++
  }

  return NextResponse.json({ slug })
}
