'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [imports, setImports] = useState<any[]>([])
  const [importSlug, setImportSlug] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [slugCopied, setSlugCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/prototype'); return }
      setUser(user)
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
      } else {
        setFullName(user.email?.split('@')[0] || '')
      }
      const { data: eventsData } = await supabase.from('events').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      setEvents(eventsData || [])
      if (profileData?.import_email_slug) setImportSlug(profileData.import_email_slug)
      const { data: importsData } = await supabase.from('pending_imports').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
      setImports(importsData || [])
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, full_name: fullName })
    setProfile({ ...profile, full_name: fullName })
    setEditing(false)
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/prototype')
  }

  async function generateSlug() {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/generate-import-slug', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const { slug } = await res.json()
    setImportSlug(slug)
  }

  async function assignImport(importId: string, eventId: string) {
    const imp = imports.find((i: any) => i.id === importId)
    if (!imp || !eventId) return
    const d = imp.parsed_data
    let insertTable = ''
    let payload: any = { event_id: eventId, user_id: user.id, user_email: user.email }

    if (imp.type === 'flight') {
      insertTable = 'member_flights'
      payload = { ...payload, airline: d.airline, flight_number: d.flight_number, departure_airport: d.departure_airport, arrival_airport: d.arrival_airport, departure_time: d.departure_time, arrival_time: d.arrival_time, notes: d.notes }
    } else if (imp.type === 'lodging') {
      insertTable = 'member_lodging'
      payload = { ...payload, hotel_name: d.hotel_name, address: d.address, check_in: d.check_in, check_out: d.check_out, confirmation_code: d.confirmation_code, notes: d.notes }
    } else if (imp.type === 'rental_car') {
      insertTable = 'member_rental_cars'
      payload = { ...payload, company: d.company, confirmation_code: d.confirmation_code, pickup_location: d.pickup_location, pickup_time: d.pickup_time, dropoff_location: d.dropoff_location, dropoff_time: d.dropoff_time, notes: d.notes }
    } else return

    const { error: insertError } = await supabase.from(insertTable).insert(payload)
    if (insertError) { alert('Failed to add travel data: ' + insertError.message); return }

    await supabase.from('pending_imports').update({ status: 'assigned', assigned_event_id: eventId }).eq('id', importId)
    setImports(prev => prev.filter((i: any) => i.id !== importId))
    setAssigningId(null)
    setSelectedEventId('')
  }

  async function dismissImport(importId: string) {
    await supabase.from('pending_imports').update({ status: 'dismissed' }).eq('id', importId)
    setImports(prev => prev.filter((i: any) => i.id !== importId))
  }

  function copyImportEmail() {
    if (!importSlug) return
    navigator.clipboard.writeText(`${importSlug}@inbox.evnt.team`)
    setSlugCopied(true)
    setTimeout(() => setSlugCopied(false), 2000)
  }

  const getEmoji = (type: string) => {
    const types: Record<string, string> = {
      Birthday: '🎂', Bachelor: '🎉', Vacation: '☀️', Wedding: '💒', Holiday: '🎄', Other: '✨'
    }
    return types[type] || '✨'
  }

  const getCountdown = (dateStr: string) => {
    if (!dateStr) return null
    const eventDate = new Date(dateStr)
    if (isNaN(eventDate.getTime())) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return null
    if (diff === 0) return 'Today! 🎉'
    if (diff === 1) return 'Tomorrow!'
    return `${diff} days away`
  }

  const getInitials = () => {
    if (fullName) return fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    return user?.email?.[0]?.toUpperCase() || 'U'
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #1A1A1A' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button onClick={() => router.push('/prototype/dashboard')} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
          <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: '1px solid #2A2A2A', color: '#F0F0F0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '6px 14px', borderRadius: '8px' }}>
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {/* Avatar + Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>

          {/* Avatar with edit overlay */}
          <label style={{ cursor: editing ? 'pointer' : 'default', flexShrink: 0, position: 'relative', display: 'block', width: '72px', height: '72px' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#fff' }}>
                {getInitials()}
              </div>
            )}
            {editing && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: '22px', height: '22px', borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                ✏️
              </div>
            )}
            <input type="file" accept="image/*" disabled={!editing} style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const fileExt = file.name.split('.').pop()
                const filePath = `${user.id}.${fileExt}`
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
                if (uploadError) { alert(uploadError.message); return }
                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
                await supabase.from('profiles').upsert({ id: user.id, avatar_url: data.publicUrl })
                setProfile({ ...profile, avatar_url: data.publicUrl })
              }}
            />
          </label>

          {/* Name + email */}
          <div style={{ flex: 1 }}>
            {editing ? (
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                style={{ background: '#161616', border: '1px solid #FF4D00', borderRadius: '8px', padding: '8px 12px', fontSize: '18px', fontWeight: 700, color: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            ) : (
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{fullName || user?.email?.split('@')[0]}</div>
            )}
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{user?.email}</div>
          </div>
        </div>

        {editing && (
          <button onClick={saveProfile} disabled={saving} style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: '20px' }}>
            {saving ? 'Saving...' : 'Save Changes →'}
          </button>
        )}

        {/* Stats */}
        <div style={{ display: 'flex' }}>
          {[{ label: 'Events', value: events.length }, { label: 'Upcoming', value: events.length }, { label: 'Completed', value: 0 }].map((stat, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRight: i < 2 ? '1px solid #1A1A1A' : 'none' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#FF4D00' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginTop: '16px' }}>
          {['upcoming', 'past'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #FF4D00' : '2px solid transparent',
              color: activeTab === tab ? '#FF4D00' : '#666',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize'
            }}>
              {tab === 'upcoming' ? 'Upcoming Events' : 'Past Events'}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div style={{ padding: '20px 24px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px', border: '2px dashed #2A2A2A', borderRadius: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>No events yet</div>
            <button onClick={() => router.push('/prototype/dashboard')} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
              Create Your First Event →
            </button>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} onClick={() => router.push('/prototype/itinerary')} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '18px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                {getEmoji(event.event_type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{event.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{event.destination || 'No location'}{event.dates ? ` · ${event.dates}` : ''}</div>
                {getCountdown(event.dates) && (
                  <div style={{ marginTop: '6px', display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>
                    ⏳ {getCountdown(event.dates)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,230,118,0.15)', color: '#00E676' }}>{event.event_type}</div>
                <div style={{ fontSize: '18px', color: '#666' }}>→</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Travel Imports Section */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>TRAVEL IMPORTS</div>

        {/* Import email address card */}
        <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>📧</span>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Your Import Email</div>
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Forward flight, hotel, or car rental confirmations to this address to auto-import them.</div>
          {importSlug ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: '#FF4D00', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {importSlug}@inbox.evnt.team
              </div>
              <button onClick={copyImportEmail} style={{ background: slugCopied ? '#2A2A2A' : '#FF4D00', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {slugCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <button onClick={generateSlug} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer', width: '100%' }}>
              Generate My Import Email
            </button>
          )}
        </div>

        {/* Pending imports list */}
        {imports.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF4D00', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
              {imports.length} PENDING IMPORT{imports.length !== 1 ? 'S' : ''}
            </div>
            {imports.map((imp: any) => {
              const d = imp.parsed_data || {}
              const icon = imp.type === 'flight' ? '✈️' : imp.type === 'lodging' ? '🏨' : imp.type === 'rental_car' ? '🚗' : '📦'
              const title = imp.type === 'flight'
                ? `${d.airline || ''} ${d.flight_number || ''}`.trim() || 'Flight'
                : imp.type === 'lodging'
                ? d.hotel_name || 'Hotel'
                : imp.type === 'rental_car'
                ? d.company || 'Rental Car'
                : 'Unknown'
              const subtitle = imp.type === 'flight'
                ? `${d.departure_airport || '?'} → ${d.arrival_airport || '?'}`
                : imp.type === 'lodging'
                ? `${d.check_in || '?'} → ${d.check_out || '?'}`
                : imp.type === 'rental_car'
                ? `${d.pickup_location || '?'} → ${d.dropoff_location || '?'}`
                : imp.raw_subject || 'Could not parse'

              return (
                <div key={imp.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,77,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{subtitle}</div>
                    </div>
                    {imp.type === 'unknown' && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>Needs review</div>}
                  </div>
                  {d.confirmation_code && <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>Confirmation: {d.confirmation_code}</div>}

                  {assigningId === imp.id ? (
                    <div>
                      <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#F0F0F0', marginBottom: '10px', outline: 'none' }}>
                        <option value="">Select an event...</option>
                        {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => assignImport(imp.id, selectedEventId)} disabled={!selectedEventId} style={{ flex: 1, background: selectedEventId ? '#FF4D00' : '#333', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: selectedEventId ? 'pointer' : 'not-allowed' }}>Confirm</button>
                        <button onClick={() => { setAssigningId(null); setSelectedEventId('') }} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#888', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setAssigningId(imp.id)} style={{ flex: 1, background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Assign to Event</button>
                      <button onClick={() => dismissImport(imp.id)} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#666', cursor: 'pointer' }}>Dismiss</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {imports.length === 0 && importSlug && (
          <div style={{ textAlign: 'center', color: '#444', padding: '16px', fontSize: '13px' }}>No pending imports. Forward a confirmation email to get started.</div>
        )}
      </div>

      {/* Sign Out */}
      <div style={{ padding: '0 24px' }}>
        <button onClick={signOut} style={{ width: '100%', background: 'none', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 600, color: '#666', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', padding: '12px 0 24px' }}>
        {[
          { icon: '⌂', label: 'Home', path: '/prototype/dashboard' },
          { icon: '🗓', label: 'Itinerary', path: '/prototype/itinerary' },
          { icon: '🗳', label: 'Vote', path: '/prototype/vote' },
          { icon: '💬', label: 'Chat', path: '/prototype/chat' },
          { icon: '👤', label: 'Profile', path: '/prototype/profile', active: true },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: (item as any).active ? '#FF4D00' : '#666', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

    </main>
  )
}