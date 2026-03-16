'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function PublicProfile() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // If viewing own profile, redirect to full profile page
      if (user && user.id === profileId) {
        router.replace('/profile')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone_number, phone_visible')
        .eq('id', profileId)
        .single()

      if (!profileData) {
        setNotFound(true)
      } else {
        setProfile(profileData)
      }
      setLoading(false)
    }
    load()
  }, [profileId])

  const getInitials = (name: string) => {
    if (name) return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    return '?'
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  if (notFound) return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>👤</div>
      <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Profile Not Found</div>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>This user doesn't exist or hasn't set up their profile.</div>
      <button onClick={() => router.back()} style={{ background: '#FF4D00', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
        Go Back
      </button>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      <div style={{ padding: '20px 24px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#FF4D00', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: '24px' }}>
          ← Back
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', marginBottom: '16px' }} />
          ) : (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#FF4D00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              {getInitials(profile.full_name || '')}
            </div>
          )}
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>{profile.full_name || 'Anonymous'}</div>

          {profile.phone_visible && profile.phone_number && (
            <a href={`tel:${profile.phone_number}`} style={{ fontSize: '14px', color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {profile.phone_number}
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
