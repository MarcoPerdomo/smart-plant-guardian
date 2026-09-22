import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BrandMark, brandStyles as s, darkModeCss } from './auth-shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Your Verdant login link</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandMark />
        <Heading style={s.h1}>Your login link</Heading>
        <Text style={s.text}>
          Click the button below to log in to Verdant. This link will expire
          shortly.
        </Text>
        <Section style={{ margin: '8px 0 16px' }}>
          <Button className="dm-btn" style={s.button} href={confirmationUrl}>
            Log in
          </Button>
        </Section>
        <Text style={s.small}>
          If the button does not work, paste this link into your browser: {confirmationUrl}
        </Text>
        <Text style={s.footer}>
          If you did not request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
