import {
  Html, Head, Body, Container, Section, Text, Button, Preview, Hr,
} from '@react-email/components'

interface InviteEmailProps {
  eventName: string
  inviterName: string
  inviteUrl: string
  eventDate?: string
  destination?: string
  eventType?: string
}

const eventEmojis: Record<string, string> = {
  'Birthday': '🎂',
  'Bachelor / Bachelorette': '🎉',
  'Vacation': '☀️',
  'Wedding': '💒',
  'Business': '💼',
  'Other': '✨',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function InviteEmail({
  eventName,
  inviterName,
  inviteUrl,
  eventDate,
  destination,
  eventType,
}: InviteEmailProps) {
  const emoji = eventEmojis[eventType || ''] || '🎉'

  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to {eventName} on Evnt.Team</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#0A0A0A', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }}>

          {/* Logo */}
          <Text style={{ fontSize: '22px', fontWeight: 900, color: '#F0F0F0', margin: '0 0 32px' }}>
            Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
          </Text>

          {/* Main card */}
          <Section style={{ backgroundColor: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>

            <Text style={{ fontSize: '48px', margin: '0 0 16px', lineHeight: '1' }}>{emoji}</Text>

            <Text style={{ color: '#F0F0F0', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>
              You&apos;re invited!
            </Text>

            <Text style={{ color: '#888', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.5' }}>
              <span style={{ color: '#F0F0F0', fontWeight: 700 }}>{inviterName}</span> invited you to join
            </Text>

            {/* Event details card */}
            <Section style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              <Text style={{ fontSize: '20px', fontWeight: 800, color: '#F0F0F0', margin: 0 }}>
                {eventName}
              </Text>
              {(eventDate || destination) && (
                <Text style={{ fontSize: '13px', color: '#888', margin: '8px 0 0' }}>
                  {destination && <>📍 {destination}</>}
                  {destination && eventDate && <>&nbsp;&nbsp;·&nbsp;&nbsp;</>}
                  {eventDate && <>📅 {formatDate(eventDate)}</>}
                </Text>
              )}
            </Section>

            <Button
              href={inviteUrl}
              style={{
                display: 'block',
                backgroundColor: '#FF4D00',
                color: '#ffffff',
                textDecoration: 'none',
                textAlign: 'center' as const,
                padding: '16px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                width: '100%',
                boxSizing: 'border-box' as const,
              }}
            >
              View Event →
            </Button>
          </Section>

          <Hr style={{ borderColor: '#2A2A2A', margin: '0 0 16px' }} />

          <Text style={{ color: '#444', fontSize: '12px', textAlign: 'center' as const, margin: '0 0 8px', lineHeight: '1.5' }}>
            You received this because {inviterName} invited you to an event on Evnt.Team.
          </Text>
          <Text style={{ color: '#444', fontSize: '12px', textAlign: 'center' as const, margin: 0 }}>
            <a href={inviteUrl} style={{ color: '#FF4D00' }}>{inviteUrl}</a>
          </Text>

        </Container>
      </Body>
    </Html>
  )
}
