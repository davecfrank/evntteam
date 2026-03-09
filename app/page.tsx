export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#F0F0F0',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 20px'
    }}>
      <h1 style={{ fontSize: '64px', fontWeight: 900, marginBottom: '16px' }}>
      Event<span style={{ color: '#FF4D00', marginLeft: '-1px' }}>.Team</span>
        </h1>
      <p style={{ fontSize: '20px', color: '#888', marginBottom: '40px', maxWidth: '500px' }}>
        The all-in-one app for planning unforgettable experiences with your crew.
      </p>
      <input
        type="email"
        placeholder="Enter your email for early access"
        style={{
          padding: '16px 24px',
          borderRadius: '12px',
          border: '1px solid #333',
          background: '#161616',
          color: '#fff',
          fontSize: '16px',
          width: '100%',
          maxWidth: '400px',
          marginBottom: '12px',
          outline: 'none'
        }}
      />
      <button style={{
        padding: '16px 40px',
        background: '#FF4D00',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: 700,
        cursor: 'pointer',
        width: '100%',
        maxWidth: '400px'
      }}>
        Get Early Access →
      </button>
      <p style={{ marginTop: '20px', fontSize: '13px', color: '#444' }}>
        No spam. Just updates when we launch.
      </p>
    </main>
  )
}