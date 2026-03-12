'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'


export default function Login() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      // Check if user came from an invite link
      const redirect = typeof window !== 'undefined' ? sessionStorage.getItem('evnt_invite_redirect') : null
      if (redirect) {
        sessionStorage.removeItem('evnt_invite_redirect')
        router.push(redirect)
      } else {
        router.push('/prototype/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0',
      fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 20px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '8px' }}>
        Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
      </h1>
      <p style={{ color: '#666', marginBottom: '40px', fontSize: '14px' }}>
        Plan unforgettable experiences with your crew
      </p>

      <div style={{
        background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '400px'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        {isSignUp && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Full Name</label>
            <input
              placeholder="Jake Brooks"
              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jake@gmail.com"
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#FF4D00', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#333' : '#FF4D00', border: 'none',
            borderRadius: '12px', padding: '16px', fontSize: '16px',
            fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px'
          }}>
          {loading ? 'Loading...' : isSignUp ? 'Create Account →' : 'Sign In →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#FF4D00', cursor: 'pointer', fontWeight: 600 }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </main>
  )
}