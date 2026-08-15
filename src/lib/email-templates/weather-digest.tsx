import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface DigestAlert {
  nickname?: string
  title?: string
  message?: string
  severity?: string
}

interface Props {
  displayName?: string
  place?: string
  dateLabel?: string
  high?: number | null
  low?: number | null
  condition?: string
  alerts?: DigestAlert[]
  appUrl?: string
}

const Email = ({
  displayName,
  place,
  dateLabel,
  high,
  low,
  condition,
  alerts = [],
  appUrl = 'https://verdant-nl.app',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {alerts.length > 0
        ? `${alerts.length} plant${alerts.length === 1 ? '' : 's'} need a look today`
        : 'Today’s plant weather check'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Verdant</Text>
        <Heading style={h1}>
          {alerts.length > 0
            ? `${alerts.length} plant care alert${alerts.length === 1 ? '' : 's'} today`
            : 'Your plants look weather-safe today'}
        </Heading>

        <Text style={intro}>
          {displayName ? `Hi ${displayName}, ` : 'Hi there, '}
          here is today’s weather check{place ? ` for ${place}` : ''}
          {dateLabel ? ` — ${dateLabel}` : ''}.
        </Text>

        <Section style={weatherBox}>
          <Text style={weatherLine}>
            {condition ? `${condition} · ` : ''}
            {high != null ? `High ${Math.round(high)}°C` : 'High —'}
            {low != null ? ` · Low ${Math.round(low)}°C` : ''}
          </Text>
        </Section>

        {alerts.length > 0 ? (
          <Section>
            {alerts.map((a, i) => (
              <Section key={i} style={a.severity === 'warning' ? alertWarn : alertInfo}>
                <Text style={alertPlant}>{a.nickname ?? 'Your plant'}</Text>
                <Text style={alertTitle}>{a.title ?? 'Care check'}</Text>
                <Text style={alertBody}>{a.message ?? ''}</Text>
              </Section>
            ))}
          </Section>
        ) : (
          <Text style={intro}>
            No heat, cold, dry-air or strong-sun risks stand out. A quick soil check is still never wasted.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          <Link href={`${appUrl}/dashboard`} style={link}>
            Open your dashboard
          </Link>{' '}
          to log watering, photos and sensor readings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const count = Array.isArray(data['alerts']) ? data['alerts'].length : 0
    return count > 0
      ? `${count} plant care alert${count === 1 ? '' : 's'} today`
      : 'Your daily plant weather check'
  },
  displayName: 'Daily weather digest',
  previewData: {
    displayName: 'Marco',
    place: 'Amsterdam, NL',
    dateLabel: 'Saturday, 15 August',
    high: 31,
    low: 19,
    condition: 'Clear sky',
    alerts: [
      {
        nickname: 'Monty',
        title: 'Heat stress risk',
        message: 'It reaches 31°C today — move Monty away from the window and check the soil this evening.',
        severity: 'warning',
      },
      {
        nickname: 'Fern Bailey',
        title: 'Dry air spell',
        message: 'Humidity stays near 28% for a second day. Misting or a pebble tray will help.',
        severity: 'info',
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '28px 26px', maxWidth: '580px' }
const brand = {
  fontSize: '13px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: '#2f6b45',
  margin: '0 0 14px',
}
const h1 = { fontSize: '24px', lineHeight: '1.25', color: '#1d2b22', margin: '0 0 12px' }
const intro = { fontSize: '15px', lineHeight: '1.6', color: '#40544a', margin: '0 0 16px' }
const weatherBox = {
  backgroundColor: '#f2f7f3',
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '0 0 18px',
}
const weatherLine = { fontSize: '15px', color: '#2f6b45', margin: '0' }
const alertWarn = {
  backgroundColor: '#fdf4e6',
  borderLeft: '3px solid #c8871f',
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '0 0 12px',
}
const alertInfo = {
  backgroundColor: '#f4f6f5',
  borderLeft: '3px solid #7d9488',
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '0 0 12px',
}
const alertPlant = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  color: '#7d9488',
  margin: '0 0 4px',
}
const alertTitle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1d2b22', margin: '0 0 4px' }
const alertBody = { fontSize: '14px', lineHeight: '1.55', color: '#40544a', margin: '0' }
const hr = { borderColor: '#e3eae5', margin: '22px 0 14px' }
const footer = { fontSize: '13px', color: '#7d9488', margin: '0' }
const link = { color: '#2f6b45' }

export default Email
