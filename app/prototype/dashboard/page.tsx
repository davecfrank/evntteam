'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [dates, setDates] = useState('')
  const [eventType, setEventType] = useState('Birthday')
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const eventTypes = [
    { label: 'Birthday', emoji: '🎂' },
    { label: 'Bachelor', emoji: '🎉' },
    { label: 'Vacation', emoji: '☀️' },
    { label: 'Wedding', emoji: '💒' },
    { label: 'Holiday', emoji: '🎄' },
    { label: 'Other', emoji: '✨' },
  ]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/prototype'); return }
      setUser(user)
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function createEvent() {
    if (!name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('events')
      .insert({ name, destination, dates, event_type: eventType, owner_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setEvents(prev => [data, ...prev])
      setShowModal(false)
      setName(''); setDestination(''); setDates('')
    }
    setSaving(false)
  }

  const getEmoji = (type: string) => eventTypes.find(e => e.label === type)?.emoji || '✨'

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: 900 }}>Evnt<span style={{ color: '#FF4D00' }}>.Team</span></div>
        <div onClick={() => supabase.auth.signOut().then(() => router.push('/prototype'))} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            Hey {user?.email?.split('@')[0]} 👋
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {events.length === 0 ? 'No events yet — create your first one!' : `You have ${events.length} upcoming event${events.length > 1 ? 's' : ''}`}
          </p>
        </div>

        <div onClick={() => setShowModal(true)} style={{ background: '#FF4D00', borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '28px' }}>
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
            <div style={{ marginBottom: '12px', fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>Your Events</div>
            {events.map(event => (
              <div key={event.id} onClick={() => router.push('/prototype/itinerary')} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '18px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                  {getEmoji(event.event_type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{event.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{event.destination || 'No location'} {event.dates ? `· ${event.dates}` : ''}</div>
                </div>
                <div style={{ fontSize: '18px', color: '#666' }}>→</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', padding: '12px 0 24px' }}>
        {[
          { icon: '⌂', label: 'Home', path: '/prototype/dashboard', active: true },
          { icon: '🗓', label: 'Plan', path: '/prototype/itinerary' },
          { icon: '🗳', label: 'Vote', path: '/prototype/vote' },
          { icon: '💬', label: 'Chat', path: '/prototype/chat' },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? '#FF4D00' : '#666', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }}></div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>Create Event ✦</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Event Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Mike's 30th Birthday" style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Destination</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Nashville, TN" style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Start Date</label>
    <input
      type="date"
      value={dates}
      onChange={e => setDates(e.target.value)}
      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
    />
  </div>
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>End Date</label>
    <input
      type="date"
      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
    />
  </div>
</div>

<div style={{ marginBottom: '14px' }}>
  <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Event Time</label>
  <input
    type="time"
    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
  />
</div>

            <div style={{ marginBottom: '20px' }}>
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

            <button onClick={createEvent} disabled={saving || !name.trim()} style={{ width: '100%', background: saving || !name.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
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