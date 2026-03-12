'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../../../lib/supabase'

const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }

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

function ItineraryTab({ eventId, user, event }: { eventId: string, user: any, event: any }) {
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
    setCategory('activity'); setIsVotable(false); setIsBooked(false); setEditItem(null)
  }

  async function saveItem() {
    if (!title.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, title, description, notes, date, start_time: startTime, end_time: endTime, location, category, is_votable: isVotable, is_booked: isBooked, created_by: user.id }
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
    setIsBooked(item.is_booked || false); setShowAddModal(true)
  }

  const getCategoryEmoji = (cat: string) => categories.find(c => c.value === cat)?.label.split(' ')[0] || '✨'
  const grouped = items.reduce((acc: any, item) => {
    const key = item.date || 'No Date'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>{items.length} {items.length === 1 ? 'Item' : 'Items'}</div>
        <button onClick={() => { resetForm(); setShowAddModal(true) }} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>+ Add Item</button>
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px', border: '2px dashed #2A2A2A', borderRadius: '14px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗓</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No itinerary items yet</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>Add activities, flights, lodging and more</div>
          <button onClick={() => { resetForm(); setShowAddModal(true) }} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(255, 77, 0, 0.35)' }}>Add First Item →</button>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateItems]: any) => (
          <div key={date} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF4D00', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #1A1A1A' }}>
              {date === 'No Date' ? 'No Date' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {dateItems.map((item: any) => (
              <div key={item.id} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
                <div onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '24px', flexShrink: 0 }}>{getCategoryEmoji(item.category)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.title}</div>
                      {item.is_votable && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>🗳 VOTE</div>}
                      {item.is_booked && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,230,118,0.15)', color: '#00E676' }}>✅ BOOKED</div>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {item.start_time && <span>🕐 {item.start_time}{item.end_time ? ` – ${item.end_time}` : ''}</span>}
                      {item.location && <span>📍 {item.location}</span>}
                    </div>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEdit(item)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer' }}>✏️ Edit</button>
                      <button onClick={() => deleteItem(item.id)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer' }}>🗑 Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>{editItem ? 'Edit Item' : 'Add Itinerary Item'}</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Title *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Dinner at The Palm" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {categories.map(cat => (
                  <div key={cat.value} onClick={() => setCategory(cat.value)} style={{ padding: '8px', background: category === cat.value ? 'rgba(255,77,0,0.15)' : '#0A0A0A', border: `1px solid ${category === cat.value ? '#FF4D00' : '#2A2A2A'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: category === cat.value ? '#FF4D00' : '#666' }}>{cat.label}</div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Date (optional)</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Location (optional)</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="123 Main St" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Description (optional)</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Private notes, reminders, links..." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ToggleRow value={isVotable} onChange={setIsVotable} label="🗳 Open to Group Vote" desc="Let members vote on this item" color="#FFD600" bg="rgba(255,214,0,0.08)" />
              <ToggleRow value={isBooked} onChange={setIsBooked} label="✅ Mark as Booked" desc="This item is confirmed" color="#00E676" bg="rgba(0,230,118,0.08)" />
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

function FlightCard({ flight, isOwn, onEdit, onDelete }: { flight: any, isOwn: boolean, onEdit?: () => void, onDelete?: () => void }) {
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
            <div style={{ fontSize: '11px', color: '#666' }}>{flight.user_email}</div>
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

function FlightsTab({ eventId, user, members }: { eventId: string, user: any, members: any[] }) {
  const [flights, setFlights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editFlight, setEditFlight] = useState<any>(null)
  const [airline, setAirline] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [departureAirport, setDepartureAirport] = useState('')
  const [arrivalAirport, setArrivalAirport] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('member_flights').select('*').eq('event_id', eventId).order('arrival_time', { ascending: true })
      setFlights(data || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  function resetForm() {
    setAirline(''); setFlightNumber(''); setDepartureAirport(''); setArrivalAirport('')
    setDepartureTime(''); setArrivalTime(''); setNotes(''); setEditFlight(null)
  }

  async function saveFlight() {
    if (!airline.trim() && !flightNumber.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, user_id: user.id, user_email: user.email, airline, flight_number: flightNumber, departure_airport: departureAirport, arrival_airport: arrivalAirport, departure_time: departureTime || null, arrival_time: arrivalTime || null, notes }
    if (editFlight) {
      const { data } = await supabase.from('member_flights').update(payload).eq('id', editFlight.id).select().single()
      if (data) setFlights(prev => prev.map(f => f.id === editFlight.id ? data : f))
    } else {
      const { data } = await supabase.from('member_flights').insert(payload).select().single()
      if (data) setFlights(prev => [...prev, data])
    }
    resetForm(); setShowModal(false); setSaving(false)
  }

  async function deleteFlight(id: string) {
    await supabase.from('member_flights').delete().eq('id', id)
    setFlights(prev => prev.filter(f => f.id !== id))
  }

  function openEdit(f: any) {
    setEditFlight(f); setAirline(f.airline || ''); setFlightNumber(f.flight_number || '')
    setDepartureAirport(f.departure_airport || ''); setArrivalAirport(f.arrival_airport || '')
    setDepartureTime(f.departure_time ? f.departure_time.slice(0, 16) : '')
    setArrivalTime(f.arrival_time ? f.arrival_time.slice(0, 16) : '')
    setNotes(f.notes || ''); setShowModal(true)
  }

  const myFlight = flights.find(f => f.user_id === user.id)
  const otherFlights = flights.filter(f => f.user_id !== user.id)

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>✈️ Flight Details</div>
        <button onClick={() => { resetForm(); setShowModal(true) }} style={{ background: '#64B4FF', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(100, 180, 255, 0.35)' }}>
          {myFlight ? '✏️ Edit My Flight' : '+ Add My Flight'}
        </button>
      </div>
      {myFlight ? (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64B4FF', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>MY FLIGHT</div>
          <FlightCard flight={myFlight} isOwn onEdit={() => openEdit(myFlight)} onDelete={() => deleteFlight(myFlight.id)} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', border: '2px dashed #2A2A2A', borderRadius: '14px', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✈️</div>
          <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>Add your flight info</div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Let the group know when you're arriving</div>
          <button onClick={() => { resetForm(); setShowModal(true) }} style={{ background: '#64B4FF', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(100, 180, 255, 0.35)' }}>Add My Flight →</button>
        </div>
      )}
      {otherFlights.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>GROUP FLIGHTS</div>
          {otherFlights.map(f => <FlightCard key={f.id} flight={f} isOwn={false} />)}
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
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
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Seat 14A, checked bag, etc." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <button onClick={saveFlight} disabled={saving || (!airline.trim() && !flightNumber.trim())} style={{ width: '100%', background: saving ? '#333' : '#64B4FF', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#000', cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving ? 'none' : '0 4px 14px rgba(100, 180, 255, 0.4)' }}>
              {saving ? 'Saving...' : editFlight ? 'Save Changes →' : 'Add Flight →'}
            </button>
            <button onClick={() => { setShowModal(false); resetForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
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

function LodgingTab({ eventId, user }: { eventId: string, user: any }) {
  const [lodgings, setLodgings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editLodging, setEditLodging] = useState<any>(null)
  const [hotelName, setHotelName] = useState('')
  const [address, setAddress] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('member_lodging').select('*').eq('event_id', eventId).order('check_in', { ascending: true })
      setLodgings(data || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  function resetForm() {
    setHotelName(''); setAddress(''); setCheckIn(''); setCheckOut('')
    setConfirmationCode(''); setNotes(''); setEditLodging(null)
  }

  async function saveLodging() {
    if (!hotelName.trim()) return
    setSaving(true)
    const payload = { event_id: eventId, user_id: user.id, user_email: user.email, hotel_name: hotelName, address, check_in: checkIn || null, check_out: checkOut || null, confirmation_code: confirmationCode, notes }
    if (editLodging) {
      const { data } = await supabase.from('member_lodging').update(payload).eq('id', editLodging.id).select().single()
      if (data) setLodgings(prev => prev.map(l => l.id === editLodging.id ? data : l))
    } else {
      const { data } = await supabase.from('member_lodging').insert(payload).select().single()
      if (data) setLodgings(prev => [...prev, data])
    }
    resetForm(); setShowModal(false); setSaving(false)
  }

  async function deleteLodging(id: string) {
    await supabase.from('member_lodging').delete().eq('id', id)
    setLodgings(prev => prev.filter(l => l.id !== id))
  }

  function openEdit(l: any) {
    setEditLodging(l); setHotelName(l.hotel_name || ''); setAddress(l.address || '')
    setCheckIn(l.check_in || ''); setCheckOut(l.check_out || '')
    setConfirmationCode(l.confirmation_code || ''); setNotes(l.notes || ''); setShowModal(true)
  }

  const myLodging = lodgings.find(l => l.user_id === user.id)
  const otherLodgings = lodgings.filter(l => l.user_id !== user.id)
  const hotelGroups = otherLodgings.reduce((acc: any, l) => {
    const key = l.hotel_name || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>🏨 Lodging</div>
        <button onClick={() => { resetForm(); setShowModal(true) }} style={{ background: '#B464FF', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(180, 100, 255, 0.35)' }}>
          {myLodging ? '✏️ Edit My Stay' : '+ Add My Stay'}
        </button>
      </div>
      {myLodging ? (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#B464FF', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>MY STAY</div>
          <LodgingCard lodging={myLodging} isOwn onEdit={() => openEdit(myLodging)} onDelete={() => deleteLodging(myLodging.id)} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', border: '2px dashed #2A2A2A', borderRadius: '14px', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏨</div>
          <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>Add your lodging info</div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Let the group know where you're staying</div>
          <button onClick={() => { resetForm(); setShowModal(true) }} style={{ background: '#B464FF', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 10px rgba(180, 100, 255, 0.35)' }}>Add My Stay →</button>
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
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{l.user_email?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{l.user_email}</div>
                    {(l.check_in || l.check_out) && <div style={{ fontSize: '11px', color: '#666' }}>{l.check_in && `Check-in: ${l.check_in}`}{l.check_in && l.check_out ? ' · ' : ''}{l.check_out && `Check-out: ${l.check_out}`}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>{editLodging ? '✏️ Edit Stay' : '🏨 Add My Stay'}</h2>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Hotel / Airbnb Name *</label><input value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="The Grand Hyatt" style={inputStyle} /></div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Address</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Broadway, Nashville TN" style={inputStyle} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Check-in</label><input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Check-out</label><input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' } as any} /></div>
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Confirmation Code</label><input value={confirmationCode} onChange={e => setConfirmationCode(e.target.value)} placeholder="ABC123XYZ" style={inputStyle} /></div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Pool access, parking, etc." rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' } as any} /></div>
            <button onClick={saveLodging} disabled={saving || !hotelName.trim()} style={{ width: '100%', background: saving || !hotelName.trim() ? '#333' : '#B464FF', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, color: '#fff', cursor: saving || !hotelName.trim() ? 'not-allowed' : 'pointer', marginBottom: '12px', boxShadow: saving || !hotelName.trim() ? 'none' : '0 4px 14px rgba(180, 100, 255, 0.4)' }}>
              {saving ? 'Saving...' : editLodging ? 'Save Changes →' : 'Add Stay →'}
            </button>
            <button onClick={() => { setShowModal(false); resetForm() }} style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '14px', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChatTab({ eventId, user, members, flights, lodgings }: { eventId: string, user: any, members: any[], flights: any[], lodgings: any[] }) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('chat_groups').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
      setGroups(data || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  useEffect(() => {
    if (!activeGroup) return
    async function loadMessages() {
      const { data } = await supabase.from('chat_messages').select('*').eq('group_id', activeGroup.id).order('created_at', { ascending: true })
      setMessages(data || [])
    }
    loadMessages()
    const sub = supabase.channel(`chat:${activeGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${activeGroup.id}` }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
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
    await supabase.from('chat_messages').insert({ group_id: activeGroup.id, event_id: eventId, user_id: user.id, user_email: user.email, content: newMessage.trim() })
    setNewMessage(''); setSending(false)
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
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => setActiveGroup(null)} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{activeGroup.name}</div>
          {activeGroup.auto_created && <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,214,0,0.15)', color: '#FFD600' }}>AUTO</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px', fontSize: '13px' }}>No messages yet — say hi! 👋</div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.user_id === user.id
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px' }}>
                  {!isMe && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{msg.user_email?.[0]?.toUpperCase()}</div>}
                  <div style={{ maxWidth: '75%' }}>
                    {!isMe && <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px', fontWeight: 600 }}>{msg.user_email}</div>}
                    <div style={{ background: isMe ? '#FF4D00' : '#1E1E1E', border: isMe ? 'none' : '1px solid #2A2A2A', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontSize: '14px', color: '#fff', lineHeight: 1.4 }}>{msg.content}</div>
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>{new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Message..." style={{ flex: 1, background: '#161616', border: '1px solid #2A2A2A', borderRadius: '24px', padding: '12px 16px', fontSize: '14px', color: '#fff', outline: 'none' }} />
          <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{ background: newMessage.trim() ? '#FF4D00' : '#333', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '18px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>↑</button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>💬 Chat Groups</div>
        <button onClick={() => setShowCreateModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>+ New Group</button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
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

function PhotosTab({ eventId, user, event, members }: { eventId: string, user: any, event: any, members: any[] }) {
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

  const isHost = event?.owner_id === user?.id
  const isCohost = members.some(m => m.user_email === user?.email && m.role_level === 'cohost')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      setPhotos(data || [])
      setLoading(false)
    }
    load()
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

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filePath, file)

      if (uploadError) continue

      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(filePath)

      const { data: photoRow } = await supabase
        .from('event_photos')
        .insert({
          event_id: eventId,
          user_id: user.id,
          user_email: user.email,
          file_url: urlData.publicUrl,
          file_name: file.name,
          caption: caption,
        })
        .select()
        .single()

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

  if (loading) return <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading photos...</div>

  return (
    <div>
      {/* Upload Button */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
      <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 4px 14px rgba(255, 77, 0, 0.4)' }}>
        📸 Upload Photos
      </button>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No photos yet</div>
          <div style={{ fontSize: '13px' }}>Be the first to share a memory!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', borderRadius: '12px', overflow: 'hidden' }}>
          {photos.map((photo, idx) => (
            <div key={photo.id} onClick={() => setLightbox(idx)} style={{ aspectRatio: '1', cursor: 'pointer', position: 'relative', overflow: 'hidden', background: '#1A1A1A' }}>
              <img src={photo.file_url} alt={photo.caption || photo.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
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

            {/* Previews */}
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                {previews.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '1', position: 'relative', background: '#1A1A1A' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Caption */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Caption (optional)</label>
              <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." style={inputStyle} />
            </div>

            {/* Progress */}
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
      {lightbox !== null && photos[lightbox] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
            <button onClick={() => { setLightbox(null); setConfirmDelete(null) }} style={{ background: 'none', border: 'none', color: '#F0F0F0', fontSize: '16px', fontWeight: 700, cursor: 'pointer', padding: '8px' }}>✕ Close</button>
            <div style={{ fontSize: '13px', color: '#666' }}>{lightbox + 1} / {photos.length}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => downloadPhoto(photos[lightbox])} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#F0F0F0', fontSize: '14px', cursor: 'pointer', padding: '8px 12px' }}>⬇</button>
              {(photos[lightbox].user_id === user?.id || isHost || isCohost) && (
                <button onClick={() => setConfirmDelete(photos[lightbox].id)} style={{ background: 'rgba(255,77,0,0.15)', border: 'none', borderRadius: '8px', color: '#FF4D00', fontSize: '14px', cursor: 'pointer', padding: '8px 12px' }}>🗑</button>
              )}
            </div>
          </div>

          {/* Image */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', position: 'relative' }}>
            {lightbox > 0 && (
              <button onClick={() => setLightbox(lightbox - 1)} style={{ position: 'absolute', left: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '18px', cursor: 'pointer', zIndex: 1 }}>‹</button>
            )}
            <img src={photos[lightbox].file_url} alt={photos[lightbox].caption || ''} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
            {lightbox < photos.length - 1 && (
              <button onClick={() => setLightbox(lightbox + 1)} style={{ position: 'absolute', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '18px', cursor: 'pointer', zIndex: 1 }}>›</button>
            )}
          </div>

          {/* Caption & attribution */}
          <div style={{ padding: '16px 20px 32px', textAlign: 'center' }}>
            {photos[lightbox].caption && <div style={{ fontSize: '15px', color: '#F0F0F0', fontWeight: 600, marginBottom: '6px' }}>{photos[lightbox].caption}</div>}
            <div style={{ fontSize: '12px', color: '#666' }}>
              By {photos[lightbox].user_email} · {new Date(photos[lightbox].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Delete confirmation */}
          {confirmDelete === photos[lightbox].id && (
            <div style={{ position: 'absolute', bottom: '80px', left: '20px', right: '20px', background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Delete this photo?</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>This can&apos;t be undone</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#F0F0F0', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => deletePhoto(photos[lightbox])} style={{ flex: 1, background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 77, 0, 0.4)' }}>Delete</button>
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/prototype'); return }
      setUser(user)
      if (!eventId) { router.push('/prototype/dashboard'); return }
      const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single()
      if (!eventData) { router.push('/prototype/dashboard'); return }
      setEvent(eventData)
      const { data: membersData } = await supabase.from('event_members').select('*').eq('event_id', eventId)
      setMembers(membersData || [])
      if (eventData.requires_flights) {
        const { data: flightsData } = await supabase.from('member_flights').select('*').eq('event_id', eventId)
        setFlights(flightsData || [])
      }
      if (eventData.requires_lodging) {
        const { data: lodgingsData } = await supabase.from('member_lodging').select('*').eq('event_id', eventId)
        setLodgings(lodgingsData || [])
      }
      setLoading(false)
    }
    load()
  }, [eventId])

  const isHost = event?.owner_id === user?.id
  const isCohost = members.some(m => m.user_email === user?.email && m.role_level === 'cohost')
  const canInvite = isHost || event?.invite_permission === 'anyone'
  const canRemove = isHost || isCohost

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

  async function inviteByEmail() {
    if (!inviteEmail.trim()) return
    setInviting(true)
  
    await supabase.from('event_members').insert({
      event_id: eventId,
      user_email: inviteEmail.trim(),
      role: inviteRole,
      role_level: inviteRole,
    })
  
    await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        eventName: event?.name,
        eventId,
        inviterEmail: user?.email,
      }),
    })
  
    setMembers(prev => [...prev, { user_email: inviteEmail.trim(), role: inviteRole }])
    setInviteEmail('')
    setInviteSuccess(true)
    setTimeout(() => setInviteSuccess(false), 3000)
    setInviting(false)
  }


  async function removeMember(member: any) {
    await supabase.from('event_members').delete().eq('id', member.id)
    setMembers(prev => prev.filter(m => m.id !== member.id))
    setConfirmRemove(null)
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
    ...(event?.requires_flights ? [{ id: 'flights', icon: '✈️', label: 'Flights' }] : []),
    ...(event?.requires_lodging ? [{ id: 'lodging', icon: '🏨', label: 'Lodging' }] : []),
    { id: 'vote', icon: '🗳', label: 'Vote' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'photos', icon: '📸', label: 'Photos' },
  ]

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>Loading...</main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '100px' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/prototype/dashboard')} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
        {isHost && <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>👑 Host</div>}
      </div>

      <div style={{ padding: '24px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{getEmoji(event?.event_type)}</div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>{event?.name}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {event?.destination && <div style={{ fontSize: '13px', color: '#888' }}>📍 {event.destination}</div>}
          {event?.dates && <div style={{ fontSize: '13px', color: '#888' }}>📅 {event.dates}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {getCountdown(event?.dates) && <div style={{ fontSize: '13px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,77,0,0.15)', color: '#FF4D00' }}>⏳ {getCountdown(event?.dates)}</div>}
          {event?.requires_flights && <div style={{ fontSize: '12px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px', background: 'rgba(100,180,255,0.1)', color: '#64B4FF' }}>✈️ Flights</div>}
          {event?.requires_lodging && <div style={{ fontSize: '12px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px', background: 'rgba(180,100,255,0.1)', color: '#B464FF' }}>🏨 Lodging</div>}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1A1A1A', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flexShrink: 0, padding: '12px 12px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #FF4D00' : '2px solid transparent', color: activeTab === tab.id ? '#FF4D00' : '#666', fontSize: '10px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {tab.icon}<br />{tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px' }}>
        {activeTab === 'overview' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>Members ({members.length + 1})</div>
                {canInvite && <button onClick={() => setShowInviteModal(true)} style={{ background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>+ Invite</button>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#161616', borderRadius: '10px', marginBottom: '8px', border: '1px solid #2A2A2A' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>{user?.email?.[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.email}</div>
                  <div style={{ fontSize: '11px', color: '#FF4D00', fontWeight: 700 }}>👑 Host</div>
                </div>
              </div>
              {members.map((member, i) => {
                const canRemoveThis = canRemove && !(isCohost && !isHost && member.role_level === 'cohost')
                return confirmRemove === member.id ? (
                  <div key={i} style={{ padding: '14px', background: '#1A1010', borderRadius: '10px', marginBottom: '8px', border: '1px solid #FF4D00' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F0F0F0', marginBottom: '12px' }}>Remove {member.user_email}?</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => removeMember(member)} style={{ flex: 1, background: '#FF4D00', border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 77, 0, 0.35)' }}>Remove</button>
                      <button onClick={() => setConfirmRemove(null)} style={{ flex: 1, background: '#2A2A2A', border: 'none', borderRadius: '8px', padding: '10px', color: '#F0F0F0', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#161616', borderRadius: '10px', marginBottom: '8px', border: '1px solid #2A2A2A' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>{member.user_email?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{member.user_email}</div>
                      <div style={{ fontSize: '11px', color: member.role_level === 'cohost' ? '#FFD600' : '#666', fontWeight: 700 }}>{member.role_level === 'cohost' ? '⭐ Co-host' : '👤 Member'} · Invited</div>
                    </div>
                    {canRemoveThis && (
                      <div onClick={() => setConfirmRemove(member.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,77,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <span style={{ color: '#FF4D00', fontSize: '14px', fontWeight: 700 }}>✕</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {members.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px', border: '2px dashed #2A2A2A', borderRadius: '10px' }}>No members yet — invite your crew!</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {tabs.filter(t => t.id !== 'overview').map(action => (
                <div key={action.id} onClick={() => setActiveTab(action.id)} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{action.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{action.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'itinerary' && <ItineraryTab eventId={eventId!} user={user} event={event} />}
        {activeTab === 'flights' && event?.requires_flights && <FlightsTab eventId={eventId!} user={user} members={members} />}
        {activeTab === 'lodging' && event?.requires_lodging && <LodgingTab eventId={eventId!} user={user} />}
        {activeTab === 'chat' && <ChatTab eventId={eventId!} user={user} members={members} flights={flights} lodgings={lodgings} />}

        {activeTab === 'vote' && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗳</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Voting coming soon</div>
            <div style={{ fontSize: '13px' }}>Let your crew vote on activities</div>
          </div>
        )}

        {activeTab === 'photos' && <PhotosTab eventId={eventId!} user={user} event={event} members={members} />}
      </div>

      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', border: '1px solid #2A2A2A', boxSizing: 'border-box' }}>
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
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

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderTop: '1px solid #1A1A1A', display: 'flex', padding: '12px 0 24px' }}>
        {[
          { icon: '⌂', label: 'Home', path: '/prototype/dashboard' },
          { icon: '🗓', label: 'Itinerary', path: '/prototype/itinerary' },
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