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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Reset your Verdant password</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandMark />
        <Heading style={s.h1}>Reset your password</Heading>
        <Text style={s.text}>
          We received a request to reset your Verdant password. Click the
          button below to choose a new one.
        </Text>
        <Section style={{ margin: '8px 0 16px' }}>
          <Button className="dm-btn" style={s.button} href={confirmationUrl}>
            Reset password
          </Button>
        </Section>
        <Text style={s.small}>
          If the button does not work, paste this link into your browser: {confirmationUrl}
        </Text>
        <Text style={s.footer}>
          If you did not request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
