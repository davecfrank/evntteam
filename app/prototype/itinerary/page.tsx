'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const days = [
  {
    label: 'FRI Jun 13',
    items: [
      { time: '3PM', name: '🏨 Hotel Check-In', detail: 'Graduate Nashville · 8 rooms', status: 'booked' },
      { time: '6PM', name: '🥩 Prime 108 Dinner', detail: 'Private dining · 8 guests', status: 'booked' },
      { time: '10PM', name: '🎸 Broadway Bars', detail: '3 options · Vote still open', status: 'vote' },
    ]
  },
  {
    label: 'SAT Jun 14',
    items: [
      { time: '10AM', name: '🪓 Axe Throwing', detail: 'BATL Nashville · $35/person', status: 'vote' },
      { time: '2PM', name: '🏎 Go-Kart Racing', detail: 'Nashville Superspeedway', status: 'pending' },
      { time: '7PM', name: '🍕 Dinner', detail: 'Vote still open · 3 options', status: 'vote' },
    ]
  },
  {
    label: 'SUN Jun 15',
    items: [
      { time: '10AM', name: '🍳 Brunch', detail: 'TBD', status: 'pending' },
      { time: '12PM', name: '✈️ Departures', detail: 'Safe travels crew!', status: 'booked' },
    ]
  }
]

const statusStyle: Record<string, { label: string, bg: string, color: string }> = {
  booked: { label: 'Booked', bg: 'rgba(0,230,118,0.15)', color: '#00E676' },
  vote: { label: 'Vote Open', bg: 'rgba(255,214,0,0.15)', color: '#FFD600' },
  pending: { label: 'Pending', bg: 'rgba(255,255,255,0.05)', color: '#666' },
}

export default function Itinerary() {
  const router = useRouter()
  const [activeDay, setActiveDay] = useState(0)

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #1A1A1A' }}>
        <button onClick={() => router.push('/prototype/dashboard')} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', padding: 0 }}>← Back</button>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>Jake's Bach Party</h1>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>Nashville, TN · Jun 13–15 · 8 members</p>

        {/* Day tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }}>
          {days.map((day, i) => (
            <button key={i} onClick={() => setActiveDay(i)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
              background: activeDay === i ? '#FF4D00' : '#161616',
              border: activeDay === i ? 'none' : '1px solid #2A2A2A',
              color: activeDay === i ? '#fff' : '#666', cursor: 'pointer',
              fontFamily: 'monospace'
            }}>{day.label}</button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '20px 24px' }}>
        {days[activeDay].items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
            <div style={{ width: '40px', fontSize: '11px', color: '#666', paddingTop: '14px', textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>{item.time}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.status === 'booked' ? '#FF4D00' : '#2A2A2A', border: '2px solid #FF4D00', flexShrink: 0 }}></div>
              {i < days[activeDay].items.length - 1 && <div style={{ width: '2px', flex: 1, background: '#1A1A1A', marginTop: '4px', minHeight: '40px' }}></div>}
            </div>
            <div style={{ flex: 1, background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '14px', marginBottom: '0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.name}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: statusStyle[item.status].bg, color: statusStyle[item.status].color, flexShrink: 0, marginLeft: '8px' }}>
                  {statusStyle[item.status].label}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{item.detail}</div>
              {item.status === 'vote' && (
                <button onClick={() => router.push('/prototype/vote')} style={{ marginTop: '10px', background: 'rgba(255,214,0,0.1)', border: '1px solid rgba(255,214,0,0.3)', color: '#FFD600', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  Cast Your Vote →
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Activity */}
        <button style={{ width: '100%', background: 'none', border: '2px dashed #2A2A2A', borderRadius: '14px', padding: '16px', color: '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
          + Add Activity
        </button>
      </div>

    </main>
  )
}