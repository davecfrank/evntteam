'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { usePWAInstall } from '../components/PWAInstallProvider'

const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }

const PHOTO_REACTIONS = ['❤️', '😂', '🔥', '😍', '👏', '🤩']
const COMMENT_REACTIONS = ['👍', '👎', '🔥', '😂', '❤️', '😮']

function formatTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ScrollColumn({ items, selected, onChange, width }: { items: string[], selected: number, onChange: (i: number) => void, width?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const itemH = 40
  const isScrolling = useRef(false)
  useEffect(() => {
    if (ref.current && !isScrolling.current) {
      ref.current.scrollTop = selected * itemH
    }
  }, [selected])
  function handleScroll() {
    if (!ref.current) return
    isScrolling.current = true
    const idx = Math.round(ref.current.scrollTop / itemH)
    if (idx >= 0 && idx < items.length && idx !== selected) onChange(idx)
    clearTimeout((ref.current as any)._t)
    ;(ref.current as any)._t = setTimeout(() => { isScrolling.current = false }, 150)
  }
  return (
    <div style={{ position: 'relative', height: `${itemH * 3}px`, flex: width || 1, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: `${itemH}px`, left: 0, right: 0, height: `${itemH}px`, background: 'rgba(255,77,0,0.12)', border: '1px solid rgba(255,77,0,0.3)', borderRadius: '8px', pointerEvents: 'none', zIndex: 1 }} />
      <div ref={ref} onScroll={handleScroll} style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', paddingTop: `${itemH}px`, paddingBottom: `${itemH}px`, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {items.map((item, i) => (
          <div key={i} onClick={() => { onChange(i); if (ref.current) ref.current.scrollTop = i * itemH }} style={{ height: `${itemH}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', fontSize: '16px', fontWeight: 700, color: i === selected ? '#FF4D00' : '#555', cursor: 'pointer', transition: 'color 0.15s' }}>{item}</div>
        ))}
      </div>
    </div>
  )
}

function ScrollTimePicker({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) {
  let h12 = 12, min = 0, ap = 0
  if (value) {
    const [h, m] = value.split(':').map(Number)
    min = m; ap = h >= 12 ? 1 : 0; h12 = h % 12 || 12
  }
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const mins = [0, 15, 30, 45]
  const ampms = ['AM', 'PM']
  const hIdx = hours.indexOf(h12)
  const mIdx = mins.indexOf(min) >= 0 ? mins.indexOf(min) : 0
  function build(hi: number, mi: number, ai: number) {
    let h24 = hours[hi] % 12; if (ai === 1) h24 += 12
    return `${h24.toString().padStart(2, '0')}:${mins[mi].toString().padStart(2, '0')}`
  }
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '2px', background: '#0A0A0A', borderRadius: '10px', border: '1px solid #2A2A2A', padding: '4px', overflow: 'hidden' }}>
        <ScrollColumn items={hours.map(String)} selected={hIdx} onChange={i => onChange(build(i, mIdx, ap))} />
        <ScrollColumn items={mins.map(m => ':' + m.toString().padStart(2, '0'))} selected={mIdx} onChange={i => onChange(build(hIdx, i, ap))} />
        <ScrollColumn items={ampms} selected={ap} onChange={i => onChange(build(hIdx, mIdx, i))} />
      </div>
    </div>
  )
}


function ToggleRow({ value, onChange, label, desc, color, bg }: any) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: value ? bg : '#0A0A0A', border: `1px solid ${value ? color : '#2A2A2A'}`, borderRadius: '10px', cursor: 'pointer' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: value ? color : '#F0F0F0' }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{desc}</div>
      </div>
      <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: value ? color : '#2A2A2A', position: 'relative', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: '3px', left: value ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </div>
    </div>
  )
}

function ItineraryTab({ eventId, user, event, members, setActiveTab, canInteract, votingEnabled }: { eventId: string, user: any, event: any, members: any[], setActiveTab: (tab: string) => void, canInteract: boolean, votingEnabled: boolean }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('activity')
  const [isVotable, setIsVotable] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [confirmMode, setConfirmMode] = useState<'auto' | 'manual'>('manual')
  const [saving, setSaving] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const categories = [
    { value: 'activity', label: '🎯 Activity' },
    { value: 'food', label: '🍽 Food' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'lodging', label: '🏨 Lodging' },
    { value: 'flight', label: '✈️ Flight' },
    { value: 'other', label: '✨ Other' },
  ]

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('itinerary_items').select('*').eq('event_id', eventId).order('date', { ascending: true }).order('start_time', { ascending: true })
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  function resetForm() {
    setTitle(''); setDescription(''); setNotes(''); setDate('')
    setStartTime(''); setEndTime(''); setLocation('')
    setCategory('activity'); setIsVotable(false); setIsBooked(false); setConfirmMode('manual'); setEditItem(null)
  }

  async function saveItem() {
    if (!title.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, title, description, notes, date, start_time: startTime, end_time: endTime, location, category, is_votable: isVotable, is_booked: isBooked, confirm_mode: confirmMode, created_by: user.id }
    if (editItem) {
      const { data } = await supabase.from('itinerary_items').update(payload).eq('id', editItem.id).select().single()
      if (data) setItems(prev => prev.map(i => i.id === editItem.id ? data : i))
    } else {
      const { data } = await supabase.from('itinerary_items').insert(payload).select().single()
      if (data) setItems(prev => [...prev, data])
    }
    resetForm(); setShowAddModal(false); setSaving(false)
  }

  async function deleteItem(id: string) {
    await supabase.from('itinerary_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function openEdit(item: any) {
    setEditItem(item); setTitle(item.title || ''); setDescription(item.description || '')
    setNotes(item.notes || ''); setDate(item.date || ''); setStartTime(item.start_time || '')
    setEndTime(item.end_time || ''); setLocation(item.location || '')
    setCategory(item.category || 'activity'); setIsVotable(item.is_votable || false)
    setIsBooked(item.is_booked || false); setConfirmMode(item.confirm_mode || 'manual'); setShowAddModal(true)
  }

  const getCategoryEmoji = (cat: string) => categories.find(c => c.value === cat)?.label.split(' ')[0] || '✨'
  function isPast(item: any): boolean {
    if (!item.date) return false
    const now = new Date()
    if (item.end_time) return new Date(`${item.date}T${item.end_time}`) < now
    if (item.start_time) return new Date(`${item.date}T${item.start_time}`) < now
    const endOfDay = new Date(`${item.date}T23:59:59`)
    return endOfDay < now
  }
  const confirmedItems = items.filter(item => !item.is_votable || item.is_booked)
  const pastItems = confirmedItems.filter(item => isPast(item))
  const upcomingItems = confirmedItems.filter(item => !isPast(item))
  const [showPastActivities, setShowPastActivities] = useState(false)
  const pendingVoteCount = items.filter(item => item.is_votable && !item.is_booked).length
  const grouped = upcomingItems.reduce((acc: any, item) => {
    const key = item.date || 'No Date'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>{confirmedItems.length} {confirmedItems.length === 1 ? 'Item' : 'Items'}</div>
        {canInteract && <button onClick={() => { resetForm(); setShowAddModal(true) }} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>+ Add Item</button>}
      </div>
      {votingEnabled && pendingVoteCount > 0 && (
        <div onClick={() => setActiveTab('vote')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: '16px', background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.25)', borderRadius: '10px', cursor: 'pointer' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFD600' }}>🗳 {pendingVoteCount} {pendingVoteCount === 1 ? 'item' : 'items'} up for vote</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFD600' }}>→</div>
        </div>
      )}
      {pastItems.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div onClick={() => setShowPastActivities(!showPastActivities)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '10px', cursor: 'pointer', opacity: 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>✅</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#999' }}>Past Activities</span>
              <span style={{ fontSize: '11px', color: '#555' }}>({pastItems.length})</span>
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>{showPastActivities ? '▲' : '▼'}</div>
          </div>
          {showPastActivities && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#111', borderRadius: '8px', border: '1px solid #1A1A1A' }}>
              {pastItems.map((item: any) => (
                <div key={item.id} onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} style={{ padding: '6px 0', borderBottom: '1px solid #1A1A1A', cursor: 'pointer', opacity: 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{getCategoryEmoji(item.category)}</span>
                    <span style={{ fontSize: '12px', color: '#888' }}>{item.title}</span>
                    {item.date && <span style={{ fontSize: '10px', color: '#444', marginLeft: 'auto' }}>{new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                  {expandedItem === item.id && (
                    <div style={{ padding: '8px 0 4px 22px' }}>
                      {item.start_time && <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>🕐 {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</div>}
                      {item.location && <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>📍 {item.location}</div>}
                      {item.description && <div style={{ fontSize: '11px', color: '#555' }}>{item.description}</div>}
                      {canInteract && <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer' }}>✏️ Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer' }}>🗑 Delete</button>
                      </div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {confirmedItems.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px', border: '2px dashed #2A2A2A', borderRadius: '14px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗓</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No itinerary items yet</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>Add activities, flights, lodging and more</div>
          {canInteract ? <button onClick={() => { resetForm(); setShowAddModal(true) }} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(255, 77, 0, 0.35)' }}>Add First Item →</button> : <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>RSVP &quot;Going&quot; to add items</div>}
        </div>
      ) : upcomingItems.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '24px' }}>
          <div style={{ fontSize: '13px' }}>No upcoming activities</div>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateItems]: any) => (
          <div key={date} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF4D00', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #1A1A1A' }}>
              {date === 'No Date' ? 'No Date' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {dateItems.map((item: any) => {
              return <div key={item.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
                <div onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '24px', flexShrink: 0 }}>{getCategoryEmoji(item.category)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.title}</div>
                      {item.is_votable && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>🗳 VOTE</div>}
                      {item.is_booked && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,230,118,0.15)', color: '#00E676' }}>✅ BOOKED</div>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {item.start_time && <span>🕐 {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</span>}
                      {item.location && <span>📍 {item.location}</span>}
                    </div>
                    {item.description && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{item.description}</div>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{expandedItem === item.id ? '▲' : '▼'}</div>
                </div>
                {expandedItem === item.id && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #1A1A1A' }}>
                    {item.description && <p style={{ fontSize: '13px', color: '#888', marginTop: '12px', marginBottom: '8px' }}>{item.description}</p>}
                    {item.notes && (
                      <div style={{ background: 'rgba(255,214,0,0.05)', border: '1px solid rgba(255,214,0,0.2)', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFD600', marginBottom: '4px' }}>📝 NOTES</div>
                        <div style={{ fontSize: '13px', color: '#888' }}>{item.notes}</div>
                      </div>
                    )}
                    {canInteract && <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEdit(item)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer' }}>✏️ Edit</button>
                      <button onClick={() => deleteItem(item.id)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer' }}>🗑 Delete</button>
                    </div>}
                  </div>
                )}
              </div>
            })}
          </div>
        ))
      )}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>{editItem ? 'Edit Item' : 'Add Itinerary Item'}</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Title *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Dinner at The Palm" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Date (optional)</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <ScrollTimePicker label="Start Time" value={startTime} onChange={setStartTime} />
              <ScrollTimePicker label="End Time" value={endTime} onChange={setEndTime} />
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Location (optional)</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="123 Main St" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Description (optional)</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Private notes, reminders, links..." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {votingEnabled && <ToggleRow value={isVotable} onChange={(val: boolean) => { setIsVotable(val); if (val) setIsBooked(false); if (!val) setConfirmMode('manual'); }} label="🗳 Open to Group Vote" desc="Let members vote on this item" color="#FFD600" bg="rgba(255,214,0,0.08)" />}
              {isVotable && (
                <div style={{ marginLeft: '16px', display: 'flex', gap: '8px' }}>
                  <div onClick={() => setConfirmMode('auto')} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', background: confirmMode === 'auto' ? 'rgba(255,214,0,0.12)' : '#0A0A0A', border: `1px solid ${confirmMode === 'auto' ? '#FFD600' : '#2A2A2A'}` }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: confirmMode === 'auto' ? '#FFD600' : '#666' }}>Auto-confirm</div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Confirms at majority vote</div>
                  </div>
                  <div onClick={() => setConfirmMode('manual')} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', background: confirmMode === 'manual' ? 'rgba(255,214,0,0.12)' : '#0A0A0A', border: `1px solid ${confirmMode === 'manual' ? '#FFD600' : '#2A2A2A'}` }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: confirmMode === 'manual' ? '#FFD600' : '#666' }}>Manual confirm</div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Host confirms manually</div>
                  </div>
                </div>
              )}
              <ToggleRow value={isBooked} onChange={(val: boolean) => { setIsBooked(val); if (val) { setIsVotable(false); setConfirmMode('manual'); } }} label="✅ Mark as Booked" desc="This item is confirmed" color="#00E676" bg="rgba(0,230,118,0.08)" />
            </div>
            <button onClick={saveItem} disabled={saving || !title.trim()} style={{ width: '100%', background: saving || !title.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !title.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !title.trim() ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
              {saving ? 'Saving...' : editItem ? 'Save Changes →' : 'Add to Itinerary →'}
            </button>
            <button onClick={() => { setShowAddModal(false); resetForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FlightCard({ flight, isOwn, onEdit, onDelete, getName }: { flight: any, isOwn: boolean, onEdit?: () => void, onDelete?: () => void, getName?: (e: string) => string }) {
  const fmt = (dt: string) => {
    if (!dt) return null
    try { return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return dt }
  }
  return (
    <div style={{ background: '#161616', border: `1px solid ${isOwn ? '#64B4FF33' : '#2A2A2A'}`, borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '20px' }}>✈️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{flight.airline} {flight.flight_number}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{getName ? getName(flight.user_email) : flight.user_email}</div>
          </div>
        </div>
        {isOwn && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onEdit} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#F0F0F0', cursor: 'pointer', fontWeight: 700 }}>✏️</button>
            <button onClick={onDelete} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#FF4D00', cursor: 'pointer', fontWeight: 700 }}>🗑</button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>{flight.departure_airport || '—'}</div>
          {fmt(flight.departure_time) && <div style={{ fontSize: '10px', color: '#666' }}>{fmt(flight.departure_time)}</div>}
        </div>
        <div style={{ flex: 1, height: '1px', background: '#2A2A2A', position: 'relative', margin: '0 8px' }}>
          <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px' }}>✈</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>{flight.arrival_airport || '—'}</div>
          {fmt(flight.arrival_time) && <div style={{ fontSize: '10px', color: '#666' }}>{fmt(flight.arrival_time)}</div>}
        </div>
      </div>
      {flight.notes && <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #1A1A1A', paddingTop: '8px' }}>📝 {flight.notes}</div>}
    </div>
  )
}


function LodgingCard({ lodging, isOwn, onEdit, onDelete }: { lodging: any, isOwn: boolean, onEdit?: () => void, onDelete?: () => void }) {
  return (
    <div style={{ background: '#161616', border: `1px solid ${isOwn ? '#B464FF33' : '#2A2A2A'}`, borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '28px' }}>🏨</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{lodging.hotel_name}</div>
            {lodging.address && <div style={{ fontSize: '12px', color: '#666' }}>📍 {lodging.address}</div>}
          </div>
        </div>
        {isOwn && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onEdit} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#F0F0F0', cursor: 'pointer', fontWeight: 700 }}>✏️</button>
            <button onClick={onDelete} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#FF4D00', cursor: 'pointer', fontWeight: 700 }}>🗑</button>
          </div>
        )}
      </div>
      {(lodging.check_in || lodging.check_out) && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
          {lodging.check_in && <div style={{ flex: 1, background: '#0A0A0A', borderRadius: '8px', padding: '8px 12px' }}><div style={{ fontSize: '10px', color: '#666', fontWeight: 700, marginBottom: '2px' }}>CHECK-IN</div><div style={{ fontSize: '13px', fontWeight: 700 }}>{lodging.check_in}</div></div>}
          {lodging.check_out && <div style={{ flex: 1, background: '#0A0A0A', borderRadius: '8px', padding: '8px 12px' }}><div style={{ fontSize: '10px', color: '#666', fontWeight: 700, marginBottom: '2px' }}>CHECK-OUT</div><div style={{ fontSize: '13px', fontWeight: 700 }}>{lodging.check_out}</div></div>}
        </div>
      )}
      {lodging.confirmation_code && (
        <div style={{ background: 'rgba(180,100,255,0.05)', border: '1px solid rgba(180,100,255,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#B464FF', fontWeight: 700, marginBottom: '2px' }}>CONFIRMATION</div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>{lodging.confirmation_code}</div>
        </div>
      )}
      {lodging.notes && <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #1A1A1A', paddingTop: '8px' }}>📝 {lodging.notes}</div>}
    </div>
  )
}

function RentalCarCard({ rental, isOwn, onEdit, onDelete, getName }: { rental: any, isOwn: boolean, onEdit?: () => void, onDelete?: () => void, getName?: (e: string) => string }) {
  const fmt = (dt: string) => {
    if (!dt) return null
    try { return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return dt }
  }
  return (
    <div style={{ background: '#161616', border: `1px solid ${isOwn ? 'rgba(74,222,128,0.2)' : '#2A2A2A'}`, borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '28px' }}>🚗</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{rental.company}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{getName ? getName(rental.user_email) : rental.user_email}</div>
          </div>
        </div>
        {isOwn && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onEdit} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#F0F0F0', cursor: 'pointer', fontWeight: 700 }}>✏️</button>
            <button onClick={onDelete} style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#FF4D00', cursor: 'pointer', fontWeight: 700 }}>🗑</button>
          </div>
        )}
      </div>
      {(rental.pickup_location || rental.dropoff_location) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 700 }}>{rental.pickup_location || '—'}</div>
            {fmt(rental.pickup_time) && <div style={{ fontSize: '10px', color: '#666' }}>{fmt(rental.pickup_time)}</div>}
          </div>
          <div style={{ fontSize: '16px', color: '#4ADE80' }}>→</div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 700 }}>{rental.dropoff_location || '—'}</div>
            {fmt(rental.dropoff_time) && <div style={{ fontSize: '10px', color: '#666' }}>{fmt(rental.dropoff_time)}</div>}
          </div>
        </div>
      )}
      {rental.confirmation_code && (
        <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#4ADE80', fontWeight: 700, marginBottom: '2px' }}>CONFIRMATION</div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>{rental.confirmation_code}</div>
        </div>
      )}
      {rental.notes && <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #1A1A1A', paddingTop: '8px' }}>📝 {rental.notes}</div>}
    </div>
  )
}

function TravelTab({ eventId, user, members, getName, isDesktop }: { eventId: string, user: any, members: any[], getName: (e: string) => string, isDesktop: boolean }) {
  const [activeSection, setActiveSection] = useState<'flights' | 'lodging' | 'rental'>('flights')
  const [loading, setLoading] = useState(true)

  // Flights state
  const [flights, setFlights] = useState<any[]>([])
  const [showFlightModal, setShowFlightModal] = useState(false)
  const [editFlight, setEditFlight] = useState<any>(null)
  const [airline, setAirline] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [departureAirport, setDepartureAirport] = useState('')
  const [arrivalAirport, setArrivalAirport] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [flightNotes, setFlightNotes] = useState('')

  // Lodging state
  const [lodgings, setLodgings] = useState<any[]>([])
  const [showLodgingModal, setShowLodgingModal] = useState(false)
  const [editLodging, setEditLodging] = useState<any>(null)
  const [hotelName, setHotelName] = useState('')
  const [address, setAddress] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [lodgingNotes, setLodgingNotes] = useState('')

  // Rental car state
  const [rentals, setRentals] = useState<any[]>([])
  const [showRentalModal, setShowRentalModal] = useState(false)
  const [editRental, setEditRental] = useState<any>(null)
  const [rentalCompany, setRentalCompany] = useState('')
  const [rentalConfirmation, setRentalConfirmation] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [dropoffTime, setDropoffTime] = useState('')
  const [rentalNotes, setRentalNotes] = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [f, l, r] = await Promise.all([
        supabase.from('member_flights').select('*').eq('event_id', eventId).order('departure_time', { ascending: true }),
        supabase.from('member_lodging').select('*').eq('event_id', eventId).order('check_in', { ascending: true }),
        supabase.from('member_rental_cars').select('*').eq('event_id', eventId).order('pickup_time', { ascending: true }),
      ])
      setFlights(f.data || [])
      setLodgings(l.data || [])
      setRentals(r.data || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  // Flight functions
  function resetFlightForm() {
    setAirline(''); setFlightNumber(''); setDepartureAirport(''); setArrivalAirport('')
    setDepartureTime(''); setArrivalTime(''); setFlightNotes(''); setEditFlight(null)
  }
  async function saveFlight() {
    if (!airline.trim() && !flightNumber.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, user_id: user.id, user_email: user.email, airline, flight_number: flightNumber, departure_airport: departureAirport, arrival_airport: arrivalAirport, departure_time: departureTime || null, arrival_time: arrivalTime || null, notes: flightNotes }
    if (editFlight) {
      const { data } = await supabase.from('member_flights').update(payload).eq('id', editFlight.id).select().single()
      if (data) setFlights(prev => prev.map(f => f.id === editFlight.id ? data : f))
    } else {
      const { data } = await supabase.from('member_flights').insert(payload).select().single()
      if (data) setFlights(prev => [...prev, data])
    }
    resetFlightForm(); setShowFlightModal(false); setSaving(false)
  }
  async function deleteFlight(id: string) {
    await supabase.from('member_flights').delete().eq('id', id)
    setFlights(prev => prev.filter(f => f.id !== id))
  }
  function openEditFlight(f: any) {
    setEditFlight(f); setAirline(f.airline || ''); setFlightNumber(f.flight_number || '')
    setDepartureAirport(f.departure_airport || ''); setArrivalAirport(f.arrival_airport || '')
    setDepartureTime(f.departure_time ? f.departure_time.slice(0, 16) : '')
    setArrivalTime(f.arrival_time ? f.arrival_time.slice(0, 16) : '')
    setFlightNotes(f.notes || ''); setShowFlightModal(true)
  }

  // Lodging functions
  function resetLodgingForm() {
    setHotelName(''); setAddress(''); setCheckIn(''); setCheckOut('')
    setConfirmationCode(''); setLodgingNotes(''); setEditLodging(null)
  }
  async function saveLodging() {
    if (!hotelName.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, user_id: user.id, user_email: user.email, hotel_name: hotelName, address, check_in: checkIn || null, check_out: checkOut || null, confirmation_code: confirmationCode, notes: lodgingNotes }
    if (editLodging) {
      const { data } = await supabase.from('member_lodging').update(payload).eq('id', editLodging.id).select().single()
      if (data) setLodgings(prev => prev.map(l => l.id === editLodging.id ? data : l))
    } else {
      const { data } = await supabase.from('member_lodging').insert(payload).select().single()
      if (data) setLodgings(prev => [...prev, data])
    }
    resetLodgingForm(); setShowLodgingModal(false); setSaving(false)
  }
  async function deleteLodging(id: string) {
    await supabase.from('member_lodging').delete().eq('id', id)
    setLodgings(prev => prev.filter(l => l.id !== id))
  }
  function openEditLodging(l: any) {
    setEditLodging(l); setHotelName(l.hotel_name || ''); setAddress(l.address || '')
    setCheckIn(l.check_in || ''); setCheckOut(l.check_out || '')
    setConfirmationCode(l.confirmation_code || ''); setLodgingNotes(l.notes || ''); setShowLodgingModal(true)
  }

  // Rental car functions
  function resetRentalForm() {
    setRentalCompany(''); setRentalConfirmation(''); setPickupLocation(''); setPickupTime('')
    setDropoffLocation(''); setDropoffTime(''); setRentalNotes(''); setEditRental(null)
  }
  async function saveRental() {
    if (!rentalCompany.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, user_id: user.id, user_email: user.email, company: rentalCompany, confirmation_code: rentalConfirmation, pickup_location: pickupLocation, pickup_time: pickupTime || null, dropoff_location: dropoffLocation, dropoff_time: dropoffTime || null, notes: rentalNotes }
    if (editRental) {
      const { data } = await supabase.from('member_rental_cars').update(payload).eq('id', editRental.id).select().single()
      if (data) setRentals(prev => prev.map(r => r.id === editRental.id ? data : r))
    } else {
      const { data } = await supabase.from('member_rental_cars').insert(payload).select().single()
      if (data) setRentals(prev => [...prev, data])
    }
    resetRentalForm(); setShowRentalModal(false); setSaving(false)
  }
  async function deleteRental(id: string) {
    await supabase.from('member_rental_cars').delete().eq('id', id)
    setRentals(prev => prev.filter(r => r.id !== id))
  }
  function openEditRental(r: any) {
    setEditRental(r); setRentalCompany(r.company || ''); setRentalConfirmation(r.confirmation_code || '')
    setPickupLocation(r.pickup_location || ''); setPickupTime(r.pickup_time ? r.pickup_time.slice(0, 16) : '')
    setDropoffLocation(r.dropoff_location || ''); setDropoffTime(r.dropoff_time ? r.dropoff_time.slice(0, 16) : '')
    setRentalNotes(r.notes || ''); setShowRentalModal(true)
  }

  const myFlights = flights.filter(f => f.user_id === user.id)
  const otherFlights = flights.filter(f => f.user_id !== user.id)
  const myLodgings = lodgings.filter(l => l.user_id === user.id)
  const otherLodgings = lodgings.filter(l => l.user_id !== user.id)
  const hotelGroups = otherLodgings.reduce((acc: any, l) => {
    const key = l.hotel_name || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})
  const myRentals = rentals.filter(r => r.user_id === user.id)
  const otherRentals = rentals.filter(r => r.user_id !== user.id)

  const sections = [
    { id: 'flights' as const, icon: '✈️', label: 'Flights', count: flights.length },
    { id: 'lodging' as const, icon: '🏨', label: 'Lodging', count: lodgings.length },
    { id: 'rental' as const, icon: '🚗', label: 'Rentals', count: rentals.length },
  ]

  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 200 }
  const modalCard: React.CSSProperties = { background: '#161616', borderRadius: isDesktop ? '16px' : '24px 24px 0 0', padding: '28px 24px 40px', width: isDesktop ? '480px' : '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      {/* Section toggle bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid #2A2A2A' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ flex: 1, padding: '12px 8px', background: 'none', border: 'none', borderBottom: activeSection === s.id ? '2px solid #FF4D00' : '2px solid transparent', color: activeSection === s.id ? '#F0F0F0' : '#666', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>{s.icon}</span> {s.label} {s.count > 0 && <span style={{ fontSize: '10px', background: activeSection === s.id ? 'rgba(255,77,0,0.15)' : '#2A2A2A', padding: '1px 6px', borderRadius: '8px', color: activeSection === s.id ? '#FF4D00' : '#666' }}>{s.count}</span>}
          </button>
        ))}
      </div>

      {/* ===== FLIGHTS SECTION ===== */}
      {activeSection === 'flights' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>✈️ Flight Details</div>
            <button onClick={() => { resetFlightForm(); setShowFlightModal(true) }} style={{ background: '#64B4FF', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(100, 180, 255, 0.35)' }}>
              + Add Flight
            </button>
          </div>
          {myFlights.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64B4FF', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>MY FLIGHTS</div>
              {myFlights.map(f => <FlightCard key={f.id} flight={f} isOwn onEdit={() => openEditFlight(f)} onDelete={() => deleteFlight(f.id)} getName={getName} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', border: '2px dashed #2A2A2A', borderRadius: '14px', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✈️</div>
              <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>Add your flight info</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Let the group know when you're arriving</div>
              <button onClick={() => { resetFlightForm(); setShowFlightModal(true) }} style={{ background: '#64B4FF', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(100, 180, 255, 0.35)' }}>Add My Flight →</button>
            </div>
          )}
          {otherFlights.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>GROUP FLIGHTS</div>
              {otherFlights.map(f => <FlightCard key={f.id} flight={f} isOwn={false} getName={getName} />)}
            </div>
          )}
        </div>
      )}

      {/* ===== LODGING SECTION ===== */}
      {activeSection === 'lodging' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>🏨 Lodging</div>
            <button onClick={() => { resetLodgingForm(); setShowLodgingModal(true) }} style={{ background: '#B464FF', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(180, 100, 255, 0.35)' }}>
              + Add Stay
            </button>
          </div>
          {myLodgings.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#B464FF', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>MY STAYS</div>
              {myLodgings.map(l => <LodgingCard key={l.id} lodging={l} isOwn onEdit={() => openEditLodging(l)} onDelete={() => deleteLodging(l.id)} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', border: '2px dashed #2A2A2A', borderRadius: '14px', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏨</div>
              <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>Add your lodging info</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Let the group know where you're staying</div>
              <button onClick={() => { resetLodgingForm(); setShowLodgingModal(true) }} style={{ background: '#B464FF', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(180, 100, 255, 0.35)' }}>Add My Stay →</button>
            </div>
          )}
          {Object.keys(hotelGroups).length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>GROUP STAYS</div>
              {Object.entries(hotelGroups).map(([hotel, people]: any) => (
                <div key={hotel} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>🏨 {hotel}</div>
                  {people.map((l: any) => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid #1A1A1A' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{getName(l.user_email)[0]?.toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{getName(l.user_email)}</div>
                        {(l.check_in || l.check_out) && <div style={{ fontSize: '11px', color: '#666' }}>{l.check_in && `Check-in: ${l.check_in}`}{l.check_in && l.check_out ? ' · ' : ''}{l.check_out && `Check-out: ${l.check_out}`}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== RENTAL CARS SECTION ===== */}
      {activeSection === 'rental' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>🚗 Rental Cars</div>
            <button onClick={() => { resetRentalForm(); setShowRentalModal(true) }} style={{ background: '#4ADE80', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(74, 222, 128, 0.35)' }}>
              + Add Rental
            </button>
          </div>
          {myRentals.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ADE80', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>MY RENTALS</div>
              {myRentals.map(r => <RentalCarCard key={r.id} rental={r} isOwn onEdit={() => openEditRental(r)} onDelete={() => deleteRental(r.id)} getName={getName} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', border: '2px dashed #2A2A2A', borderRadius: '14px', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
              <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>Add your rental car info</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Let the group know about your rental</div>
              <button onClick={() => { resetRentalForm(); setShowRentalModal(true) }} style={{ background: '#4ADE80', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(74, 222, 128, 0.35)' }}>Add My Rental →</button>
            </div>
          )}
          {otherRentals.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>GROUP RENTALS</div>
              {otherRentals.map(r => <RentalCarCard key={r.id} rental={r} isOwn={false} getName={getName} />)}
            </div>
          )}
        </div>
      )}

      {/* ===== FLIGHT MODAL ===== */}
      {showFlightModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>{editFlight ? '✏️ Edit Flight' : '✈️ Add My Flight'}</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Airline</label><input value={airline} onChange={e => setAirline(e.target.value)} placeholder="Delta" style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Flight #</label><input value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="DL 1234" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>From</label><input value={departureAirport} onChange={e => setDepartureAirport(e.target.value)} placeholder="LAX" style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>To</label><input value={arrivalAirport} onChange={e => setArrivalAirport(e.target.value)} placeholder="BNA" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Departure</label><input type="datetime-local" value={departureTime} onChange={e => setDepartureTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Arrival</label><input type="datetime-local" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={flightNotes} onChange={e => setFlightNotes(e.target.value)} placeholder="Seat 14A, checked bag, etc." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <button onClick={saveFlight} disabled={saving || (!airline.trim() && !flightNumber.trim())} style={{ width: '100%', background: saving ? '#333' : '#64B4FF', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#000', cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving ? 'none' : '0 4px 14px rgba(100, 180, 255, 0.4)' }}>
              {saving ? 'Saving...' : editFlight ? 'Save Changes →' : 'Add Flight →'}
            </button>
            <button onClick={() => { setShowFlightModal(false); resetFlightForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ===== LODGING MODAL ===== */}
      {showLodgingModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>{editLodging ? '✏️ Edit Stay' : '🏨 Add My Stay'}</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Hotel / Airbnb Name *</label><input value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="The Grand Hyatt" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Address</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Broadway, Nashville TN" style={inputStyle} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Check-in</label><input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Check-out</label><input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Confirmation Code</label><input value={confirmationCode} onChange={e => setConfirmationCode(e.target.value)} placeholder="ABC123XYZ" style={inputStyle} /></div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={lodgingNotes} onChange={e => setLodgingNotes(e.target.value)} placeholder="Pool access, parking, etc." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <button onClick={saveLodging} disabled={saving || !hotelName.trim()} style={{ width: '100%', background: saving || !hotelName.trim() ? '#333' : '#B464FF', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !hotelName.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !hotelName.trim() ? 'none' : '0 4px 14px rgba(180, 100, 255, 0.4)' }}>
              {saving ? 'Saving...' : editLodging ? 'Save Changes →' : 'Add Stay →'}
            </button>
            <button onClick={() => { setShowLodgingModal(false); resetLodgingForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ===== RENTAL CAR MODAL ===== */}
      {showRentalModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>{editRental ? '✏️ Edit Rental' : '🚗 Add My Rental'}</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Rental Company *</label><input value={rentalCompany} onChange={e => setRentalCompany(e.target.value)} placeholder="Enterprise, Hertz, Turo..." style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Confirmation Code</label><input value={rentalConfirmation} onChange={e => setRentalConfirmation(e.target.value)} placeholder="RES123456" style={inputStyle} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Pickup Location</label><input value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="BNA Airport" style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Pickup Time</label><input type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Dropoff Location</label><input value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} placeholder="BNA Airport" style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Dropoff Time</label><input type="datetime-local" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={rentalNotes} onChange={e => setRentalNotes(e.target.value)} placeholder="Vehicle type, insurance, etc." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <button onClick={saveRental} disabled={saving || !rentalCompany.trim()} style={{ width: '100%', background: saving || !rentalCompany.trim() ? '#333' : '#4ADE80', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#000', cursor: saving || !rentalCompany.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !rentalCompany.trim() ? 'none' : '0 4px 14px rgba(74, 222, 128, 0.4)' }}>
              {saving ? 'Saving...' : editRental ? 'Save Changes →' : 'Add Rental →'}
            </button>
            <button onClick={() => { setShowRentalModal(false); resetRentalForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}


function PaymentsTab({ eventId, user, members, event, getName, isDesktop, canInteract }: { eventId: string, user: any, members: any[], event: any, getName: (e: string) => string, isDesktop: boolean, canInteract: boolean }) {
  const [bills, setBills] = useState<any[]>([])
  const [splits, setSplits] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editBill, setEditBill] = useState<any>(null)
  const [expandedBill, setExpandedBill] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paidByEmail, setPaidByEmail] = useState(user?.email || '')
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal')
  const [notes, setNotes] = useState('')
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const allParticipants = (() => {
    const list = members.map(m => ({ email: m.user_email }))
    if (user?.email && !list.some(p => p.email === user.email)) {
      list.unshift({ email: user.email })
    }
    return list
  })()

  useEffect(() => {
    loadBills()
  }, [eventId])

  async function loadBills() {
    setLoading(true)
    const { data: billsData } = await supabase.from('bills').select('*').eq('event_id', eventId).order('created_at', { ascending: false })
    if (billsData && billsData.length > 0) {
      setBills(billsData)
      const billIds = billsData.map(b => b.id)
      const { data: splitsData } = await supabase.from('bill_splits').select('*').in('bill_id', billIds)
      if (splitsData) {
        const grouped: Record<string, any[]> = {}
        splitsData.forEach(s => {
          if (!grouped[s.bill_id]) grouped[s.bill_id] = []
          grouped[s.bill_id].push(s)
        })
        setSplits(grouped)
      }
    } else {
      setBills(billsData || [])
      setSplits({})
    }
    setLoading(false)
  }

  function resetForm() {
    setTitle('')
    setTotalAmount('')
    setPaidByEmail(user?.email || '')
    setSplitType('equal')
    setNotes('')
    setCustomAmounts({})
    setSelectedMembers(allParticipants.map(p => p.email))
    setEditBill(null)
  }

  function openAddModal() {
    resetForm()
    setShowAddModal(true)
  }

  function openEditModal(bill: any) {
    setTitle(bill.title)
    setTotalAmount(String(bill.total_amount))
    setPaidByEmail(bill.paid_by_email)
    setSplitType(bill.split_type || 'equal')
    setNotes(bill.notes || '')
    setEditBill(bill)
    const billSplits = splits[bill.id] || []
    setSelectedMembers(billSplits.map((s: any) => s.user_email))
    if (bill.split_type === 'custom') {
      const ca: Record<string, string> = {}
      billSplits.forEach((s: any) => { ca[s.user_email] = String(s.amount) })
      setCustomAmounts(ca)
    } else {
      setCustomAmounts({})
    }
    setShowAddModal(true)
  }

  async function saveBill() {
    if (!title.trim() || !totalAmount) return
    setSaving(true)
    const amount = parseFloat(totalAmount)
    const splitAmounts: Record<string, number> = {}
    if (splitType === 'equal') {
      const perPerson = Math.round((amount / selectedMembers.length) * 100) / 100
      selectedMembers.forEach((email, i) => {
        splitAmounts[email] = i === selectedMembers.length - 1
          ? Math.round((amount - perPerson * (selectedMembers.length - 1)) * 100) / 100
          : perPerson
      })
    } else {
      selectedMembers.forEach(email => {
        splitAmounts[email] = parseFloat(customAmounts[email] || '0')
      })
    }

    if (editBill) {
      await supabase.from('bills').update({ title: title.trim(), total_amount: amount, paid_by_email: paidByEmail, split_type: splitType, notes: notes.trim() || null }).eq('id', editBill.id)
      await supabase.from('bill_splits').delete().eq('bill_id', editBill.id)
      const newSplits = selectedMembers.map(email => ({ bill_id: editBill.id, user_email: email, amount: splitAmounts[email], is_paid: false }))
      await supabase.from('bill_splits').insert(newSplits)
    } else {
      const { data: newBill } = await supabase.from('bills').insert({ event_id: eventId, created_by: user.id, title: title.trim(), total_amount: amount, paid_by_email: paidByEmail, split_type: splitType, notes: notes.trim() || null }).select().single()
      if (newBill) {
        const newSplits = selectedMembers.map(email => ({ bill_id: newBill.id, user_email: email, amount: splitAmounts[email], is_paid: false }))
        await supabase.from('bill_splits').insert(newSplits)

        // Notify members about payment assignment
        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            type: 'payment',
            title: `💰 New bill: ${title.trim()}`,
            body: `You owe your share of $${amount.toFixed(2)}`,
            excludeUserId: user.id,
            sendEmail: true,
            emailSubject: `💰 You've been assigned a payment in ${event?.name}`,
          }),
        }).catch(() => {})
      }
    }
    setSaving(false)
    setShowAddModal(false)
    resetForm()
    loadBills()
  }

  async function deleteBill(billId: string) {
    await supabase.from('bill_splits').delete().eq('bill_id', billId)
    await supabase.from('bills').delete().eq('id', billId)
    setBills(prev => prev.filter(b => b.id !== billId))
    setSplits(prev => { const next = { ...prev }; delete next[billId]; return next })
  }

  async function markPaid(splitId: string, billId: string) {
    await supabase.from('bill_splits').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', splitId)
    setSplits(prev => ({
      ...prev,
      [billId]: (prev[billId] || []).map(s => s.id === splitId ? { ...s, is_paid: true, paid_at: new Date().toISOString() } : s)
    }))
  }

  async function markUnpaid(splitId: string, billId: string) {
    await supabase.from('bill_splits').update({ is_paid: false, paid_at: null }).eq('id', splitId)
    setSplits(prev => ({
      ...prev,
      [billId]: (prev[billId] || []).map(s => s.id === splitId ? { ...s, is_paid: false, paid_at: null } : s)
    }))
  }

  // Calculate per-person balances: who does the current user owe money to?
  const owedByPerson: Record<string, number> = {}
  bills.forEach(bill => {
    const billSplits = splits[bill.id] || []
    const mySplit = billSplits.find(s => s.user_email === user?.email && !s.is_paid)
    if (mySplit && bill.paid_by_email !== user?.email) {
      const payer = bill.paid_by_email
      owedByPerson[payer] = (owedByPerson[payer] || 0) + parseFloat(mySplit.amount)
    }
  })
  const totalOwed = Object.values(owedByPerson).reduce((a, b) => a + b, 0)

  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 200 }
  const modalCard: React.CSSProperties = { background: '#161616', borderRadius: isDesktop ? '16px' : '24px 24px 0 0', padding: '28px 24px 40px', width: isDesktop ? '480px' : '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>Loading payments...</div>

  return (
    <div style={{ padding: '0 20px', maxWidth: isDesktop ? '900px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
      {/* Balance Summary */}
      <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Your Balance</div>
        {totalOwed > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(owedByPerson).map(([email, amount]) => (
              <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0A0A0A', borderRadius: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>You owe {getName(email)}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#FF4D00' }}>${amount.toFixed(2)}</div>
              </div>
            ))}
            {Object.keys(owedByPerson).length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #2A2A2A' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#999' }}>Total</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF4D00' }}>${totalOwed.toFixed(2)}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#00E676' }}>You're settled up!</div>
        )}
      </div>

      {/* Add Bill Button */}
      {canInteract && <button onClick={openAddModal} style={{ width: '100%', background: 'rgba(255,77,0,0.1)', border: '1px dashed #FF4D00', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        + Add Bill
      </button>}

      {/* Bills List */}
      {bills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No bills yet</div>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Add a bill to start tracking<br />group expenses</div>
          {canInteract ? <button onClick={openAddModal} style={{ background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>+ Add First Bill →</button> : <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>RSVP &quot;Going&quot; to add bills</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bills.map(bill => {
            const billSplits = splits[bill.id] || []
            const mySplit = billSplits.find(s => s.user_email === user?.email)
            const isCreator = bill.created_by === user?.id
            const iPayedThis = bill.paid_by_email === user?.email

            return (
              <div key={bill.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>🧾 {bill.title}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{new Date(bill.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>
                  {iPayedThis ? 'You paid' : `Paid by ${getName(bill.paid_by_email)}`} · ${parseFloat(bill.total_amount).toFixed(2)} total
                </div>
                {bill.notes && <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', fontStyle: 'italic' }}>{bill.notes}</div>}
                {/* Your split */}
                {mySplit && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0A0A0A', borderRadius: '10px', marginBottom: iPayedThis ? '12px' : '0' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#999', marginBottom: '2px' }}>{iPayedThis ? 'Your share' : `You owe ${getName(bill.paid_by_email)}`}</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: mySplit.is_paid || iPayedThis ? '#00E676' : '#FF4D00' }}>${parseFloat(mySplit.amount).toFixed(2)}</div>
                    </div>
                    {!iPayedThis && (
                      mySplit.is_paid ? (
                        <button onClick={() => markUnpaid(mySplit.id, bill.id)} style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid #00E676', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#00E676', cursor: 'pointer' }}>Paid ✓</button>
                      ) : (
                        <button onClick={() => markPaid(mySplit.id, bill.id)} style={{ background: 'rgba(255,77,0,0.1)', border: '1px solid #FF4D00', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer' }}>Mark Paid</button>
                      )
                    )}
                  </div>
                )}
                {!mySplit && !iPayedThis && (
                  <div style={{ padding: '12px 14px', background: '#0A0A0A', borderRadius: '10px', fontSize: '13px', color: '#666', marginBottom: iPayedThis ? '12px' : '0' }}>You're not part of this split</div>
                )}
                {iPayedThis && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => openEditModal(bill)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteBill(bill.id)} style={{ flex: 1, background: 'rgba(255,0,0,0.1)', border: '1px solid #FF3333', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#FF3333', cursor: 'pointer' }}>Delete</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Bill Modal */}
      {showAddModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); resetForm() } }}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>{editBill ? 'Edit Bill' : 'Add Bill'}</h2>

            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dinner at Nashville Hot Chicken" style={{ ...inputStyle, marginBottom: '16px' }} />

            <label style={labelStyle}>Total Amount *</label>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '14px', fontWeight: 700 }}>$</span>
              <input value={totalAmount} onChange={e => setTotalAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" type="text" inputMode="decimal" style={{ ...inputStyle, paddingLeft: '28px' }} />
            </div>

            <label style={labelStyle}>Paid By</label>
            <select value={paidByEmail} onChange={e => setPaidByEmail(e.target.value)} style={{ ...inputStyle, marginBottom: '16px', appearance: 'auto' }}>
              {allParticipants.map(p => (
                <option key={p.email} value={p.email}>{getName(p.email)}</option>
              ))}
            </select>

            <label style={labelStyle}>Split Type</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setSplitType('equal')} style={{ flex: 1, background: splitType === 'equal' ? '#FF4D00' : '#0A0A0A', border: `1px solid ${splitType === 'equal' ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, color: splitType === 'equal' ? '#fff' : '#999', cursor: 'pointer' }}>Equal</button>
              <button onClick={() => setSplitType('custom')} style={{ flex: 1, background: splitType === 'custom' ? '#FF4D00' : '#0A0A0A', border: `1px solid ${splitType === 'custom' ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, color: splitType === 'custom' ? '#fff' : '#999', cursor: 'pointer' }}>Custom</button>
            </div>

            <label style={labelStyle}>Split Between</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {allParticipants.map(p => {
                const isSelected = selectedMembers.includes(p.email)
                const perPerson = splitType === 'equal' && selectedMembers.length > 0 && totalAmount
                  ? (parseFloat(totalAmount) / selectedMembers.length).toFixed(2)
                  : null
                return (
                  <div key={p.email} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#0A0A0A', borderRadius: '10px', border: `1px solid ${isSelected ? '#2A2A2A' : '#1A1A1A'}` }}>
                    <button onClick={() => {
                      setSelectedMembers(prev => isSelected ? prev.filter(e => e !== p.email) : [...prev, p.email])
                    }} style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${isSelected ? '#FF4D00' : '#333'}`, background: isSelected ? '#FF4D00' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}>✓</span>}
                    </button>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: isSelected ? '#F0F0F0' : '#666' }}>{getName(p.email)}</div>
                    {isSelected && splitType === 'custom' ? (
                      <div style={{ position: 'relative', width: '90px' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '13px' }}>$</span>
                        <input value={customAmounts[p.email] || ''} onChange={e => setCustomAmounts(prev => ({ ...prev, [p.email]: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" type="text" inputMode="decimal" style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px 10px 8px 24px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ) : isSelected && perPerson ? (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#999' }}>${perPerson}</span>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..." rows={2} style={{ ...inputStyle, marginBottom: '20px', resize: 'none' }} />

            <button onClick={saveBill} disabled={saving || !title.trim() || !totalAmount || selectedMembers.length === 0} style={{ width: '100%', background: saving || !title.trim() || !totalAmount || selectedMembers.length === 0 ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !title.trim() || !totalAmount || selectedMembers.length === 0 ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !title.trim() || !totalAmount ? 'none' : '0 4px 14px rgba(255,77,0,0.4)' }}>
              {saving ? 'Saving...' : editBill ? 'Save Changes →' : 'Add Bill →'}
            </button>
            <button onClick={() => { setShowAddModal(false); resetForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChatTab({ eventId, user, members, flights, lodgings, getName, isDesktop, canInteract }: { eventId: string, user: any, members: any[], flights: any[], lodgings: any[], getName: (e: string) => string, isDesktop: boolean, canInteract: boolean }) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [showReactions, setShowReactions] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, any[]>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const CHAT_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '👎']
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('chat_groups').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
      if (!data || data.length === 0) {
        // Auto-create default group chat for events that don't have one
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          const { data: newGroup } = await supabase.from('chat_groups').insert({
            event_id: eventId,
            name: 'Group Chat',
            created_by: currentUser.id,
            auto_created: true,
          }).select().single()
          setGroups(newGroup ? [newGroup] : [])
        } else {
          setGroups([])
        }
      } else {
        setGroups(data)
      }
      setLoading(false)
    }
    load()
  }, [eventId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeGroup) return
    async function loadMessages() {
      const { data } = await supabase.from('chat_messages').select('*').eq('group_id', activeGroup.id).order('created_at', { ascending: true })
      setMessages(data || [])
    }
    loadMessages()
    // Load reactions
    async function loadReactions() {
      const { data } = await supabase.from('chat_reactions').select('*').eq('group_id', activeGroup.id)
      if (data) {
        const grouped: Record<string, any[]> = {}
        data.forEach((r: any) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = []
          grouped[r.message_id].push(r)
        })
        setReactions(grouped)
      }
    }
    loadReactions()
    let pollingInterval: ReturnType<typeof setInterval> | null = null
    const sub = supabase.channel(`chat:${activeGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${activeGroup.id}` }, payload => {
        setMessages(prev => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new])
      })
      .subscribe((status) => {
        setRealtimeStatus(status)
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          if (!pollingInterval) {
            pollingInterval = setInterval(async () => {
              const { data } = await supabase.from('chat_messages').select('*').eq('group_id', activeGroup.id).order('created_at', { ascending: true })
              if (data) setMessages(data)
            }, 5000)
          }
        }
        if (status === 'SUBSCRIBED') {
          if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null }
        }
      })
    return () => { supabase.removeChannel(sub); if (pollingInterval) clearInterval(pollingInterval) }
  }, [activeGroup])

  async function createGroup(name: string, autoCreated = false) {
    if (!name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('chat_groups').insert({ event_id: eventId, name, created_by: user.id, auto_created: autoCreated }).select().single()
    if (data) setGroups(prev => [...prev, data])
    setGroupName(''); setShowCreateModal(false); setSaving(false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeGroup) return
    setSending(true)
    const payload: any = { group_id: activeGroup.id, event_id: eventId, user_id: user.id, user_email: user.email, content: newMessage.trim() }
    if (replyTo) payload.reply_to = replyTo.id
    const { data, error: sendErr } = await supabase.from('chat_messages').insert(payload).select().single()
    if (sendErr) {
      // If reply_to column doesn't exist, retry without it
      if (sendErr.message?.includes('reply_to')) {
        const { reply_to, ...fallback } = payload
        const { data: d2 } = await supabase.from('chat_messages').insert(fallback).select().single()
        if (d2) setMessages(prev => prev.some(m => m.id === d2.id) ? prev : [...prev, { ...d2, reply_to: replyTo?.id }])
      }
    } else if (data) {
      const msg = replyTo ? { ...data, reply_to: replyTo.id } : data
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    }
    setNewMessage(''); setReplyTo(null); setSending(false)
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const msgReactions = reactions[messageId] || []
    const existing = msgReactions.find(r => r.user_id === user.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id)
      setReactions(prev => ({ ...prev, [messageId]: (prev[messageId] || []).filter(r => r.id !== existing.id) }))
    } else {
      const { data } = await supabase.from('chat_reactions').insert({ message_id: messageId, group_id: activeGroup.id, user_id: user.id, user_email: user.email, emoji }).select().single()
      if (data) setReactions(prev => ({ ...prev, [messageId]: [...(prev[messageId] || []), data] }))
    }
    setShowReactions(null)
  }

  const suggestions: string[] = []
  const arrivalDates = [...new Set(flights.filter(f => f.arrival_time).map(f => {
    try { return new Date(f.arrival_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) } catch { return null }
  }).filter(Boolean))] as string[]
  arrivalDates.forEach(d => { if (!groups.find(g => g.name === `Arriving ${d}`)) suggestions.push(`Arriving ${d}`) })
  const hotelNames = [...new Set(lodgings.map(l => l.hotel_name).filter(Boolean))] as string[]
  hotelNames.forEach(h => { if (!groups.find(g => g.name === `Staying at ${h}`)) suggestions.push(`Staying at ${h}`) })

  if (activeGroup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: '400px', maxWidth: isDesktop ? '640px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => { setActiveGroup(null); setReplyTo(null); setShowReactions(null) }} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{activeGroup.name}</div>
          {activeGroup.auto_created && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>AUTO</div>}
          {realtimeStatus !== 'SUBSCRIBED' && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>{realtimeStatus === 'disconnected' ? 'connecting...' : 'polling'}</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px', fontSize: '13px' }}>No messages yet — say hi! 👋</div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.user_id === user.id
              const msgReactions = reactions[msg.id] || []
              const reactionCounts = CHAT_EMOJIS.map(emoji => {
                const list = msgReactions.filter(r => r.emoji === emoji)
                return list.length > 0 ? { emoji, count: list.length, userReacted: list.some(r => r.user_id === user.id) } : null
              }).filter(Boolean) as { emoji: string, count: number, userReacted: boolean }[]
              const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px' }}>
                  {!isMe && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{getName(msg.user_email)[0]?.toUpperCase()}</div>}
                  <div style={{ maxWidth: isDesktop ? '420px' : '75%', position: 'relative' }}>
                    {!isMe && <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px', fontWeight: 600 }}>{getName(msg.user_email)}</div>}
                    {/* Reply preview */}
                    {repliedMsg && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '2px solid #FF4D00', borderRadius: '4px', padding: '4px 8px', marginBottom: '4px', fontSize: '11px', color: '#888' }}>
                        <span style={{ fontWeight: 700, color: '#FF4D00' }}>{getName(repliedMsg.user_email)}</span>: {repliedMsg.content?.substring(0, 60)}{repliedMsg.content?.length > 60 ? '...' : ''}
                      </div>
                    )}
                    {/* Message bubble */}
                    <div
                      onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                      style={{ background: isMe ? '#1A3A3A' : '#1E1E1E', border: isMe ? '1px solid #2A4A4A' : '1px solid #2A2A2A', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontSize: '14px', color: '#fff', lineHeight: 1.4, cursor: 'pointer' }}
                    >{msg.content}</div>
                    {/* Reaction badges */}
                    {reactionCounts.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        {reactionCounts.map(r => (
                          <span key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)} style={{ fontSize: '11px', background: r.userReacted ? 'rgba(255,77,0,0.15)' : 'rgba(255,255,255,0.06)', border: r.userReacted ? '1px solid #FF4D00' : '1px solid #2A2A2A', borderRadius: '10px', padding: '2px 6px', cursor: 'pointer' }}>{r.emoji}{r.count > 1 ? r.count : ''}</span>
                        ))}
                      </div>
                    )}
                    {/* Action row: react + reply */}
                    {showReactions === msg.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '20px', padding: '4px 8px', width: 'fit-content' }}>
                        {CHAT_EMOJIS.map(emoji => (
                          <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji) }} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '2px 4px' }}>{emoji}</button>
                        ))}
                        <div style={{ width: '1px', height: '20px', background: '#2A2A2A', margin: '0 2px' }} />
                        <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setShowReactions(null); chatInputRef.current?.focus() }} style={{ background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', color: '#FF4D00', fontWeight: 700, padding: '2px 6px' }}>Reply</button>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>{new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Reply banner */}
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,77,0,0.1)', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', fontSize: '12px', color: '#FF4D00', fontWeight: 600 }}>
            <span>Replying to {getName(replyTo.user_email)}: {replyTo.content?.substring(0, 40)}{replyTo.content?.length > 40 ? '...' : ''}</span>
            <span onClick={() => setReplyTo(null)} style={{ cursor: 'pointer', fontSize: '14px' }}>✕</span>
          </div>
        )}
        {canInteract ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input ref={chatInputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder={replyTo ? 'Reply...' : 'Message...'} style={{ flex: 1, background: '#161616', border: '1px solid #2A2A2A', borderRadius: '24px', padding: '12px 16px', fontSize: '14px', color: '#fff', outline: 'none' }} />
          <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{ background: newMessage.trim() ? '#FF4D00' : '#333', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '18px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>↑</button>
        </div>
        ) : (
        <div style={{ textAlign: 'center', padding: '12px', background: '#161616', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>RSVP &quot;Going&quot; to send messages</div>
        </div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>💬 Chat Groups</div>
        {canInteract && <button onClick={() => setShowCreateModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>+ New Group</button>}
      </div>
      {suggestions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFD600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>✨ SUGGESTED GROUPS</div>
          {suggestions.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,214,0,0.05)', border: '1px solid rgba(255,214,0,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>💡 {s}</div>
              <button onClick={() => createGroup(s, true)} style={{ background: '#FFD600', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#000', cursor: 'pointer' }}>Create</button>
            </div>
          ))}
        </div>
      )}
      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px', border: '2px dashed #2A2A2A', borderRadius: '14px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No chat groups yet</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>Create a group to start chatting</div>
          <button onClick={() => setShowCreateModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(255, 77, 0, 0.35)' }}>Create First Group →</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>ALL GROUPS</div>
          {groups.map(group => (
            <div key={group.id} onClick={() => setActiveGroup(group)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', marginBottom: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{group.name}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Tap to open</div>
              </div>
              {group.auto_created && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>AUTO</div>}
              <div style={{ fontSize: '16px', color: '#666' }}>→</div>
            </div>
          ))}
        </div>
      )}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: isDesktop ? '16px' : '24px 24px 0 0', padding: '28px 24px 40px', width: isDesktop ? '440px' : '100%', border: '1px solid #2A2A2A', boxSizing: 'border-box' }}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>💬 Create Chat Group</h2>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Group Name</label><input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Arriving Friday, Hotel Crew, etc." style={inputStyle} autoFocus /></div>
            <button onClick={() => createGroup(groupName)} disabled={saving || !groupName.trim()} style={{ width: '100%', background: saving || !groupName.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !groupName.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !groupName.trim() ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
              {saving ? 'Creating...' : 'Create Group →'}
            </button>
            <button onClick={() => { setShowCreateModal(false); setGroupName('') }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function VoteTab({ eventId, user, members, event, canInteract }: { eventId: string, user: any, members: any[], event: any, canInteract: boolean }) {
  const [items, setItems] = useState<any[]>([])
  const [votes, setVotes] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const memberCount = members.length + 1 // +1 for host
  const isHost = event?.owner_id === user?.id
  const isCohost = members.some(m => m.user_email === user?.email && m.role_level === 'cohost')
  const canConfirm = isHost || isCohost

  // Itinerary vote edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editCategory, setEditCategory] = useState('activity')
  const [editIsBooked, setEditIsBooked] = useState(false)
  const [editConfirmMode, setEditConfirmMode] = useState<'auto' | 'manual'>('manual')
  const [saving, setSaving] = useState(false)
  const categories = [{ value: 'activity', label: '🎯 Activity' }, { value: 'food', label: '🍽 Food' }, { value: 'transport', label: '🚗 Transport' }, { value: 'lodging', label: '🏨 Lodging' }, { value: 'flight', label: '✈️ Flight' }, { value: 'other', label: '✨ Other' }]

  // Poll state
  const [polls, setPolls] = useState<any[]>([])
  const [pollOptions, setPollOptions] = useState<Record<string, any[]>>({})
  const [pollVotes, setPollVotes] = useState<Record<string, any[]>>({})
  const [pollsLoading, setPollsLoading] = useState(true)
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptionInputs, setPollOptionInputs] = useState<string[]>(['', ''])
  const [pollSaving, setPollSaving] = useState(false)
  const [confirmDeletePoll, setConfirmDeletePoll] = useState<string | null>(null)

  // Load itinerary votes
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('itinerary_items').select('*').eq('event_id', eventId).eq('is_votable', true).order('date', { ascending: true })
      setItems(data || [])
      if (data && data.length > 0) {
        const itemIds = data.map((i: any) => i.id)
        const { data: votesData } = await supabase.from('item_votes').select('*').in('item_id', itemIds)
        if (votesData) {
          const grouped: Record<string, any[]> = {}
          votesData.forEach((v: any) => {
            if (!grouped[v.item_id]) grouped[v.item_id] = []
            grouped[v.item_id].push(v)
          })
          setVotes(grouped)
        }
      }
      setLoading(false)
    }
    load()
  }, [eventId])

  // Load polls via server API
  useEffect(() => {
    async function loadPolls() {
      const res = await fetch(`/api/polls?eventId=${eventId}&userId=${user.id}&userEmail=${encodeURIComponent(user.email)}`)
      if (res.ok) {
        const data = await res.json()
        setPolls(data.polls || [])
        setPollOptions(data.options || {})
        setPollVotes(data.votes || {})
      }
      setPollsLoading(false)
    }
    loadPolls()
  }, [eventId, user.id])

  // Itinerary vote functions
  async function confirmItem(itemId: string) {
    const { data } = await supabase.from('itinerary_items').update({ is_booked: true, is_votable: false }).eq('id', itemId).select().single()
    if (data) setItems(prev => prev.filter(i => i.id !== itemId))
  }

  async function castVote(itemId: string, vote: 'up' | 'down') {
    const itemVotes = votes[itemId] || []
    const existing = itemVotes.find(v => v.user_id === user.id)
    let newItemVotes = [...itemVotes]

    if (existing) {
      if (existing.vote === vote) {
        await supabase.from('item_votes').delete().eq('id', existing.id)
        newItemVotes = newItemVotes.filter(v => v.id !== existing.id)
      } else {
        const { data } = await supabase.from('item_votes').update({ vote }).eq('id', existing.id).select().single()
        if (data) newItemVotes = newItemVotes.map(v => v.id === existing.id ? data : v)
      }
    } else {
      const { data, error: voteErr } = await supabase.from('item_votes').insert({ item_id: itemId, event_id: eventId, user_id: user.id, user_email: user.email, vote }).select().single()
      if (voteErr) console.error('Vote error:', voteErr.message)
      if (data) newItemVotes = [...newItemVotes, data]
    }

    setVotes(prev => ({ ...prev, [itemId]: newItemVotes }))

    const item = items.find(i => i.id === itemId)
    if (item?.confirm_mode === 'auto') {
      const upCount = newItemVotes.filter(v => v.vote === 'up').length
      if (upCount > memberCount / 2) {
        await confirmItem(itemId)
      }
    }
  }

  function openVoteEdit(item: any) {
    setEditItem(item); setEditTitle(item.title || ''); setEditDescription(item.description || '')
    setEditNotes(item.notes || ''); setEditDate(item.date || ''); setEditStartTime(item.start_time || '')
    setEditEndTime(item.end_time || ''); setEditLocation(item.location || '')
    setEditCategory(item.category || 'activity'); setEditIsBooked(item.is_booked || false)
    setEditConfirmMode(item.confirm_mode || 'manual'); setShowEditModal(true)
  }
  function resetEditForm() {
    setEditTitle(''); setEditDescription(''); setEditNotes(''); setEditDate('')
    setEditStartTime(''); setEditEndTime(''); setEditLocation('')
    setEditCategory('activity'); setEditIsBooked(false); setEditConfirmMode('manual'); setEditItem(null)
  }
  async function saveEdit() {
    if (!editTitle.trim() || !editItem) return
    setSaving(true)
    const payload = { title: editTitle, description: editDescription, notes: editNotes, date: editDate, start_time: editStartTime, end_time: editEndTime, location: editLocation, category: editCategory, is_booked: editIsBooked, is_votable: !editIsBooked, confirm_mode: editConfirmMode }
    const { data } = await supabase.from('itinerary_items').update(payload).eq('id', editItem.id).select().single()
    if (data) {
      if (data.is_booked) { setItems(prev => prev.filter(i => i.id !== editItem.id)) }
      else { setItems(prev => prev.map(i => i.id === editItem.id ? data : i)) }
    }
    resetEditForm(); setShowEditModal(false); setSaving(false)
  }
  async function deleteVoteItem(id: string) {
    await supabase.from('itinerary_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    resetEditForm(); setShowEditModal(false)
  }

  const getCategoryEmoji = (cat: string) => ({ activity: '🎯', food: '🍽', transport: '🚗', lodging: '🏨', flight: '✈️', other: '✨' } as any)[cat] || '✨'

  // Poll functions
  async function createPoll() {
    const validOptions = pollOptionInputs.filter(o => o.trim())
    if (!pollQuestion.trim() || validOptions.length < 2) return
    setPollSaving(true)
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, userId: user.id, userEmail: user.email, question: pollQuestion.trim(), options: validOptions.map(o => o.trim()) })
    })
    if (res.ok) {
      const data = await res.json()
      setPolls(prev => [data.poll, ...prev])
      setPollOptions(prev => ({ ...prev, [data.poll.id]: data.options }))
      setPollVotes(prev => ({ ...prev, [data.poll.id]: [] }))
    }
    setPollQuestion(''); setPollOptionInputs(['', '']); setShowCreatePoll(false); setPollSaving(false)

    // Notify members about new poll
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        type: 'poll',
        title: '🗳 New poll',
        body: pollQuestion.trim(),
        excludeUserId: user.id,
        sendEmail: false,
      }),
    }).catch(() => {})
  }

  async function castPollVote(pollId: string, optionId: string) {
    const currentVotes = pollVotes[pollId] || []
    const myVote = currentVotes.find(v => v.user_id === user.id)

    // Optimistic update
    let newVotes: any[]
    if (myVote && myVote.option_id === optionId) {
      newVotes = currentVotes.filter(v => v.user_id !== user.id)
    } else {
      newVotes = [...currentVotes.filter(v => v.user_id !== user.id), { poll_id: pollId, option_id: optionId, user_id: user.id, user_email: user.email }]
    }
    setPollVotes(prev => ({ ...prev, [pollId]: newVotes }))

    await fetch('/api/poll-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, optionId, eventId, userId: user.id, userEmail: user.email })
    })
  }

  async function closePoll(pollId: string) {
    await fetch('/api/poll-manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', pollId, userId: user.id })
    })
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, is_closed: true } : p))
  }

  async function deletePoll(pollId: string) {
    await fetch('/api/poll-manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', pollId, userId: user.id })
    })
    setPolls(prev => prev.filter(p => p.id !== pollId))
    setConfirmDeletePoll(null)
  }

  const canManagePoll = (poll: any) => poll.created_by === user.id || isHost || isCohost

  if (loading || pollsLoading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  if (items.length === 0 && polls.length === 0) {
    return (
      <div>
        {canInteract && (
          <button onClick={() => setShowCreatePoll(true)} style={{ width: '100%', background: 'rgba(255,77,0,0.08)', border: '1px dashed rgba(255,77,0,0.3)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer', marginBottom: '16px' }}>+ Create a Poll</button>
        )}
        <div style={{ textAlign: 'center', color: '#666', padding: '40px', border: '2px dashed #2A2A2A', borderRadius: '14px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗳</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No polls or vote items yet</div>
          <div style={{ fontSize: '13px' }}>Create a poll or mark itinerary items as &quot;Open to Group Vote&quot;</div>
        </div>

        {showCreatePoll && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) { setShowCreatePoll(false); setPollQuestion(''); setPollOptionInputs(['', '']) } }}>
            <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
              <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Create Poll</h2>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Question *</label><input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Where should we eat dinner?" style={inputStyle} /></div>
              <label style={labelStyle}>Options *</label>
              {pollOptionInputs.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input value={opt} onChange={e => { const u = [...pollOptionInputs]; u[i] = e.target.value; setPollOptionInputs(u) }} placeholder={`Option ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                  {pollOptionInputs.length > 2 && (
                    <button onClick={() => setPollOptionInputs(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '0 12px', color: '#FF4D00', cursor: 'pointer', fontSize: '16px' }}>x</button>
                  )}
                </div>
              ))}
              {pollOptionInputs.length < 10 && (
                <button onClick={() => setPollOptionInputs(prev => [...prev, ''])} style={{ width: '100%', background: 'rgba(255,77,0,0.08)', border: '1px dashed rgba(255,77,0,0.3)', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer', marginBottom: '20px' }}>+ Add Option</button>
              )}
              <button onClick={createPoll} disabled={pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2} style={{ width: '100%', background: (pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2) ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: (pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2) ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: (pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2) ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>{pollSaving ? 'Creating...' : 'Create Poll'}</button>
              <button onClick={() => { setShowCreatePoll(false); setPollQuestion(''); setPollOptionInputs(['', '']) }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Create Poll button */}
      {canInteract && (
        <button onClick={() => setShowCreatePoll(true)} style={{ width: '100%', background: 'rgba(255,77,0,0.08)', border: '1px dashed rgba(255,77,0,0.3)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer', marginBottom: '16px' }}>+ Create a Poll</button>
      )}

      {/* Polls section */}
      {polls.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>{polls.length} {polls.length === 1 ? 'Poll' : 'Polls'}</div>
          {polls.map(poll => {
            const opts = pollOptions[poll.id] || []
            const pvotes = pollVotes[poll.id] || []
            const totalVotes = pvotes.length
            const myPollVote = pvotes.find(v => v.user_id === user.id)

            return (
              <div key={poll.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: poll.is_closed ? '#666' : '#FF4D00', letterSpacing: '2px', textTransform: 'uppercase' }}>POLL{poll.is_closed ? ' (CLOSED)' : ''}</span>
                    </div>
                    {canManagePoll(poll) && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!poll.is_closed && (
                          <button onClick={() => closePoll(poll.id)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #2A2A2A', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: '#0A0A0A', color: '#666' }}>Close</button>
                        )}
                        {confirmDeletePoll === poll.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => deletePoll(poll.id)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: 'rgba(255,77,0,0.2)', color: '#FF4D00' }}>Confirm</button>
                            <button onClick={() => setConfirmDeletePoll(null)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #2A2A2A', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: '#0A0A0A', color: '#666' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeletePoll(poll.id)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #2A2A2A', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: '#0A0A0A', color: '#666' }}>Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>{poll.question}</div>

                  {/* Poll options with progress bars */}
                  {opts.map(option => {
                    const optVoteCount = pvotes.filter(v => v.option_id === option.id).length
                    const pct = totalVotes > 0 ? Math.round((optVoteCount / totalVotes) * 100) : 0
                    const isMyVote = myPollVote?.option_id === option.id
                    const isClickable = !poll.is_closed && canInteract

                    return (
                      <div key={option.id} onClick={() => isClickable && castPollVote(poll.id, option.id)} style={{ marginBottom: '8px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${isMyVote ? '#FF4D00' : '#2A2A2A'}`, cursor: isClickable ? 'pointer' : 'default', position: 'relative', transition: 'border-color 0.2s' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: isMyVote ? 'rgba(255,77,0,0.15)' : 'rgba(255,255,255,0.04)', transition: 'width 0.3s' }} />
                        <div style={{ position: 'relative', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isMyVote && <span style={{ color: '#FF4D00', fontSize: '14px', fontWeight: 700 }}>&#10003;</span>}
                            <span style={{ fontSize: '14px', fontWeight: isMyVote ? 700 : 500, color: '#F0F0F0' }}>{option.label}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#666', fontFamily: 'monospace' }}>{optVoteCount} ({pct}%)</span>
                        </div>
                      </div>
                    )
                  })}

                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', fontFamily: 'monospace' }}>
                    {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                  </div>
                  {!canInteract && !poll.is_closed && <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, marginTop: '6px' }}>RSVP to vote</div>}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Itinerary votes section */}
      {items.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px', marginTop: polls.length > 0 ? '20px' : '0' }}>{items.length} {items.length === 1 ? 'Item' : 'Items'} Up For Vote</div>
          {items.map(item => {
            const itemVotes = votes[item.id] || []
            const ups = itemVotes.filter(v => v.vote === 'up').length
            const downs = itemVotes.filter(v => v.vote === 'down').length
            const totalVotes = itemVotes.length
            const pct = memberCount > 0 ? Math.round((ups / memberCount) * 100) : 0
            const myVote = itemVotes.find(v => v.user_id === user.id)?.vote

            return (
              <div key={item.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#FF4D00', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {getCategoryEmoji(item.category)} {item.category}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.title}
                    {item.confirm_mode === 'auto' && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,230,118,0.12)', color: '#00E676' }}>AUTO</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {item.date && <span>📅 {new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    {item.start_time && <span>🕐 {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</span>}
                    {item.location && <span>📍 {item.location}</span>}
                  </div>
                  {item.description && <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>{item.description}</div>}
                </div>
                <div style={{ height: '3px', background: '#2A2A2A' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, #FF4D00, #FFD600)', width: `${pct}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                    {ups} Yes · {downs} No · {totalVotes}/{memberCount} voted
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {canConfirm && <button onClick={() => openVoteEdit(item)} style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid #2A2A2A', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: '#0A0A0A', color: '#F0F0F0', transition: 'background 0.2s' }}>✏️</button>}
                    {canConfirm && (item.confirm_mode || 'manual') === 'manual' && totalVotes > 0 && (
                      <button onClick={() => confirmItem(item.id)} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: 'rgba(0,230,118,0.2)', color: '#00E676', transition: 'background 0.2s' }}>Confirm ✓</button>
                    )}
                    {canInteract ? (<>
                    <button onClick={() => castVote(item.id, 'down')} style={{ width: '40px', height: '40px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '16px', background: myVote === 'down' ? 'rgba(255,77,0,0.4)' : 'rgba(255,77,0,0.1)', transition: 'background 0.2s' }}>👎</button>
                    <button onClick={() => castVote(item.id, 'up')} style={{ width: '40px', height: '40px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '16px', background: myVote === 'up' ? '#00E676' : 'rgba(0,230,118,0.15)', transition: 'background 0.2s' }}>👍</button>
                    </>) : <div style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>RSVP to vote</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Edit vote item modal */}
      {showEditModal && editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Edit Vote Item</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Title *</label><input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Dinner at The Palm" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Date (optional)</label><input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <ScrollTimePicker label="Start Time" value={editStartTime} onChange={setEditStartTime} />
              <ScrollTimePicker label="End Time" value={editEndTime} onChange={setEditEndTime} />
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Location (optional)</label><input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="123 Main St" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Description (optional)</label><textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Private notes, reminders, links..." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Confirm Mode</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div onClick={() => setEditConfirmMode('auto')} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', background: editConfirmMode === 'auto' ? 'rgba(255,214,0,0.12)' : '#0A0A0A', border: `1px solid ${editConfirmMode === 'auto' ? '#FFD600' : '#2A2A2A'}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: editConfirmMode === 'auto' ? '#FFD600' : '#666' }}>Auto-confirm</div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Confirms at majority vote</div>
                </div>
                <div onClick={() => setEditConfirmMode('manual')} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', background: editConfirmMode === 'manual' ? 'rgba(255,214,0,0.12)' : '#0A0A0A', border: `1px solid ${editConfirmMode === 'manual' ? '#FFD600' : '#2A2A2A'}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: editConfirmMode === 'manual' ? '#FFD600' : '#666' }}>Manual confirm</div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Host confirms manually</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}><ToggleRow value={editIsBooked} onChange={(val: boolean) => setEditIsBooked(val)} label="✅ Mark as Booked" desc="Confirm this item and move to itinerary" color="#00E676" bg="rgba(0,230,118,0.08)" /></div>
            <button onClick={saveEdit} disabled={saving || !editTitle.trim()} style={{ width: '100%', background: saving || !editTitle.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !editTitle.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !editTitle.trim() ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>{saving ? 'Saving...' : 'Save Changes →'}</button>
            <button onClick={() => deleteVoteItem(editItem.id)} style={{ width: '100%', background: 'none', border: '1px solid rgba(255,77,0,0.3)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer', marginBottom: '12px' }}>🗑 Delete Item</button>
            <button onClick={() => { setShowEditModal(false); resetEditForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Create poll modal */}
      {showCreatePoll && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) { setShowCreatePoll(false); setPollQuestion(''); setPollOptionInputs(['', '']) } }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Create Poll</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Question *</label><input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Where should we eat dinner?" style={inputStyle} /></div>
            <label style={labelStyle}>Options *</label>
            {pollOptionInputs.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input value={opt} onChange={e => { const u = [...pollOptionInputs]; u[i] = e.target.value; setPollOptionInputs(u) }} placeholder={`Option ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                {pollOptionInputs.length > 2 && (
                  <button onClick={() => setPollOptionInputs(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '0 12px', color: '#FF4D00', cursor: 'pointer', fontSize: '16px' }}>x</button>
                )}
              </div>
            ))}
            {pollOptionInputs.length < 10 && (
              <button onClick={() => setPollOptionInputs(prev => [...prev, ''])} style={{ width: '100%', background: 'rgba(255,77,0,0.08)', border: '1px dashed rgba(255,77,0,0.3)', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer', marginBottom: '20px' }}>+ Add Option</button>
            )}
            <button onClick={createPoll} disabled={pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2} style={{ width: '100%', background: (pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2) ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: (pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2) ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: (pollSaving || !pollQuestion.trim() || pollOptionInputs.filter(o => o.trim()).length < 2) ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>{pollSaving ? 'Creating...' : 'Create Poll'}</button>
            <button onClick={() => { setShowCreatePoll(false); setPollQuestion(''); setPollOptionInputs(['', '']) }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotosTab({ eventId, user, event, members, getName, canInteract }: { eventId: string, user: any, event: any, members: any[], getName: (e: string) => string, canInteract: boolean }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Reactions & comments
  const [reactions, setReactions] = useState<Record<string, any[]>>({})
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [commentReactions, setCommentReactions] = useState<Record<string, any[]>>({})
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const isHost = event?.owner_id === user?.id
  const isCohost = members.some(m => m.user_email === user?.email && m.role_level === 'cohost')

  // Build member list for @mentions (deduplicated by email)
  const memberList = Array.from(new Map(members.map(m => [m.user_email, { email: m.user_email, name: getName(m.user_email) }])).values())
  if (event?.owner_id) {
    const ownerEmail = user?.email
    if (ownerEmail && !memberList.some(m => m.email === ownerEmail)) {
      memberList.unshift({ email: ownerEmail, name: getName(ownerEmail) })
    }
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      setPhotos(data || [])

      if (data && data.length > 0) {
        const photoIds = data.map((p: any) => p.id)
        const { data: rxns } = await supabase.from('photo_reactions').select('*').in('photo_id', photoIds)
        const rxnMap: Record<string, any[]> = {}
        ;(rxns || []).forEach((r: any) => { if (!rxnMap[r.photo_id]) rxnMap[r.photo_id] = []; rxnMap[r.photo_id].push(r) })
        setReactions(rxnMap)

        const { data: cmts } = await supabase.from('photo_comments').select('*').in('photo_id', photoIds).order('created_at', { ascending: true })
        const cmtMap: Record<string, any[]> = {}
        ;(cmts || []).forEach((c: any) => { if (!cmtMap[c.photo_id]) cmtMap[c.photo_id] = []; cmtMap[c.photo_id].push(c) })
        setComments(cmtMap)

        if (cmts && cmts.length > 0) {
          const cmtIds = cmts.map((c: any) => c.id)
          const { data: cRxns } = await supabase.from('comment_reactions').select('*').in('comment_id', cmtIds)
          const cRxnMap: Record<string, any[]> = {}
          ;(cRxns || []).forEach((r: any) => { if (!cRxnMap[r.comment_id]) cRxnMap[r.comment_id] = []; cRxnMap[r.comment_id].push(r) })
          setCommentReactions(cRxnMap)
        }
      }
      setLoading(false)
    }
    load()
  }, [eventId])

  // Real-time subscriptions
  useEffect(() => {
    const rxnSub = supabase.channel(`photo-rxn:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photo_reactions' }, payload => {
        const r = payload.new as any
        setReactions(prev => ({ ...prev, [r.photo_id]: [...(prev[r.photo_id] || []), r] }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photo_reactions' }, payload => {
        const r = payload.old as any
        setReactions(prev => ({ ...prev, [r.photo_id]: (prev[r.photo_id] || []).filter((x: any) => x.id !== r.id) }))
      })
      .subscribe()

    const cmtSub = supabase.channel(`photo-cmt:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photo_comments' }, payload => {
        const c = payload.new as any
        setComments(prev => ({ ...prev, [c.photo_id]: [...(prev[c.photo_id] || []), c] }))
      })
      .subscribe()

    const cRxnSub = supabase.channel(`cmt-rxn:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comment_reactions' }, payload => {
        const r = payload.new as any
        setCommentReactions(prev => ({ ...prev, [r.comment_id]: [...(prev[r.comment_id] || []), r] }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comment_reactions' }, payload => {
        const r = payload.old as any
        setCommentReactions(prev => ({ ...prev, [r.comment_id]: (prev[r.comment_id] || []).filter((x: any) => x.id !== r.id) }))
      })
      .subscribe()

    return () => { supabase.removeChannel(rxnSub); supabase.removeChannel(cmtSub); supabase.removeChannel(cRxnSub) }
  }, [eventId])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setSelectedFiles(files)
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviews(urls)
    setShowUpload(true)
  }

  async function uploadPhotos() {
    if (!selectedFiles.length) return
    setUploading(true)
    setUploadProgress(0)
    const newPhotos: any[] = []
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const ext = file.name.split('.').pop()
      const filePath = `${eventId}/${Date.now()}_${i}.${ext}`
      const { error: uploadError } = await supabase.storage.from('event-photos').upload(filePath, file)
      if (uploadError) continue
      const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(filePath)
      const { data: photoRow } = await supabase.from('event_photos').insert({ event_id: eventId, user_id: user.id, user_email: user.email, file_url: urlData.publicUrl, file_name: file.name, caption }).select().single()
      if (photoRow) newPhotos.push(photoRow)
      setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
    }
    setPhotos(prev => [...newPhotos, ...prev])
    setShowUpload(false)
    setSelectedFiles([])
    setPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return [] })
    setCaption('')
    setUploading(false)
  }

  async function deletePhoto(photo: any) {
    const filePath = photo.file_url.split('/event-photos/')[1]
    await supabase.storage.from('event-photos').remove([filePath])
    await supabase.from('event_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setReactions(prev => { const next = { ...prev }; delete next[photo.id]; return next })
    setComments(prev => { const next = { ...prev }; delete next[photo.id]; return next })
    setConfirmDelete(null)
    if (lightbox !== null) {
      const remaining = photos.filter(p => p.id !== photo.id)
      if (remaining.length === 0) setLightbox(null)
      else if (lightbox >= remaining.length) setLightbox(remaining.length - 1)
    }
  }

  function downloadPhoto(photo: any) {
    const a = document.createElement('a')
    a.href = photo.file_url
    a.download = photo.file_name
    a.target = '_blank'
    a.click()
  }

  async function toggleReaction(photoId: string, emoji: string) {
    const existing = (reactions[photoId] || []).find((r: any) => r.user_id === user.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('photo_reactions').delete().eq('id', existing.id)
      setReactions(prev => ({ ...prev, [photoId]: (prev[photoId] || []).filter((r: any) => r.id !== existing.id) }))
    } else {
      const { data } = await supabase.from('photo_reactions').insert({ photo_id: photoId, user_id: user.id, user_email: user.email, emoji }).select().single()
      if (data) setReactions(prev => ({ ...prev, [photoId]: [...(prev[photoId] || []), data] }))
    }
  }

  async function toggleCommentReaction(commentId: string, emoji: string) {
    const existing = (commentReactions[commentId] || []).find((r: any) => r.user_id === user.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('comment_reactions').delete().eq('id', existing.id)
      setCommentReactions(prev => ({ ...prev, [commentId]: (prev[commentId] || []).filter((r: any) => r.id !== existing.id) }))
    } else {
      const { data } = await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: user.id, user_email: user.email, emoji }).select().single()
      if (data) setCommentReactions(prev => ({ ...prev, [commentId]: [...(prev[commentId] || []), data] }))
    }
  }

  async function addComment(photoId: string) {
    if (!newComment.trim()) return
    setSendingComment(true)
    const { data } = await supabase.from('photo_comments').insert({ photo_id: photoId, user_id: user.id, user_email: user.email, content: newComment.trim(), parent_id: replyTo?.id || null }).select().single()
    if (data) setComments(prev => ({ ...prev, [photoId]: [...(prev[photoId] || []), data] }))
    setNewComment('')
    setReplyTo(null)
    setMentionQuery(null)
    setSendingComment(false)
  }

  function getReactionCounts(photoId: string) {
    const pr = reactions[photoId] || []
    return PHOTO_REACTIONS.map(emoji => {
      const matching = pr.filter((r: any) => r.emoji === emoji)
      return { emoji, count: matching.length, userReacted: matching.some((r: any) => r.user_id === user?.id) }
    }).filter(r => r.count > 0)
  }

  function getCommentReactionCounts(commentId: string) {
    const cr = commentReactions[commentId] || []
    return COMMENT_REACTIONS.map(emoji => {
      const matching = cr.filter((r: any) => r.emoji === emoji)
      return { emoji, count: matching.length, userReacted: matching.some((r: any) => r.user_id === user?.id) }
    }).filter(r => r.count > 0)
  }

  // @mention handling
  function handleCommentInput(val: string) {
    setNewComment(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1)
      if (!afterAt.includes(' ') && afterAt.length < 30) {
        setMentionQuery(afterAt.toLowerCase())
        return
      }
    }
    setMentionQuery(null)
  }

  function insertMention(name: string) {
    const lastAt = newComment.lastIndexOf('@')
    if (lastAt >= 0) {
      setNewComment(newComment.slice(0, lastAt) + '@' + name + ' ')
      setMentionQuery(null)
      commentInputRef.current?.focus()
    }
  }

  const filteredMembers = mentionQuery !== null ? memberList.filter(m => m.name.toLowerCase().includes(mentionQuery) || m.email.toLowerCase().includes(mentionQuery)) : []

  // Render @mentions highlighted in comment text (supports full names and legacy email prefixes)
  function renderCommentText(text: string) {
    if (!memberList.length) return <>{text}</>
    // Build list of all matchable tokens: full names + email prefixes (longest first)
    const tokens = new Set<string>()
    memberList.forEach(m => {
      tokens.add(m.name)
      if (m.email) tokens.add(m.email.split('@')[0])
    })
    const sorted = Array.from(tokens).sort((a, b) => b.length - a.length)
    const escaped = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(@(?:${escaped.join('|')}|\\w+))`, 'g')
    const parts = text.split(regex)
    return <>{parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1)
        const isMember = memberList.some(m => m.name === name || m.email?.split('@')[0] === name)
        if (isMember) return <span key={i} style={{ color: '#FF4D00', fontWeight: 700 }}>{part}</span>
      }
      return <span key={i}>{part}</span>
    })}</>
  }

  // Comment component for rendering a single comment with reactions, reply
  function CommentRow({ c, indent }: { c: any, indent: boolean }) {
    const [showCRxn, setShowCRxn] = useState(false)
    const counts = getCommentReactionCounts(c.id)
    return (
      <div style={{ paddingLeft: indent ? '20px' : '0', marginBottom: '8px' }}>
        <div style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#FF4D00' }}>{getName(c.user_email)}</span>
            <span style={{ fontSize: '10px', color: '#444' }}>{new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#ddd', marginBottom: '6px' }}>{renderCommentText(c.content)}</div>
          {/* Reaction counts */}
          {counts.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {counts.map(r => (
                <span key={r.emoji} onClick={() => toggleCommentReaction(c.id, r.emoji)} style={{ fontSize: '11px', background: r.userReacted ? 'rgba(255,77,0,0.15)' : 'rgba(255,255,255,0.06)', border: r.userReacted ? '1px solid #FF4D00' : '1px solid #2A2A2A', borderRadius: '10px', padding: '2px 6px', cursor: 'pointer' }}>
                  {r.emoji} {r.count}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span onClick={() => setShowCRxn(!showCRxn)} style={{ fontSize: '11px', color: '#666', cursor: 'pointer', fontWeight: 600 }}>React</span>
            {!indent && <span onClick={() => { setReplyTo(c); commentInputRef.current?.focus() }} style={{ fontSize: '11px', color: '#666', cursor: 'pointer', fontWeight: 600 }}>Reply</span>}
          </div>
          {showCRxn && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              {COMMENT_REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => { toggleCommentReaction(c.id, emoji); setShowCRxn(false) }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '4px 8px', fontSize: '16px', cursor: 'pointer' }}>{emoji}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading photos...</div>

  const currentPhoto = lightbox !== null ? photos[lightbox] : null
  const currentComments = currentPhoto ? (comments[currentPhoto.id] || []) : []
  const topLevelComments = currentComments.filter((c: any) => !c.parent_id)
  const getReplies = (parentId: string) => currentComments.filter((c: any) => c.parent_id === parentId)

  return (
    <div>
      {/* Upload Button */}
      {canInteract ? (<>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
      <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
        📸 Upload Photos
      </button>
      </>) : (
      <div style={{ textAlign: 'center', padding: '14px', background: '#161616', borderRadius: '12px', border: '1px solid #2A2A2A', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>RSVP &quot;Going&quot; to upload photos</div>
      </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No photos yet</div>
          <div style={{ fontSize: '13px' }}>Be the first to share a memory!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', borderRadius: '12px', overflow: 'hidden', padding: '0 2px' }}>
          {photos.map((photo, idx) => {
            const counts = getReactionCounts(photo.id)
            const cmtCount = (comments[photo.id] || []).length
            return (
              <div key={photo.id} onClick={() => { setLightbox(idx); setShowComments(false); setReplyTo(null); setNewComment(''); setMentionQuery(null) }} style={{ aspectRatio: '1', cursor: 'pointer', position: 'relative', overflow: 'hidden', background: '#1A1A1A', borderRadius: '6px' }}>
                <img src={photo.file_url} alt={photo.caption || photo.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {(counts.length > 0 || cmtCount > 0) && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '12px 6px 4px', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {counts.slice(0, 3).map(r => (
                      <span key={r.emoji} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '1px 4px' }}>{r.emoji}{r.count}</span>
                    ))}
                    {cmtCount > 0 && <span style={{ fontSize: '10px', color: '#ccc' }}>💬{cmtCount}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>📸 {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}</h2>
              <span onClick={() => fileInputRef.current?.click()} style={{ fontSize: '13px', color: '#FF4D00', fontWeight: 600, cursor: 'pointer' }}>Change</span>
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                {previews.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '1', position: 'relative', background: '#1A1A1A' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Caption (optional)</label>
              <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." style={inputStyle} />
            </div>
            {uploading && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ height: '6px', background: '#2A2A2A', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#FF4D00', borderRadius: '3px', width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '6px' }}>{uploadProgress}%</div>
              </div>
            )}
            <button onClick={uploadPhotos} disabled={uploading || !selectedFiles.length} style={{ width: '100%', background: uploading || !selectedFiles.length ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: uploading || !selectedFiles.length ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: uploading || !selectedFiles.length ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
              {uploading ? `Uploading... ${uploadProgress}%` : `Upload ${selectedFiles.length || ''} Photo${selectedFiles.length !== 1 ? 's' : ''} →`}
            </button>
            <button onClick={() => { setShowUpload(false); setSelectedFiles([]); setPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return [] }); setCaption('') }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && currentPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', flexShrink: 0 }}>
            <button onClick={() => { setLightbox(null); setConfirmDelete(null); setShowComments(false); setReplyTo(null); setNewComment(''); setMentionQuery(null) }} style={{ background: 'none', border: 'none', color: '#F0F0F0', fontSize: '16px', fontWeight: 700, cursor: 'pointer', padding: '8px' }}>✕ Close</button>
            <div style={{ fontSize: '13px', color: '#666' }}>{lightbox + 1} / {photos.length}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => downloadPhoto(currentPhoto)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#F0F0F0', fontSize: '14px', cursor: 'pointer', padding: '8px 12px' }}>⬇</button>
              {(currentPhoto.user_id === user?.id || isHost || isCohost) && (
                <button onClick={() => setConfirmDelete(currentPhoto.id)} style={{ background: 'rgba(255,77,0,0.15)', border: 'none', borderRadius: '8px', color: '#FF4D00', fontSize: '14px', cursor: 'pointer', padding: '8px 12px' }}>🗑</button>
              )}
            </div>
          </div>

          {/* Image */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', position: 'relative', flexShrink: 0 }}>
            {lightbox > 0 && (
              <button onClick={() => { setLightbox(lightbox - 1); setShowComments(false); setReplyTo(null); setNewComment(''); setMentionQuery(null) }} style={{ position: 'absolute', left: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '18px', cursor: 'pointer', zIndex: 1 }}>‹</button>
            )}
            <img src={currentPhoto.file_url} alt={currentPhoto.caption || ''} style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain', borderRadius: '8px' }} />
            {lightbox < photos.length - 1 && (
              <button onClick={() => { setLightbox(lightbox + 1); setShowComments(false); setReplyTo(null); setNewComment(''); setMentionQuery(null) }} style={{ position: 'absolute', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '18px', cursor: 'pointer', zIndex: 1 }}>›</button>
            )}
          </div>

          {/* Interaction area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 32px' }}>
            {/* Caption & attribution */}
            {currentPhoto.caption && <div style={{ fontSize: '15px', color: '#F0F0F0', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>{currentPhoto.caption}</div>}
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginBottom: '12px' }}>
              By {getName(currentPhoto.user_email)} · {new Date(currentPhoto.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>

            {/* Emoji reaction bar */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {PHOTO_REACTIONS.map(emoji => {
                const pr = reactions[currentPhoto.id] || []
                const count = pr.filter((r: any) => r.emoji === emoji).length
                const reacted = pr.some((r: any) => r.emoji === emoji && r.user_id === user.id)
                return (
                  <button key={emoji} onClick={() => toggleReaction(currentPhoto.id, emoji)} style={{ background: reacted ? 'rgba(255,77,0,0.15)' : 'rgba(255,255,255,0.08)', border: reacted ? '1px solid #FF4D00' : '1px solid #2A2A2A', borderRadius: '20px', padding: '5px 10px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {emoji}{count > 0 && <span style={{ fontSize: '12px', color: reacted ? '#FF4D00' : '#888', fontWeight: 700 }}>{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Comments toggle */}
            <button onClick={() => setShowComments(!showComments)} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '10px 14px', color: '#F0F0F0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showComments ? '12px' : '0' }}>
              <span>💬 Comments {currentComments.length > 0 ? `(${currentComments.length})` : ''}</span>
              <span style={{ color: '#666' }}>{showComments ? '▲' : '▼'}</span>
            </button>

            {/* Comments section */}
            {showComments && (
              <div>
                {topLevelComments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', padding: '16px 0' }}>No comments yet</div>
                ) : (
                  <div style={{ marginBottom: '12px' }}>
                    {topLevelComments.map((c: any) => (
                      <div key={c.id}>
                        <CommentRow c={c} indent={false} />
                        {getReplies(c.id).map((r: any) => <CommentRow key={r.id} c={r} indent={true} />)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply indicator */}
                {replyTo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,77,0,0.1)', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', fontSize: '12px', color: '#FF4D00', fontWeight: 600 }}>
                    <span>Replying to @{getName(replyTo.user_email)}</span>
                    <span onClick={() => setReplyTo(null)} style={{ cursor: 'pointer', fontSize: '14px' }}>✕</span>
                  </div>
                )}

                {/* @mention dropdown */}
                {mentionQuery !== null && filteredMembers.length > 0 && (
                  <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '10px', marginBottom: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                    {filteredMembers.slice(0, 5).map(m => (
                      <div key={m.email} onClick={() => insertMention(m.name)} style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', color: '#F0F0F0', borderBottom: '1px solid #1A1A1A' }}>
                        <span style={{ fontWeight: 700, color: '#FF4D00' }}>@{m.name}</span> <span style={{ color: '#666', fontSize: '11px' }}>{m.email}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {canInteract ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input ref={commentInputRef} value={newComment} onChange={e => handleCommentInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(currentPhoto.id) } }} placeholder="Add a comment... use @ to mention" style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  <button onClick={() => addComment(currentPhoto.id)} disabled={sendingComment || !newComment.trim()} style={{ background: sendingComment || !newComment.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '10px', padding: '10px 16px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: sendingComment || !newComment.trim() ? 'not-allowed' : 'pointer' }}>→</button>
                </div>
                ) : (
                <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#666', fontWeight: 600 }}>RSVP &quot;Going&quot; to comment</div>
                )}
              </div>
            )}
          </div>

          {/* Delete confirmation */}
          {confirmDelete === currentPhoto.id && (
            <div style={{ position: 'absolute', bottom: '80px', left: '20px', right: '20px', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '20px', textAlign: 'center', zIndex: 10 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Delete this photo?</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>This can&apos;t be undone</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => deletePhoto(currentPhoto)} style={{ flex: 1, background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 77, 0, 0.4)' }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signalHighIntent } = usePWAInstall()
  const eventId = searchParams.get('id')

  const [user, setUser] = useState<any>(null)
  const [event, setEvent] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [flights, setFlights] = useState<any[]>([])
  const [lodgings, setLodgings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [linkCopied, setLinkCopied] = useState(false)
  const [inviteRole, setInviteRole] = useState('member')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [rsvpExpanded, setRsvpExpanded] = useState<string | null>(null)
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})
  const [emailToIdMap, setEmailToIdMap] = useState<Record<string, string>>({})
  const [myProfile, setMyProfile] = useState<any>(null)
  const [pendingImportsCount, setPendingImportsCount] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDestination, setEditDestination] = useState('')
  const [editDates, setEditDates] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editEventTime, setEditEventTime] = useState('')
  const [editEventType, setEditEventType] = useState('Birthday')
  const [editInvitePermission, setEditInvitePermission] = useState('admin_only')
  const [editRequiresTravel, setEditRequiresTravel] = useState(false)
  const [editPaymentsEnabled, setEditPaymentsEnabled] = useState(true)
  const [editVotingEnabled, setEditVotingEnabled] = useState(true)
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const editDateRef = useRef<HTMLInputElement>(null)
  const editEndDateRef = useRef<HTMLInputElement>(null)

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [showPostForm, setShowPostForm] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function getName(emailOrId: string | undefined | null): string {
    if (!emailOrId) return 'Unknown'
    return profileMap[emailOrId] || emailOrId.split('@')[0]
  }
  function getInitial(emailOrId: string | undefined | null): string {
    return getName(emailOrId)[0]?.toUpperCase() || 'U'
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      if (!eventId) { router.push('/dashboard'); return }

      // Fetch all event data via server API (bypasses RLS)
      const res = await fetch(`/api/event-data?eventId=${eventId}&userId=${user.id}&userEmail=${encodeURIComponent(user.email!)}`)
      if (!res.ok) { router.push('/dashboard'); return }
      const data = await res.json()

      setEvent(data.event)
      setMembers(data.members)
      setFlights(data.flights)
      setLodgings(data.lodgings)
      setAnnouncements(data.announcements)
      setProfileMap(data.profileMap)
      setEmailToIdMap(data.emailToIdMap)
      if (data.myProfile) setMyProfile(data.myProfile)
      setPendingImportsCount(data.pendingImportsCount)

      setLoading(false)
    }
    load()
  }, [eventId])

  const isHost = event?.owner_id === user?.id
  const isCohost = members.some(m => m.user_email === user?.email && m.role_level === 'cohost')
  const canInvite = isHost || event?.invite_permission === 'anyone'
  const canRemove = isHost || isCohost
  const myMembership = members.find(m => m.user_email === user?.email)
  const myRsvpStatus = isHost ? 'going' : (myMembership?.rsvp_status || null)
  const canInteract = isHost || isCohost || myRsvpStatus === 'going'
  const rsvpCounts = {
    going: members.filter(m => m.rsvp_status === 'going').length + 1,
    maybe: members.filter(m => m.rsvp_status === 'maybe').length,
    not_going: members.filter(m => m.rsvp_status === 'not_going').length,
    invited: members.filter(m => (m.rsvp_status || 'invited') === 'invited').length,
  }

  const getCountdown = (dateStr: string) => {
    if (!dateStr) return null
    const eventDate = new Date(dateStr)
    if (isNaN(eventDate.getTime())) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'Past event'
    if (diff === 0) return 'Today! 🎉'
    if (diff === 1) return 'Tomorrow!'
    return `${diff} days away`
  }

  const getEmoji = (type: string) => ({ Birthday: '🎂', Bachelor: '🎉', Vacation: '☀️', Wedding: '💒', Holiday: '🎄', Other: '✨' } as any)[type] || '✨'

  async function postAnnouncement() {
    if (!postContent.trim()) return
    setPosting(true)
    const { data, error } = await supabase.from('event_announcements').insert({
      event_id: eventId,
      user_id: user.id,
      user_email: user.email,
      content: postContent.trim()
    }).select()
    if (data && data.length > 0) {
      setAnnouncements(prev => [data[0], ...prev])
    }
    setPostContent('')
    setShowPostForm(false)
    setPosting(false)

    // Send push + email notification to all members
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        type: 'announcement',
        title: `📢 ${myProfile?.full_name || 'Someone'} posted an update`,
        body: postContent.trim().slice(0, 100),
        excludeUserId: user.id,
        sendEmail: true,
        emailSubject: `📢 New update in ${event?.name}`,
      }),
    }).catch(() => {})
  }

  async function deleteAnnouncement(id: string) {
    await supabase.from('event_announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setDeleteAnnouncementId(null)
  }

  async function inviteByEmail() {
    if (!inviteEmail.trim()) return
    const email = inviteEmail.trim().toLowerCase()

    // Check if already a member
    if (members.some(m => m.user_email?.toLowerCase() === email) || email === user?.email?.toLowerCase()) {
      setInviteEmail('')
      return
    }

    setInviting(true)

    const { data: inserted } = await supabase.from('event_members').insert({
      event_id: eventId,
      user_email: email,
      role: inviteRole,
      role_level: inviteRole,
    }).select().single()

    await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        eventName: event?.name,
        eventId,
        inviterEmail: user?.email,
        inviterName: myProfile?.full_name || user?.email,
        eventDate: event?.dates,
        destination: event?.destination,
        eventType: event?.event_type,
      }),
    })

    if (inserted) {
      setMembers(prev => [...prev, inserted])
    }
    setInviteEmail('')
    setInviteSuccess(true)
    setTimeout(() => setInviteSuccess(false), 3000)
    setInviting(false)
  }


  async function removeMember(member: any) {
    await fetch('/api/remove-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, memberId: member.id || null, memberEmail: member.user_email, userId: user?.id }),
    })
    setMembers(prev => prev.filter(m => m.user_email !== member.user_email))
    setConfirmRemove(null)
  }

  async function updateRsvp(status: 'going' | 'maybe' | 'not_going') {
    if (!myMembership) return
    const res = await fetch('/api/update-rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId: myMembership.id, userId: user?.id, status }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === myMembership.id ? { ...m, rsvp_status: status } : m))
      if (status === 'going') signalHighIntent()

      // Notify host about RSVP change
      const statusEmoji = status === 'going' ? '✅' : status === 'maybe' ? '🤔' : '❌'
      const statusLabel = status === 'going' ? 'is going' : status === 'maybe' ? 'is maybe' : 'is not going'
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          type: 'rsvp',
          title: `${statusEmoji} ${myProfile?.full_name || 'Someone'} ${statusLabel}`,
          excludeUserId: user?.id,
          sendEmail: false,
        }),
      }).catch(() => {})
    }
  }

  const eventTypes = [
    { label: 'Birthday', emoji: '🎂' },
    { label: 'Bachelor / Bachelorette', emoji: '🎉' },
    { label: 'Vacation', emoji: '☀️' },
    { label: 'Wedding', emoji: '💒' },
    { label: 'Business', emoji: '💼' },
    { label: 'Other', emoji: '✨' },
  ]

  function openEditModal() {
    setEditName(event?.name || '')
    setEditDescription(event?.description || '')
    setEditDestination(event?.destination || '')
    setEditDates(event?.dates || '')
    setEditEndDate(event?.end_date || '')
    setEditEventTime(event?.event_time || '')
    setEditEventType(event?.event_type || 'Birthday')
    setEditInvitePermission(event?.invite_permission || 'admin_only')
    setEditRequiresTravel(!!(event?.requires_flights || event?.requires_lodging))
    setEditPaymentsEnabled(event?.payments_enabled !== false)
    setEditVotingEnabled(event?.voting_enabled !== false)
    setShowEditModal(true)
  }

  const [editError, setEditError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function deleteEvent() {
    if (!eventId || !user) return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId: user.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to delete event')
      router.push('/dashboard')
    } catch (err: any) {
      setEditError('Failed to delete event: ' + err.message)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function saveEventEdit() {
    if (!editName.trim()) return
    setEditSaving(true)
    setEditError('')
    // Core fields that always exist
    const payload: Record<string, any> = {
      name: editName,
      description: editDescription || null,
      destination: editDestination,
      dates: editDates,
      event_type: editEventType,
      invite_permission: editInvitePermission,
      requires_flights: editRequiresTravel,
      requires_lodging: editRequiresTravel,
    }
    // New columns — only include if they exist on current event object (i.e. migration has been run)
    if (event && 'end_date' in event) payload.end_date = editEndDate || null
    if (event && 'event_time' in event) payload.event_time = editEventTime || null
    if (event && 'requires_rental_cars' in event) payload.requires_rental_cars = editRequiresTravel
    if (event && 'payments_enabled' in event) payload.payments_enabled = editPaymentsEnabled
    if (event && 'voting_enabled' in event) payload.voting_enabled = editVotingEnabled

    const { data, error } = await supabase.from('events').update(payload).eq('id', eventId).select()
    if (error) {
      console.error('Edit event error:', error)
      setEditError(error.message || 'Failed to save changes')
    } else if (data && data.length > 0) {
      setEvent(data[0])
      setShowEditModal(false)
    } else {
      setEditError('No rows updated — you may not have permission to edit this event.')
    }
    setEditSaving(false)
  }

  function shareViaText() {
    const message = `Hey! You're invited to ${event?.name}. Join here: https://evnt.team/invite/${eventId}`
    window.open(`sms:?body=${encodeURIComponent(message)}`)
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://evnt.team/invite/${eventId}`)
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000)
  }

  const tabs = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
    { id: 'itinerary', icon: '🗓', label: 'Itinerary' },
    { id: 'photos', icon: '📸', label: 'Photos' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    ...(event?.voting_enabled !== false ? [{ id: 'vote', icon: '🗳', label: 'Vote' }] : []),
    ...(event?.payments_enabled !== false ? [{ id: 'payments', icon: '💰', label: 'Payments' }] : []),
    ...((event?.requires_flights || event?.requires_lodging) ? [{ id: 'travel', icon: '🧳', label: 'Travel' }] : []),
  ]

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>Loading...</main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '100px' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: isDesktop ? '900px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isHost && <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>👑 Host</div>}
          <div onClick={() => router.push('/profile')} style={{ position: 'relative', cursor: 'pointer' }}>
            {myProfile?.avatar_url ? (
              <img src={myProfile.avatar_url} alt="profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                {myProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {pendingImportsCount > 0 && (
              <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#FF4D00', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#fff' }}>
                {pendingImportsCount}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', borderBottom: '1px solid #1A1A1A', maxWidth: isDesktop ? '900px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{getEmoji(event?.event_type)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>{event?.name}</h1>
          {(isHost || isCohost) && <button onClick={openEditModal} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)', whiteSpace: 'nowrap' }}>Edit Event</button>}
        </div>
        {event?.description && (() => {
          const isLong = event.description.length > 120
          return (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: '#999', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden', maxHeight: !isLong || descExpanded ? 'none' : '3.2em' }}>
                {event.description}
              </div>
              {isLong && (
                <button onClick={() => setDescExpanded(!descExpanded)} style={{ background: 'none', border: 'none', padding: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#FF4D00', cursor: 'pointer' }}>
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )
        })()}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {event?.destination && <div style={{ fontSize: '13px', color: '#888' }}>📍 {event.destination}</div>}
          {event?.dates && <div style={{ fontSize: '13px', color: '#888' }}>📅 {(() => {
            const fmt = (d: string) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return d } }
            return event.end_date ? `${fmt(event.dates)} – ${fmt(event.end_date)}` : fmt(event.dates)
          })()}</div>}
          {event?.event_time && <div style={{ fontSize: '13px', color: '#888' }}>🕐 {formatTime(event.event_time)}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {getCountdown(event?.dates) && <div style={{ fontSize: '13px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>⏳ {getCountdown(event?.dates)}</div>}
          {(event?.requires_flights || event?.requires_lodging) && <div style={{ fontSize: '12px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,77,0,0.1)', color: '#FF4D00' }}>🧳 Travel</div>}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1A1A1A', overflowX: 'auto', maxWidth: isDesktop ? '900px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flexShrink: 0, padding: '12px 12px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #FF4D00' : '2px solid transparent', color: activeTab === tab.id ? '#FF4D00' : '#666', fontSize: '10px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ fontSize: '20px', display: 'block', marginBottom: '2px' }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {!isHost && myMembership && (
        <div style={{ padding: '12px 24px', background: '#161616', borderBottom: '1px solid #2A2A2A', maxWidth: isDesktop ? '900px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Your RSVP</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'going', emoji: '✅', label: 'Going', color: '#00E676', bg: 'rgba(0,230,118,0.12)' },
              { key: 'maybe', emoji: '🤔', label: 'Maybe', color: '#FFD600', bg: 'rgba(255,214,0,0.12)' },
              { key: 'not_going', emoji: '❌', label: "Can't Go", color: '#FF4D00', bg: 'rgba(255,77,0,0.12)' },
            ].map(opt => (
              <button key={opt.key} onClick={() => updateRsvp(opt.key as any)} style={{ flex: 1, padding: '10px 8px', borderRadius: '10px', border: `1px solid ${myRsvpStatus === opt.key ? opt.color : '#2A2A2A'}`, background: myRsvpStatus === opt.key ? opt.bg : '#0A0A0A', color: myRsvpStatus === opt.key ? opt.color : '#888', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>{opt.emoji} {opt.label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '24px', maxWidth: isDesktop ? '900px' : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        {activeTab === 'overview' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>Attendees</div>
                {canInvite && <button onClick={() => setShowInviteModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>+ Invite</button>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[
                  { key: 'going', emoji: '✅', label: 'Going', count: rsvpCounts.going, color: '#00E676', bg: 'rgba(0,230,118,0.12)' },
                  { key: 'maybe', emoji: '🤔', label: 'Maybe', count: rsvpCounts.maybe, color: '#FFD600', bg: 'rgba(255,214,0,0.12)' },
                  { key: 'not_going', emoji: '❌', label: 'No', count: rsvpCounts.not_going, color: '#FF4D00', bg: 'rgba(255,77,0,0.12)' },
                  { key: 'invited', emoji: '⏳', label: 'Invited', count: rsvpCounts.invited, color: '#888', bg: 'rgba(255,255,255,0.06)' },
                ].filter(p => p.count > 0).map(pill => (
                  <div key={pill.key} onClick={() => setRsvpExpanded(rsvpExpanded === pill.key ? null : pill.key)} style={{ padding: '6px 12px', borderRadius: '20px', background: rsvpExpanded === pill.key ? pill.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${rsvpExpanded === pill.key ? pill.color : '#2A2A2A'}`, fontSize: '13px', fontWeight: 700, color: pill.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>{pill.emoji} {pill.count} {pill.label}</div>
                ))}
              </div>
              {rsvpExpanded && (
                <div>
                  {rsvpExpanded === 'going' && (
                    <div onClick={() => router.push(`/profile/${user?.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#161616', borderRadius: '8px', marginBottom: '4px', border: '1px solid #2A2A2A', cursor: 'pointer' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{getInitial(user?.email)}</div>
                      <div style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{getName(user?.email)}</div>
                      <span style={{ fontSize: '14px' }}>👑</span>
                    </div>
                  )}
                  {members.filter(m => (m.rsvp_status || 'invited') === rsvpExpanded).map((member, i) => {
                    const canRemoveThis = canRemove && !(isCohost && !isHost && member.role_level === 'cohost')
                    return confirmRemove === member.id ? (
                      <div key={i} style={{ padding: '14px', background: '#1A1010', borderRadius: '10px', marginBottom: '8px', border: '1px solid #FF4D00' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#F0F0F0', marginBottom: '12px' }}>Remove {getName(member.user_email)}?</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => removeMember(member)} style={{ flex: 1, background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                          <button onClick={() => setConfirmRemove(null)} style={{ flex: 1, background: '#2A2A2A', border: 'none', borderRadius: '8px', padding: '10px', color: '#F0F0F0', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key={i} onClick={() => { const uid = emailToIdMap[member.user_email]; if (uid) router.push(`/profile/${uid}`) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#161616', borderRadius: '8px', marginBottom: '4px', border: '1px solid #2A2A2A', cursor: emailToIdMap[member.user_email] ? 'pointer' : 'default' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{getInitial(member.user_email)}</div>
                        <div style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{getName(member.user_email)}</div>
                        <span style={{ fontSize: '14px' }}>{member.role_level === 'cohost' ? '⭐' : '👤'}</span>
                        {canRemoveThis && (
                          <div onClick={() => setConfirmRemove(member.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,77,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <span style={{ color: '#FF4D00', fontSize: '12px', fontWeight: 700 }}>✕</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {members.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px', border: '2px dashed #2A2A2A', borderRadius: '10px' }}>No members yet — invite your crew!</div>}
            </div>

            {/* Announcements Section */}
            {(isHost || isCohost || announcements.length > 0) && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Announcements</div>

                {(isHost || isCohost) && !showPostForm && (
                  <div onClick={() => setShowPostForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', marginBottom: '12px', background: '#161616', border: '1px dashed #FF4D00', borderRadius: '12px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '18px' }}>📢</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF4D00' }}>Post Update</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>Share an announcement with your group</div>
                    </div>
                  </div>
                )}

                {(isHost || isCohost) && showPostForm && (
                  <div style={{ padding: '16px', marginBottom: '12px', background: '#161616', border: '1px solid #FF4D00', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>New Announcement</div>
                      <span onClick={() => { setShowPostForm(false); setPostContent('') }} style={{ color: '#666', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>✕</span>
                    </div>
                    <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="What's the update?" rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button onClick={postAnnouncement} disabled={posting || !postContent.trim()} style={{ background: postContent.trim() ? '#FF4D00' : '#333', border: 'none', borderRadius: '8px', padding: '8px 20px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: postContent.trim() ? 'pointer' : 'default', boxShadow: postContent.trim() ? '0 2px 8px rgba(255, 77, 0, 0.35)' : 'none' }}>
                        {posting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                )}

                {announcements.map(post => (
                  <div key={post.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>{getInitial(post.user_email)}</div>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0F0F0' }}>{getName(post.user_email)}</span>
                          <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>{timeAgo(post.created_at)}</span>
                        </div>
                      </div>
                      {(isHost || isCohost) && post.user_id === user?.id && (
                        <div onClick={() => setDeleteAnnouncementId(deleteAnnouncementId === post.id ? null : post.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,77,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <span style={{ color: '#FF4D00', fontSize: '12px', fontWeight: 700 }}>✕</span>
                        </div>
                      )}
                    </div>
                    {deleteAnnouncementId === post.id && (
                      <div style={{ background: '#1A1010', border: '1px solid #FF4D00', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#F0F0F0', marginBottom: '8px' }}>Delete this announcement?</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => deleteAnnouncement(post.id)} style={{ flex: 1, background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                          <button onClick={() => setDeleteAnnouncementId(null)} style={{ flex: 1, background: '#2A2A2A', border: 'none', borderRadius: '8px', padding: '8px', color: '#F0F0F0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: '14px', color: '#F0F0F0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.content}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              {tabs.filter(t => t.id !== 'overview').map(action => (
                <div key={action.id} onClick={() => setActiveTab(action.id)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', width: 'calc(50% - 6px)', flexShrink: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{action.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{action.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'itinerary' && <ItineraryTab eventId={eventId!} user={user} event={event} members={members} setActiveTab={setActiveTab} canInteract={canInteract} votingEnabled={event?.voting_enabled !== false} />}
        {activeTab === 'travel' && <TravelTab eventId={eventId!} user={user} members={members} getName={getName} isDesktop={isDesktop} />}
        {activeTab === 'payments' && <PaymentsTab eventId={eventId!} user={user} members={members} event={event} getName={getName} isDesktop={isDesktop} canInteract={canInteract} />}
        {activeTab === 'chat' && <ChatTab eventId={eventId!} user={user} members={members} flights={flights} lodgings={lodgings} getName={getName} isDesktop={isDesktop} canInteract={canInteract} />}

        {activeTab === 'vote' && <VoteTab eventId={eventId!} user={user} members={members} event={event} canInteract={canInteract} />}

        {activeTab === 'photos' && <PhotosTab eventId={eventId!} user={user} event={event} members={members} getName={getName} canInteract={canInteract} />}
      </div>

      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#161616', borderRadius: isDesktop ? '16px' : '24px 24px 0 0', padding: '28px 24px 40px', width: isDesktop ? '480px' : '100%', border: '1px solid #2A2A2A', boxSizing: 'border-box', maxHeight: isDesktop ? '85vh' : undefined, overflowY: isDesktop ? 'auto' : undefined }}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Invite Friends</h2>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>Invite people to {event?.name}</p>
            <button onClick={shareViaText} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}>
              <span style={{ fontSize: '20px' }}>💬</span> Share via Text
            </button>
            <button onClick={copyLink} style={{ width: '100%', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, color: linkCopied ? '#00E676' : '#F0F0F0', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}>
              <span style={{ fontSize: '20px' }}>{linkCopied ? '✅' : '🔗'}</span> {linkCopied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>OR INVITE BY EMAIL</div>
              <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Invite As</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ value: 'cohost', label: '⭐ Co-host', desc: 'Can manage event' }, { value: 'member', label: '👤 Member', desc: 'Standard access' }].map(option => (
                  <div key={option.value} onClick={() => setInviteRole(option.value)} style={{ flex: 1, padding: '10px', background: inviteRole === option.value ? 'rgba(255,77,0,0.15)' : '#0A0A0A', border: `1px solid ${inviteRole === option.value ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{option.label}</div>
                    <div style={{ fontSize: '11px', color: inviteRole === option.value ? '#FF4D00' : '#666', fontWeight: 600 }}>{option.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="friend@gmail.com" type="email" style={{ ...inputStyle, marginBottom: '12px' }} />
            {inviteSuccess && <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid #00E676', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '13px', color: '#00E676', fontWeight: 700, marginBottom: '12px' }}>✅ Invite sent!</div>}
            <button onClick={inviteByEmail} disabled={inviting || !inviteEmail.trim()} style={{ width: '100%', background: inviting || !inviteEmail.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: inviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: inviting || !inviteEmail.trim() ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
              {inviting ? 'Sending...' : 'Send Invite →'}
            </button>
            <button onClick={() => setShowInviteModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: isDesktop ? '16px' : '24px 24px 0 0', padding: '28px 24px 40px', width: isDesktop ? '480px' : '100%', border: '1px solid #2A2A2A', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            {!isDesktop && <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />}
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Edit Event ✏️</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Event Name *</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Event name" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Tell your guests what this event is about..." rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Destination</label>
              <input value={editDestination} onChange={e => setEditDestination(e.target.value)} placeholder="Nashville, TN" style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Date</label>
                <input ref={editDateRef} type="date" value={editDates} onChange={e => setEditDates(e.target.value)} onClick={() => { try { editDateRef.current?.showPicker() } catch {} }} style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' } as any} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Date</label>
                <input ref={editEndDateRef} type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} onClick={() => { try { editEndDateRef.current?.showPicker() } catch {} }} style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' } as any} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Event Time</label>
              <input type="time" value={editEventTime} onChange={e => setEditEventTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>Event Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {eventTypes.map(type => (
                  <div key={type.label} onClick={() => setEditEventType(type.label)} style={{ padding: '10px', background: editEventType === type.label ? 'rgba(255,77,0,0.15)' : '#0A0A0A', border: `1px solid ${editEventType === type.label ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{type.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: editEventType === type.label ? '#FF4D00' : '#666' }}>{type.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>Who Can Invite?</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'admin_only', label: '👑 Host', desc: 'Only you' },
                  { value: 'cohost', label: '⭐ Co-hosts', desc: 'Host + co-hosts' },
                  { value: 'anyone', label: '👥 Anyone', desc: 'All members' },
                ].map(option => (
                  <div key={option.value} onClick={() => setEditInvitePermission(option.value)} style={{ flex: 1, padding: '10px 8px', background: editInvitePermission === option.value ? 'rgba(255,77,0,0.15)' : '#0A0A0A', border: `1px solid ${editInvitePermission === option.value ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{option.label}</div>
                    <div style={{ fontSize: '10px', color: editInvitePermission === option.value ? '#FF4D00' : '#666', fontWeight: 600 }}>{option.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={labelStyle}>Event Features</label>
              <ToggleRow value={editRequiresTravel} onChange={setEditRequiresTravel} label="🧳 Is travel required?" desc="Enable flights, lodging & rental car tracking" color="rgb(100,180,255)" bg="rgba(100,180,255,0.08)" />
              <ToggleRow value={editPaymentsEnabled} onChange={setEditPaymentsEnabled} label="💰 Enable payment tracking?" desc="Split bills and track group expenses" color="#00E676" bg="rgba(0,230,118,0.08)" />
              <ToggleRow value={editVotingEnabled} onChange={setEditVotingEnabled} label="🗳 Enable voting?" desc="Let members vote on activities" color="#FFD600" bg="rgba(255,214,0,0.08)" />
            </div>

            {editError && <div style={{ background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '12px', fontSize: '13px', color: '#ff6b6b' }}>{editError}</div>}
            <button onClick={saveEventEdit} disabled={editSaving || !editName.trim()} style={{ width: '100%', background: editSaving || !editName.trim() ? '#333' : '#FF4D00', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: editSaving || !editName.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: editSaving || !editName.trim() ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
              {editSaving ? 'Saving...' : 'Save Changes →'}
            </button>
            <button onClick={() => setShowEditModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>

            {/* Delete Event — host only */}
            {isHost && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #2A2A2A' }}>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ width: '100%', background: 'none', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 600, color: '#ff6b6b', cursor: 'pointer' }}>
                    Delete Event
                  </button>
                ) : (
                  <div style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '14px', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff6b6b', marginBottom: '8px' }}>Delete this event?</div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', lineHeight: '1.5' }}>This will permanently delete the event and all associated data (members, travel, photos, itinerary, bills). This cannot be undone.</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={deleteEvent} disabled={deleting} style={{ flex: 1, background: deleting ? '#555' : '#ff4444', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                        {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: '#888', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isCohost && !isHost && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #2A2A2A' }}>
                <button onClick={() => setShowDeleteConfirm(true)} style={{ width: '100%', background: 'none', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 600, color: '#ff6b6b', cursor: 'pointer' }}>
                  Delete Event
                </button>
                {showDeleteConfirm && (
                  <div style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '14px', padding: '18px', marginTop: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff6b6b', marginBottom: '8px' }}>Delete this event?</div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', lineHeight: '1.5' }}>This will permanently delete the event and all associated data (members, travel, photos, itinerary, bills). This cannot be undone.</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={deleteEvent} disabled={deleting} style={{ flex: 1, background: deleting ? '#555' : '#ff4444', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                        {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'none', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: '#888', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom nav hidden for now — will refine later */}
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