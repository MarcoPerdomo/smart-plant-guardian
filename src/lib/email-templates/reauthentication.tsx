import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BrandMark, brandStyles as s } from './auth-shared'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Verdant verification code</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandMark />
        <Heading style={s.h1}>Confirm it is you</Heading>
        <Text style={s.text}>Use the code below to confirm your identity:</Text>
        <Section style={{ margin: '8px 0 16px' }}>
          <Text style={s.code}>{token}</Text>
        </Section>
        <Text style={s.footer}>
          This code will expire shortly. If you did not request it, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
