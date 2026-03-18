import {
  Html, Head, Body, Container, Section, Text, Button, Preview, Hr,
} from '@react-email/components'

interface ReminderEmailProps {
  eventName: string
  reminderType: 'countdown' | 'itinerary'
  title: string
  body: string
  eventUrl: string
  daysUntil?: number
}

export default function ReminderEmail({ eventName, reminderType, title, body, eventUrl, daysUntil }: ReminderEmailProps) {
  const emoji = reminderType === 'countdown' ? '🎉' : '🗓'

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#0A0A0A', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }}>

          <Text style={{ fontSize: '22px', fontWeight: 900, color: '#F0F0F0', margin: '0 0 32px' }}>
            Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
          </Text>

          <Section style={{ backgroundColor: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>

            <Text style={{ fontSize: '48px', margin: '0 0 12px', lineHeight: '1' }}>{emoji}</Text>

            <Text style={{ color: '#F0F0F0', fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
              {title}
            </Text>

            <Text style={{ color: '#888', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.5' }}>
              {body}
            </Text>

            {daysUntil !== undefined && (
              <Section style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '36px', fontWeight: 900, color: '#FF4D00', margin: '0 0 4px' }}>
                  {daysUntil}
                </Text>
                <Text style={{ fontSize: '12px', fontWeight: 700, color: '#666', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '2px' }}>
                  {daysUntil === 1 ? 'day' : 'days'} to go
                </Text>
              </Section>
            )}

            <Section style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
              <Text style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
                {eventName}
              </Text>
            </Section>

            <Button
              href={eventUrl}
              style={{
                display: 'block',
                backgroundColor: '#FF4D00',
                color: '#ffffff',
                textDecoration: 'none',
                textAlign: 'center' as const,
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                width: '100%',
                boxSizing: 'border-box' as const,
              }}
            >
              View Event →
            </Button>
          </Section>

          <Hr style={{ borderColor: '#2A2A2A', margin: '0 0 16px' }} />

          <Text style={{ color: '#444', fontSize: '12px', textAlign: 'center' as const, margin: 0, lineHeight: '1.5' }}>
            You received this because you&apos;re a member of {eventName} on Evnt.Team.
          </Text>

        </Container>
      </Body>
    </Html>
  )
}
