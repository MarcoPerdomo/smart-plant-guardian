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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>You have been invited to join Verdant</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandMark />
        <Heading style={s.h1}>You have been invited</Heading>
        <Text style={s.text}>
          You have been invited to join{' '}
          <Link href={siteUrl} style={s.link}>
            <strong>Verdant</strong>
          </Link>
          , the network of connected plant lovers. Click the button below to
          accept the invitation and create your account.
        </Text>
        <Section style={{ margin: '8px 0 16px' }}>
          <Button className="dm-btn" style={s.button} href={confirmationUrl}>
            Accept invitation
          </Button>
        </Section>
        <Text style={s.small}>
          If the button does not work, paste this link into your browser: {confirmationUrl}
        </Text>
        <Text style={s.footer}>
          If you were not expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
