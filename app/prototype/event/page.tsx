'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../../lib/supabase'

function EventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')

  const [user, setUser] = useState<any>(null)
  const [event, setEvent] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [linkCopied, setLinkCopied] = useState(false)

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

  const isHost = event?.owner_id === user?.id
  const canInvite = isHost || event?.invite_permission === 'anyone'

  const getCountdown = (dateStr: string) => {
    if (!dateStr) return null
    const eventDate = new Date(dateStr)
    if (isNaN(eventDate.getTime())) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'Past event'
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
    await supabase.from('event_members').insert({
      event_id: eventId,
      user_email: inviteEmail.trim(),
      role: 'member'
    })
    setMembers(prev => [...prev, { user_email: inviteEmail.trim(), role: 'member' }])
    setInviteEmail('')
    setInviteSuccess(true)
    setTimeout(() => setInviteSuccess(false), 3000)
    setInviting(false)
  }

  function shareViaText() {
    const message = `Hey! You're invited to ${event?.name}. Join here: https://evnt.team/invite/${eventId}`
    window.open(`sms:?body=${encodeURIComponent(message)}`)
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://evnt.team/invite/${eventId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
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
        {isHost && (
          <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>
            👑 Host
          </div>
        )}
      </div>

      {/* Event Hero */}
      <div style={{ padding: '24px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{getEmoji(event?.event_type)}</div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>{event?.name}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {event?.destination && (
            <div style={{ fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📍 {event.destination}
            </div>
          )}
          {event?.dates && (
            <div style={{ fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📅 {event.dates}
            </div>
          )}
        </div>
        {getCountdown(event?.dates) && (
          <div style={{ display: 'inline-block', fontSize: '13px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>
            ⏳ {getCountdown(event?.dates)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1A1A1A' }}>
        {['overview', 'itinerary', 'vote', 'chat', 'photos'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: activeTab === tab ? '2px solid #FF4D00' : '2px solid transparent',
            color: activeTab === tab ? '#FF4D00' : '#666',
            fontSize: '10px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            {tab === 'overview' ? '🏠' : tab === 'itinerary' ? '🗓' : tab === 'vote' ? '🗳' : tab === 'chat' ? '💬' : '📸'}
            <br />{tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '24px' }}>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Members */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  Members ({members.length + 1})
                </div>
                {canInvite && (
                  <button onClick={() => setShowInviteModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    + Invite
                  </button>
                )}
              </div>

              {/* Host */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#161616', borderRadius: '10px', marginBottom: '8px', border: '1px solid #2A2A2A' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.email}</div>
                  <div style={{ fontSize: '11px', color: '#FF4D00', fontWeight: 700 }}>👑 Host</div>
                </div>
              </div>

              {members.map((member, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#161616', borderRadius: '10px', marginBottom: '8px', border: '1px solid #2A2A2A' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                    {member.user_email?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{member.user_email}</div>
                    <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>Member · Invited</div>
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px', border: '2px dashed #2A2A2A', borderRadius: '10px' }}>
                  No members yet — invite your crew!
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '🗓', label: 'Itinerary', tab: 'itinerary' },
                { icon: '🗳', label: 'Vote', tab: 'vote' },
                { icon: '💬', label: 'Chat', tab: 'chat' },
                { icon: '📸', label: 'Photos', tab: 'photos' },
              ].map(action => (
                <div key={action.label} onClick={() => setActiveTab(action.tab)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{action.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{action.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'itinerary' && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗓</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Itinerary coming soon</div>
            <div style={{ fontSize: '13px' }}>Add activities, times and notes</div>
          </div>
        )}

        {activeTab === 'vote' && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗳</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Voting coming soon</div>
            <div style={{ fontSize: '13px' }}>Let your crew vote on activities</div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Chat coming soon</div>
            <div style={{ fontSize: '13px' }}>Message your crew</div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📸</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Photo album coming soon</div>
            <div style={{ fontSize: '13px' }}>Share and download memories</div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }}></div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Invite Friends</h2>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>Invite people to {event?.name}</p>

            {/* Share via Text */}
            <button onClick={shareViaText} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💬</span> Share via Text
            </button>

            {/* Copy Link */}
            <button onClick={copyLink} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: linkCopied ? '#00E676' : '#F0F0F0', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{linkCopied ? '✅' : '🔗'}</span> {linkCopied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }}></div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>OR INVITE BY EMAIL</div>
              <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }}></div>
            </div>

            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="friend@gmail.com"
              type="email"
              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
            />

            {inviteSuccess && (
              <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid #00E676', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '13px', color: '#00E676', fontWeight: 700, marginBottom: '12px' }}>
                ✅ Invite sent!
              </div>
            )}

            <button onClick={inviteByEmail} disabled={inviting || !inviteEmail.trim()} style={{ width: '100%', background: inviting || !inviteEmail.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: inviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
              {inviting ? 'Sending...' : 'Send Invite →'}
            </button>

            <button onClick={() => setShowInviteModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

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

    </main>
  )
}

export default function EventPageWrapper() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>Loading...</main>}>
      <EventPage />
    </Suspense>
  )
}