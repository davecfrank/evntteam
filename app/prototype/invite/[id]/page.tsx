'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [alreadyMember, setAlreadyMember] = useState(false)

  const eventTypes: Record<string, string> = {
    'Birthday': '🎂',
    'Bachelor / Bachelorette': '🎉',
    'Vacation': '☀️',
    'Wedding': '💒',
    'Business': '💼',
    'Other': '✨',
  }

  useEffect(() => {
    async function load() {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError || !eventData) {
        setError('Event not found')
        setLoading(false)
        return
      }
      setEvent(eventData)

      // Fetch member count
      const { count } = await supabase
        .from('event_members')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
      setMemberCount((count || 0) + 1) // +1 for the host

      // Check if user is logged in
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)

        // Check if they're the owner
        if (eventData.owner_id === authUser.id) {
          router.push(`/prototype/event?id=${eventId}`)
          return
        }

        // Check if already a member
        const { data: membership } = await supabase
          .from('event_members')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_email', authUser.email)
          .maybeSingle()

        if (membership) {
          setAlreadyMember(true)
        }
      }

      setLoading(false)
    }
    load()
  }, [eventId, router])

  async function joinEvent() {
    if (!user) {
      // Store the invite URL so we can redirect back after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('evnt_invite_redirect', `/prototype/invite/${eventId}`)
      }
      router.push('/prototype')
      return
    }

    setJoining(true)
    const { error: joinError } = await supabase
      .from('event_members')
      .insert({
        event_id: eventId,
        user_email: user.email,
        role: 'Member',
        role_level: 'member',
      })

    if (joinError) {
      setError('Failed to join event. Please try again.')
      setJoining(false)
      return
    }

    router.push(`/prototype/event?id=${eventId}`)
  }

  function goToEvent() {
    router.push(`/prototype/event?id=${eventId}`)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '16px' }}>
            Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Loading invite...</div>
        </div>
      </main>
    )
  }

  if (error === 'Event not found' || !event) {
    return (
      <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '40px' }}>
          Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
        </div>
        <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Invite Not Found</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>
            This invite link may have expired or the event no longer exists.
          </p>
          <button
            onClick={() => router.push('/prototype')}
            style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
          >
            Go to Evnt.Team →
          </button>
        </div>
      </main>
    )
  }

  const emoji = eventTypes[event.event_type] || '✨'

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>

      {/* Logo */}
      <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '40px' }}>
        Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
      </div>

      {/* Invite Card */}
      <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 600, marginBottom: '12px' }}>You&apos;re invited to</div>
          <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 16px' }}>
            {emoji}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{event.name}</h1>
          <div style={{ color: '#666', fontSize: '14px' }}>
            {event.destination && <span>{event.destination}</span>}
            {event.destination && event.dates && <span> · </span>}
            {event.dates && (
              <span>{new Date(event.dates + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: event.requires_flights || event.requires_lodging ? '12px' : '0' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              👥
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{memberCount} {memberCount === 1 ? 'person' : 'people'} going</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{event.event_type}</div>
            </div>
          </div>

          {(event.requires_flights || event.requires_lodging) && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {event.requires_flights && (
                <div style={{ fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', background: 'rgba(100,180,255,0.1)', color: '#64B4FF' }}>
                  ✈️ Flights
                </div>
              )}
              {event.requires_lodging && (
                <div style={{ fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', background: 'rgba(180,100,255,0.1)', color: '#B464FF' }}>
                  🏨 Lodging
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {alreadyMember ? (
          <>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#00E676', fontWeight: 700, marginBottom: '16px' }}>
              You&apos;re already a member of this event
            </div>
            <button
              onClick={goToEvent}
              style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Open Event →
            </button>
          </>
        ) : user ? (
          <>
            <button
              onClick={joinEvent}
              disabled={joining}
              style={{ width: '100%', background: joining ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: joining ? 'not-allowed' : 'pointer', marginBottom: '12px' }}
            >
              {joining ? 'Joining...' : 'Join Event →'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
              Signed in as {user.email}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('evnt_invite_redirect', `/prototype/invite/${eventId}`)
                }
                router.push('/prototype')
              }}
              style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: '12px' }}
            >
              Sign Up to Join →
            </button>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
              Already have an account?{' '}
              <span
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('evnt_invite_redirect', `/prototype/invite/${eventId}`)
                  }
                  router.push('/prototype')
                }}
                style={{ color: '#FF4D00', cursor: 'pointer', fontWeight: 600 }}
              >
                Log In
              </span>
            </p>
          </>
        )}

        {error && error !== 'Event not found' && (
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#FF4D00', marginTop: '12px' }}>{error}</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#444' }}>
        Powered by Evnt.Team — Plan together, travel better.
      </div>
    </main>
  )
}