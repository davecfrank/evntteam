'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../../lib/supabase'

function EventDetail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')

  const [event, setEvent] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/prototype'); return }
      setUser(user)

      if (!eventId) { router.push('/prototype/dashboard'); return }

      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!eventData) { router.push('/prototype/dashboard'); return }
      setEvent(eventData)

      const { data: membersData } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)

      setMembers(membersData || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  const isAdmin = event?.owner_id === user?.id
  const canInvite = isAdmin || event?.invite_permission === 'anyone'

  const getCountdown = (dateStr: string) => {
    if (!dateStr) return null
    const eventDate = new Date(dateStr)
    if (isNaN(eventDate.getTime())) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'Event passed'
    if (diff === 0) return 'Today! 🎉'
    if (diff === 1) return 'Tomorrow!'
    return `${diff} days away`
  }

  const getEmoji = (type: string) => {
    const types: Record<string, string> = {
      Birthday: '🎂', Bachelor: '🎉', Vacation: '☀️', Wedding: '💒', Holiday: '🎄', Other: '✨'
    }
    return types[type] || '✨'
  }

  async function inviteByEmail() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const { error } = await supabase
      .from('event_members')
      .insert({ event_id: eventId, user_email: inviteEmail.trim(), role: 'member' })
    if (!error) {
      setMembers(prev => [...prev, { user_email: inviteEmail.trim(), role: 'member' }])
      setInviteSuccess(true)
      setInviteEmail('')
      setTimeout(() => setInviteSuccess(false), 3000)
    }
    setInviting(false)
  }

  function shareViaText() {
    const message = `Hey! You're invited to ${event.name}${event.destination ? ` in ${event.destination}` : ''}${event.dates ? ` on ${event.dates}` : ''}. Join here: https://evnt.team/invite/${eventId}`
    window.open(`sms:&body=${encodeURIComponent(message)}`)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/prototype/dashboard')} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
        {isAdmin && (
          <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,215,0,0.15)', color: '#FFD600' }}>👑 Admin</div>
        )}
      </div>

      {/* Event Hero */}
      <div style={{ padding: '28px 24px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{getEmoji(event.event_type)}</div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>{event.name}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {event.destination && (
            <div style={{ fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📍 {event.destination}
            </div>
          )}
          {event.dates && (
            <div style={{ fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📅 {event.dates}
            </div>
          )}
        </div>
        {getCountdown(event.dates) && (
          <div style={{ display: 'inline-block', fontSize: '13px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>
            ⏳ {getCountdown(event.dates)}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { icon: '🗓', label: 'Itinerary', path: '/prototype/itinerary' },
            { icon: '🗳', label: 'Vote', path: '/prototype/vote' },
            { icon: '💬', label: 'Chat', path: '/prototype/chat' },
          ].map(action => (
            <div key={action.label} onClick={() => router.push(action.path)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px 10px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{action.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888' }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Members ({members.length + 1})
          </div>
          {canInvite && (
            <button onClick={() => setShowInviteModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              + Invite
            </button>
          )}
        </div>

        {/* Owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.email}</div>
            <div style={{ fontSize: '11px', color: '#FFD600' }}>👑 Admin</div>
          </div>
        </div>

        {/* Invited Members */}
        {members.map((member, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
              {member.user_email?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{member.user_email}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Invited</div>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '20px', border: '2px dashed #2A2A2A', borderRadius: '12px', fontSize: '13px' }}>
            No members yet — invite your crew!
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', padding: '12px 0 24px' }}>
        {[
          { icon: '⌂', label: 'Home', path: '/prototype/dashboard' },
          { icon: '🗓', label: 'Plan', path: '/prototype/itinerary' },
          { icon: '🗳', label: 'Vote', path: '/prototype/vote' },
          { icon: '💬', label: 'Chat', path: '/prototype/chat' },
          { icon: '👤', label: 'Profile', path: '/prototype/profile' },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }}></div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>Invite Friends 🎉</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>Share a link or invite by email</p>

            {/* Share via Text */}
            <button onClick={shareViaText} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💬</span> Share via Text
            </button>

            {/* Share via Copy Link */}
            <button onClick={() => {
              navigator.clipboard.writeText(`https://evnt.team/invite/${eventId}`)
              alert('Link copied!')
            }} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔗</span> Copy Invite Link
            </button>

            <div style={{ height: '1px', background: '#2A2A2A', marginBottom: '20px' }}></div>

            {/* Invite by Email */}
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Invite by Email</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="friend@email.com"
                type="email"
                style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none' }}
              />
              <button onClick={inviteByEmail} disabled={inviting || !inviteEmail.trim()} style={{ background: inviting || !inviteEmail.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {inviting ? '...' : 'Send'}
              </button>
            </div>

            {inviteSuccess && (
              <div style={{ background: 'rgba(0,230,118,0.15)', border: '1px solid #00E676', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#00E676', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
                ✓ Invite sent!
              </div>
            )}

            <button onClick={() => setShowInviteModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function EventPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>Loading...</main>}>
      <EventDetail />
    </Suspense>
  )
}