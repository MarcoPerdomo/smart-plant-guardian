import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BrandMark, brandStyles as s, darkModeCss } from './auth-shared'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirm your new email for Verdant</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandMark />
        <Heading style={s.h1}>Confirm your email change</Heading>
        <Text style={s.text}>
          You requested to change your email address for Verdant from{' '}
          <Link href={`mailto:${oldEmail}`} style={s.link}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={s.link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Section style={{ margin: '8px 0 16px' }}>
          <Button className="dm-btn" style={s.button} href={confirmationUrl}>
            Confirm email change
          </Button>
        </Section>
        <Text style={s.small}>
          If the button does not work, paste this link into your browser: {confirmationUrl}
        </Text>
        <Text style={s.footer}>
          If you did not request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
