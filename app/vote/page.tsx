'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const voteItems = [
  {
    id: 1, category: '🌙 Friday Night Bars', title: 'Whiskey Row',
    detail: 'Famous honky-tonk strip · 4 bars in one row',
    votes: 4, total: 8, pct: 80
  },
  {
    id: 2, category: '🌙 Friday Night Bars', title: 'The Stage on Broadway',
    detail: 'Live country music nightly · No cover',
    votes: 2, total: 8, pct: 40
  },
  {
    id: 3, category: '🪓 Saturday Morning', title: 'BATL Axe Throwing',
    detail: 'Professional lanes · 90 min · $35/person',
    votes: 3, total: 8, pct: 60
  },
]

const pollOptions = [
  { id: 1, label: '🍕 Skull\'s Rainbow Room', pct: 55 },
  { id: 2, label: '🥩 The Stillery', pct: 30 },
  { id: 3, label: '🍺 Jason Aldean\'s', pct: 15 },
]

export default function Vote() {
  const router = useRouter()
  const [voted, setVoted] = useState<Record<number, 'up' | 'down'>>({})
  const [pollVote, setPollVote] = useState<number | null>(null)

  function castVote(id: number, dir: 'up' | 'down') {
    setVoted(prev => ({ ...prev, [id]: prev[id] === dir ? undefined as any : dir }))
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', padding: 0 }}>← Back</button>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>Group Vote</h1>
        <p style={{ color: '#666', fontSize: '13px' }}>5 of 8 members have voted</p>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Deadline notice */}
        <div style={{ background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡</span> 3 votes still pending · Deadline Fri 8PM
        </div>

        {/* Vote Cards */}
        {voteItems.map(item => (
          <div key={item.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#FF4D00', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>{item.category}</div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{item.detail}</div>
            </div>
            <div style={{ height: '3px', background: '#2A2A2A' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #FF4D00, #FFD600)', width: `${item.pct}%`, transition: 'width 0.5s' }}></div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>{item.votes}/{item.total} votes · {item.pct}%</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => castVote(item.id, 'down')} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '16px', background: voted[item.id] === 'down' ? 'rgba(255,77,0,0.4)' : 'rgba(255,77,0,0.1)' }}>👎</button>
                <button onClick={() => castVote(item.id, 'up')} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '16px', background: voted[item.id] === 'up' ? '#00E676' : 'rgba(0,230,118,0.15)' }}>👍</button>
              </div>
            </div>
          </div>
        ))}

        {/* Poll */}
        <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFD600', letterSpacing: '1px', marginBottom: '12px' }}>📊 POLL: Saturday Dinner Spot?</div>
          {pollOptions.map(opt => (
            <div key={opt.id} onClick={() => setPollVote(opt.id)} style={{ position: 'relative', padding: '10px 12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', border: `1px solid ${pollVote === opt.id ? 'rgba(0,230,118,0.4)' : '#2A2A2A'}`, background: '#0A0A0A', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${opt.pct}%`, background: pollVote === opt.id ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.03)', transition: 'width 0.5s' }}></div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>{opt.label}</span>
                <span style={{ color: '#666', fontFamily: 'monospace', fontSize: '11px' }}>{opt.pct}%</span>
              </div>
            </div>
          ))}
          <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', fontFamily: 'monospace' }}>5 votes · closes in 2 days</div>
        </div>
      </div>

    </main>
  )
}