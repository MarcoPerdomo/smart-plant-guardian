import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  displayName?: string
  confirmUrl?: string
}

const Email = ({ displayName, confirmUrl = 'https://verdant-nl.app' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your Verdant product updates</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Verdant</Text>
        <Heading style={h1}>Confirm your subscription</Heading>
        <Text style={intro}>
          {displayName ? `Hi ${displayName},` : 'Hi there,'} you asked to receive Verdant product
          updates — new features, upgrades and other platform news. Tap the button below to confirm.
        </Text>
        <Section style={{ margin: '24px 0' }}>
          <Button href={confirmUrl} style={button}>
            Confirm subscription
          </Button>
        </Section>
        <Text style={small}>
          If the button does not work, paste this link into your browser: {confirmUrl}
        </Text>
        <Hr style={hr} />
        <Text style={small}>
          Did not request this? Ignore this email and nothing will be sent to you.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Confirm your Verdant product updates',
  displayName: 'Newsletter confirmation',
  previewData: { displayName: 'Marco', confirmUrl: 'https://verdant-nl.app/newsletter/confirm?token=demo' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '560px' }
const brand = { fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#2f7a4d', margin: '0 0 12px' }
const h1 = { fontSize: '24px', lineHeight: '32px', color: '#14281d', margin: '0 0 12px' }
const intro = { fontSize: '15px', lineHeight: '24px', color: '#33453b' }
const small = { fontSize: '12px', lineHeight: '20px', color: '#6b7b72', wordBreak: 'break-all' as const }
const hr = { borderColor: '#e3ebe6', margin: '20px 0' }
const button = {
  backgroundColor: '#2f7a4d',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
}
