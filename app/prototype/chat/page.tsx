'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Chat() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [events, setEvents] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/prototype'); return }
      setUser(user)

      // Get all events the user owns or is a member of
      const { data: ownedEvents } = await supabase
        .from('events')
        .select('id, name, event_type')
        .eq('owner_id', user.id)

      const { data: memberEvents } = await supabase
        .from('event_members')
        .select('event_id')
        .eq('user_email', user.email)

      const memberEventIds = (memberEvents || []).map((m: any) => m.event_id)
      const allEventIds = [
        ...((ownedEvents || []).map((e: any) => e.id)),
        ...memberEventIds
      ]

      // Build events lookup
      const eventsMap: Record<string, any> = {}
      ;(ownedEvents || []).forEach((e: any) => { eventsMap[e.id] = e })

      if (memberEventIds.length > 0) {
        const { data: memberEventData } = await supabase
          .from('events')
          .select('id, name, event_type')
          .in('id', memberEventIds)
        ;(memberEventData || []).forEach((e: any) => { eventsMap[e.id] = e })
      }
      setEvents(eventsMap)

      // Get all chat groups for those events
      if (allEventIds.length > 0) {
        const { data: groupsData } = await supabase
          .from('chat_groups')
          .select('*')
          .in('event_id', allEventIds)
          .order('created_at', { ascending: false })
        setGroups(groupsData || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeGroup) return
    async function loadMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('group_id', activeGroup.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    loadMessages()

    const sub = supabase.channel(`chat-page:${activeGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `group_id=eq.${activeGroup.id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [activeGroup])

  async function sendMessage() {
    if (!input.trim() || !activeGroup || !user) return
    setSending(true)
    await supabase.from('chat_messages').insert({
      group_id: activeGroup.id,
      event_id: activeGroup.event_id,
      user_id: user.id,
      user_email: user.email,
      content: input.trim()
    })
    setInput('')
    setSending(false)
  }

  const getEventEmoji = (type: string) => ({ Birthday: '🎂', Bachelor: '🎉', Vacation: '☀️', Wedding: '💒', Business: '💼', Other: '✨' } as any)[type] || '✨'

  // Group chats by event
  const groupedByEvent = groups.reduce((acc: any, group) => {
    const eventId = group.event_id
    if (!acc[eventId]) acc[eventId] = []
    acc[eventId].push(group)
    return acc
  }, {})

  if (activeGroup) {
    const eventName = events[activeGroup.event_id]?.name || 'Event'
    return (
      <main style={{ height: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => { setActiveGroup(null); setMessages([]) }} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '20px', cursor: 'pointer', padding: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{activeGroup.name}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{eventName}</div>
          </div>
          <button onClick={() => router.push(`/prototype/event?id=${activeGroup.event_id}`)} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '6px 10px', color: '#666', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
            View Event →
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px', fontSize: '13px' }}>No messages yet — say hi! 👋</div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.user_id === user?.id
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px' }}>
                  {!isMe && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                      {msg.user_email?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isMe && <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px', fontWeight: 600 }}>{msg.user_email}</div>}
                    <div style={{ background: isMe ? '#FF4D00' : '#1E1E1E', border: isMe ? 'none' : '1px solid #2A2A2A', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontSize: '14px', color: '#fff', lineHeight: 1.4 }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 16px 40px', borderTop: '1px solid #1A1A1A', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Message..."
            style={{ flex: 1, background: '#161616', border: '1px solid #2A2A2A', borderRadius: '24px', padding: '12px 16px', fontSize: '14px', color: '#fff', outline: 'none' }}
          />
          <button onClick={sendMessage} disabled={sending || !input.trim()} style={{ background: input.trim() ? '#FF4D00' : '#333', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '18px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>↑</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '100px' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>Messages</h1>
        <p style={{ color: '#666', fontSize: '13px' }}>All your event chats</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '60px' }}>Loading...</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '60px 24px', border: '2px dashed #2A2A2A', borderRadius: '14px', margin: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No chats yet</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>Create chat groups inside your events</div>
          <button onClick={() => router.push('/prototype/dashboard')} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            Go to Events →
          </button>
        </div>
      ) : (
        Object.entries(groupedByEvent).map(([eventId, eventGroups]: any) => {
          const event = events[eventId]
          if (!event) return null
          return (
            <div key={eventId}>
              {/* Event header */}
              <div
                onClick={() => router.push(`/prototype/event?id=${eventId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px 8px', cursor: 'pointer' }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  {getEventEmoji(event.event_type)}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF4D00', letterSpacing: '1px', textTransform: 'uppercase' }}>{event.name}</div>
                <div style={{ fontSize: '11px', color: '#444' }}>→</div>
              </div>

              {/* Chat groups for this event */}
              {eventGroups.map((group: any) => (
                <div key={group.id} onClick={() => setActiveGroup(group)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderBottom: '1px solid #1A1A1A', cursor: 'pointer' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,77,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>💬</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{group.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Tap to open</div>
                  </div>
                  {group.auto_created && (
                    <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>AUTO</div>
                  )}
                  <div style={{ fontSize: '16px', color: '#444' }}>→</div>
                </div>
              ))}
            </div>
          )
        })
      )}

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', padding: '12px 0 24px' }}>
        {[
          { icon: '⌂', label: 'Home', path: '/prototype/dashboard' },
          { icon: '🗓', label: 'Itinerary', path: '/prototype/itinerary' },
          { icon: '🗳', label: 'Vote', path: '/prototype/vote' },
          { icon: '💬', label: 'Chat', path: '/prototype/chat', active: true },
          { icon: '👤', label: 'Profile', path: '/prototype/profile' },
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