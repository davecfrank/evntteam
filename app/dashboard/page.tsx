'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { usePWAInstall } from '../components/PWAInstallProvider'

export default function Dashboard() {
  const router = useRouter()
  const { signalHighIntent } = usePWAInstall()
  const [showModal, setShowModal] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [destination, setDestination] = useState('')
  const [dates, setDates] = useState('')
  const [endDate, setEndDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventType, setEventType] = useState('Birthday')
  const [invitePermission, setInvitePermission] = useState('admin_only')
  const [requiresTravel, setRequiresTravel] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [votingEnabled, setVotingEnabled] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [pendingImportsCount, setPendingImportsCount] = useState(0)
  const dateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)

  const eventTypes = [
    { label: 'Birthday', emoji: '🎂' },
    { label: 'Bachelor / Bachelorette', emoji: '🎉' },
    { label: 'Vacation', emoji: '☀️' },
    { label: 'Wedding', emoji: '💒' },
    { label: 'Business', emoji: '💼' },
    { label: 'Other', emoji: '✨' },
  ]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: profileData } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
      if (profileData) setProfile(profileData)
      const { count } = await supabase.from('pending_imports').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending')
      setPendingImportsCount(count || 0)
      // Fetch events the user owns
      const { data: ownedEvents } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch events the user is a member of
      const { data: memberships } = await supabase
        .from('event_members')
        .select('event_id')
        .eq('user_email', user.email)

      let memberEvents: any[] = []
      if (memberships && memberships.length > 0) {
        const memberEventIds = memberships.map(m => m.event_id)
        const { data: mEvents } = await supabase
          .from('events')
          .select('*')
          .in('id', memberEventIds)
          .order('created_at', { ascending: false })
        memberEvents = mEvents || []
      }

      // Combine and deduplicate (owner could also be a member)
      const ownedIds = new Set((ownedEvents || []).map(e => e.id))
      const combined = [
        ...(ownedEvents || []),
        ...memberEvents.filter(e => !ownedIds.has(e.id))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setEvents(combined)
      setLoading(false)
    }
    load()
  }, [])

  async function createEvent() {
    if (!name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('events')
      .insert({
        name, description: description || null, destination, dates,
        end_date: endDate || null,
        event_time: eventTime || null,
        event_type: eventType,
        invite_permission: invitePermission,
        owner_id: user.id,
        requires_flights: requiresTravel,
        requires_lodging: requiresTravel,
        requires_rental_cars: requiresTravel,
        payments_enabled: paymentsEnabled,
        voting_enabled: votingEnabled,
      })
      .select()
      .single()
    if (!error && data) {
      // Auto-create default group chat for the event
      await supabase.from('chat_groups').insert({
        event_id: data.id,
        name: 'Group Chat',
        created_by: user.id,
        auto_created: true,
      })
      setEvents(prev => [data, ...prev])
      setShowModal(false)
      setName(''); setDescription(''); setDestination(''); setDates(''); setEndDate('')
      setEventTime(''); setInvitePermission('admin_only')
      setRequiresTravel(false); setPaymentsEnabled(true); setVotingEnabled(true)
      signalHighIntent()
    }
    setSaving(false)
  }

  const getEmoji = (type: string) => eventTypes.find(e => e.label === type)?.emoji || '✨'

  const isEventPast = (event: any) => {
    const checkDate = event.end_date || event.dates
    if (!checkDate) return false
    const d = new Date(checkDate + 'T23:59:59')
    return !isNaN(d.getTime()) && d < new Date()
  }

  const upcomingEvents = events.filter(e => !isEventPast(e))
  const completedEvents = events.filter(e => isEventPast(e))
  const [showCompleted, setShowCompleted] = useState(false)

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

  const Toggle = ({ value, onChange, label, desc, color }: { value: boolean, onChange: (v: boolean) => void, label: string, desc: string, color: string }) => (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px',
        background: value ? `rgba(${color}, 0.08)` : '#0A0A0A',
        border: `1px solid ${value ? `rgb(${color})` : '#2A2A2A'}`,
        borderRadius: '10px', cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: value ? `rgb(${color})` : '#F0F0F0' }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{desc}</div>
      </div>
      <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: value ? `rgb(${color})` : '#2A2A2A', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: '12px' }}>
        <div style={{ position: 'absolute', top: '3px', left: value ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: 900 }}>Evnt<span style={{ color: '#FF4D00' }}>.Team</span></div>
        <div onClick={() => router.push('/profile')} style={{ position: 'relative', cursor: 'pointer' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
              {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          {pendingImportsCount > 0 && (
            <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#FF4D00', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff' }}>
              {pendingImportsCount}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            Hey {profile?.full_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {events.length === 0 ? 'No events yet — create your first one!' : `You have ${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div onClick={() => setShowModal(true)} style={{ background: '#FF4D00', borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '28px', boxShadow: '0 4px 16px rgba(255, 77, 0, 0.45)' }}>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>Create New Event</div>
          <div style={{ fontSize: '24px' }}>+</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px', border: '2px dashed #2A2A2A', borderRadius: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>No events yet</div>
            <div style={{ fontSize: '13px' }}>Tap "Create New Event" to get started</div>
          </div>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <>
                <div style={{ marginBottom: '12px', fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>Upcoming Events</div>
                {upcomingEvents.map(event => (
                  <div key={event.id} onClick={() => router.push(`/event?id=${event.id}`)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '18px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                      {getEmoji(event.event_type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{event.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{event.destination || 'No location'} {event.dates ? `· ${new Date(event.dates + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {getCountdown(event.dates) && (
                          <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>
                            ⏳ {getCountdown(event.dates)}
                          </div>
                        )}
                        {(event.requires_flights || event.requires_lodging) && (
                          <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(100,180,255,0.1)', color: '#64B4FF' }}>
                            🧳 Travel
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#666' }}>→</div>
                  </div>
                ))}
              </>
            )}
            {upcomingEvents.length === 0 && completedEvents.length > 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px' }}>No upcoming events</div>
              </div>
            )}
            {completedEvents.length > 0 && (
              <div style={{ marginTop: upcomingEvents.length > 0 ? '20px' : '0' }}>
                <div onClick={() => setShowCompleted(!showCompleted)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '10px', cursor: 'pointer', opacity: 0.6, marginBottom: showCompleted ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>✅</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#999' }}>Completed Events</span>
                    <span style={{ fontSize: '11px', color: '#555' }}>({completedEvents.length})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{showCompleted ? '▲' : '▼'}</div>
                </div>
                {showCompleted && completedEvents.map(event => (
                  <div key={event.id} onClick={() => router.push(`/event?id=${event.id}`)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '18px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                      {getEmoji(event.event_type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{event.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{event.destination || 'No location'} {event.dates ? `· ${new Date(event.dates + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#666' }}>→</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>Create Event ✦</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Event Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Mike's 30th Birthday" style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell your guests what this event is about..." rows={3} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '70px', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Destination</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Nashville, TN" style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Start Date</label>
                <input ref={dateRef} type="date" value={dates} onChange={e => setDates(e.target.value)} onClick={() => { try { dateRef.current?.showPicker() } catch {} }} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark', cursor: 'pointer' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>End Date</label>
                <input ref={endDateRef} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onClick={() => { try { endDateRef.current?.showPicker() } catch {} }} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Event Time</label>
              <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Event Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {eventTypes.map(type => (
                  <div key={type.label} onClick={() => setEventType(type.label)} style={{ padding: '10px', background: eventType === type.label ? 'rgba(255,77,0,0.15)' : '#0A0A0A', border: `1px solid ${eventType === type.label ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{type.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: eventType === type.label ? '#FF4D00' : '#666' }}>{type.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
  <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Who Can Invite?</label>
  <div style={{ display: 'flex', gap: '8px' }}>
    {[
      { value: 'admin_only', label: '👑 Host', desc: 'Only you' },
      { value: 'cohost', label: '⭐ Co-hosts', desc: 'Host + co-hosts' },
      { value: 'anyone', label: '👥 Anyone', desc: 'All members' },
    ].map(option => (
      <div key={option.value} onClick={() => setInvitePermission(option.value)} style={{ flex: 1, padding: '10px 8px', background: invitePermission === option.value ? 'rgba(255,77,0,0.15)' : '#0A0A0A', border: `1px solid ${invitePermission === option.value ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', marginBottom: '4px' }}>{option.label}</div>
        <div style={{ fontSize: '10px', color: invitePermission === option.value ? '#FF4D00' : '#666', fontWeight: 600 }}>{option.desc}</div>
      </div>
    ))}
  </div>
</div>

<div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
  <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>Event Features</label>
  <Toggle value={requiresTravel} onChange={setRequiresTravel} label="🧳 Is travel required?" desc="Enable flights, lodging & rental car tracking" color="100, 180, 255" />
  <Toggle value={paymentsEnabled} onChange={setPaymentsEnabled} label="💰 Enable payment tracking?" desc="Split bills and track group expenses" color="0, 230, 118" />
  <Toggle value={votingEnabled} onChange={setVotingEnabled} label="🗳 Enable voting for itinerary items?" desc="Let members vote on activities" color="255, 214, 0" />
</div>

            <button onClick={createEvent} disabled={saving || !name.trim()} style={{ width: '100%', background: saving || !name.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !name.trim() ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
              {saving ? 'Creating...' : 'Create Event →'}
            </button>
            <button onClick={() => setShowModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}