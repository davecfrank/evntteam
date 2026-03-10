'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const rooms = [
  { id: 'main', name: 'The Crew — All 8 🎉', preview: 'Mike: Bro that bar has a mechanical bull 🤠', time: '2m', badge: 3, emoji: '🎉', color: 'rgba(255,77,0,0.15)' },
  { id: 'friday', name: 'Friday Night Squad 🌙', preview: 'Tyler: I land at 3:45, who\'s grabbing Uber?', time: '18m', badge: 1, emoji: '🌙', color: 'rgba(255,214,0,0.1)' },
  { id: 'hotel', name: 'Hotel Group — Marriott 🏨', preview: 'Dan: Check-in is at 3, rooms 401-408', time: '1h', badge: 0, emoji: '🏨', color: 'rgba(0,230,118,0.1)' },
]

const initialMessages: Record<string, { me: boolean, sender?: string, text: string, time: string }[]> = {
  main: [
    { me: false, sender: 'Mike 🍺', text: 'Yo who voted on the bars yet? We need to lock it in', time: '9:14 AM' },
    { me: false, sender: 'Tyler ✈️', text: 'I voted. Whiskey Row is the move 🤠', time: '9:17 AM' },
    { me: true, text: 'Same. Also added axe throwing Saturday morning. Check the itinerary 🪓', time: '9:22 AM' },
    { me: false, sender: 'Dan 🏨', text: 'Bro that bar has a mechanical bull 🤠 we HAVE to', time: '9:38 AM' },
  ],
  friday: [
    { me: false, sender: 'Tyler ✈️', text: 'I land at 3:45, who\'s grabbing Uber from airport?', time: '9:01 AM' },
    { me: true, text: 'I land at 3:20 — same terminal?', time: '9:05 AM' },
    { me: false, sender: 'Tyler ✈️', text: 'Terminal C! Let\'s split an Uber to the hotel 🙌', time: '9:08 AM' },
  ],
  hotel: [
    { me: false, sender: 'Dan 🏨', text: 'Check-in is at 3, rooms 401 through 408', time: '8:45 AM' },
    { me: true, text: 'Got it. Pre-gaming in 406 before dinner 🥃', time: '8:50 AM' },
  ],
}

export default function Chat() {
  const router = useRouter()
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')

  function sendMessage() {
    if (!input.trim() || !activeRoom) return
    const now = new Date()
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} AM`
    setMessages(prev => ({
      ...prev,
      [activeRoom]: [...prev[activeRoom], { me: true, text: input.trim(), time }]
    }))
    setInput('')
  }

  if (activeRoom) {
    const room = rooms.find(r => r.id === activeRoom)!
    return (
      <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => setActiveRoom(null)} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '20px', cursor: 'pointer', padding: 0 }}>←</button>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{room.name}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Jake's Bach Party</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages[activeRoom].map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.me ? 'flex-end' : 'flex-start', maxWidth: '75%', alignSelf: msg.me ? 'flex-end' : 'flex-start' }}>
              {!msg.me && <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>{msg.sender}</div>}
              <div style={{ padding: '10px 14px', borderRadius: msg.me ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '13px', lineHeight: '1.5', background: msg.me ? '#FF4D00' : '#161616', border: msg.me ? 'none' : '1px solid #2A2A2A' }}>
                {msg.text}
              </div>
              <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontFamily: 'monospace' }}>{msg.time}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 16px 32px', borderTop: '1px solid #1A1A1A', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Message the crew..."
            style={{ flex: 1, background: '#161616', border: '1px solid #2A2A2A', borderRadius: '22px', padding: '10px 16px', fontSize: '13px', color: '#fff', outline: 'none', fontFamily: 'sans-serif' }}
          />
          <button onClick={sendMessage} style={{ width: '38px', height: '38px', background: '#FF4D00', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', color: '#fff', flexShrink: 0 }}>↑</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '80px' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>Messages</h1>
        <p style={{ color: '#666', fontSize: '13px' }}>Jake's Bach Party · Nashville</p>
      </div>

      <div style={{ paddingTop: '8px' }}>
        {rooms.map(room => (
          <div key={room.id} onClick={() => setActiveRoom(room.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid #1A1A1A', cursor: 'pointer' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: room.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{room.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{room.name}</div>
              <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.preview}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
              <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>{room.time}</div>
              {room.badge > 0 && <div style={{ background: '#FF4D00', color: '#fff', fontSize: '10px', fontWeight: 700, minWidth: '18px', height: '18px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{room.badge}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', padding: '12px 0 24px' }}>
        {[
          { icon: '⌂', label: 'Home', path: '/prototype/dashboard' },
          { icon: '🗓', label: 'Itinerary', path: '/prototype/itinerary' },
          { icon: '🗳', label: 'Vote', path: '/prototype/vote' },
          { icon: '💬', label: 'Chat', path: '/prototype/chat', active: true },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? '#FF4D00' : '#666', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </main>
  )
}