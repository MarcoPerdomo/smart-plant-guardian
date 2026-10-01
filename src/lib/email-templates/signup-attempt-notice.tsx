import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  signInUrl?: string
  resetUrl?: string
}

const Email = ({ signInUrl, resetUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Someone tried to sign up with your email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Your email is already registered</Heading>
        <Text style={text}>Hi there,</Text>
        <Text style={text}>
          Someone just tried to create a new Sentia account using this email address. Since this
          address already belongs to your account, no new account was created.
        </Text>
        <Text style={text}>
          If this was you, you can simply sign in, or reset your password if you have forgotten it:
        </Text>
        <Button style={button} href={signInUrl ?? 'https://sentia-plants.com/auth'}>
          Sign in to Sentia
        </Button>
        <Text style={text}>
          <Link style={link} href={resetUrl ?? 'https://sentia-plants.com/auth'}>
            Reset your password
          </Link>
        </Text>
        <Text style={text}>
          If this was not you, you can safely ignore this email. Your account is unchanged and no
          one else can access it.
        </Text>
        <Text style={footer}>Sentia, smart care for your plants</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Someone tried to sign up with your email',
  displayName: 'Signup attempt notice',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { fontSize: '22px', color: '#1a2e1a' }
const text = { fontSize: '14px', lineHeight: '1.6', color: '#333333' }
const button = {
  backgroundColor: '#2f6b3a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0',
}
const link = { color: '#2f6b3a', textDecoration: 'underline', fontSize: '14px' }
const footer = { fontSize: '12px', color: '#888888', marginTop: '24px' }
