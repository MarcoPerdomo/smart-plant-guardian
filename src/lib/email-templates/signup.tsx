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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Your Verdant verification code</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandMark />
        <Heading style={s.h1}>Verify your email</Heading>
        <Text style={s.text}>
          Welcome to Verdant! To finish creating your account for{' '}
          <Link href={`mailto:${recipient}`} style={s.link}>
            {recipient}
          </Link>
          , enter this code in the app:
        </Text>
        {token ? (
          <Section style={{ margin: '8px 0 16px' }}>
            <Text style={s.code}>{token}</Text>
          </Section>
        ) : null}
        <Section style={{ margin: '8px 0 16px' }}>
          <Button className="dm-btn" style={s.button} href={confirmationUrl}>
            Verify email
          </Button>
        </Section>
        {token ? null : (
          <Text style={s.text}>
            Or click here to confirm: <Link href={confirmationUrl} style={s.link}>Confirm your email</Link>
          </Text>
        )}
        <Text style={s.small}>
          If the button does not work, paste this link into your browser: {confirmationUrl}
        </Text>
        <Text style={s.footer}>
          If you did not create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
