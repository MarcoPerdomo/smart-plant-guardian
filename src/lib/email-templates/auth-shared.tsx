import * as React from 'react'
import { Text } from '@react-email/components'

// Shared Verdant branding for auth emails. Email Body stays #ffffff.

export const brandStyles = {
  main: { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' },
  container: { padding: '28px 26px', maxWidth: '560px' },
  h1: { fontSize: '24px', lineHeight: '32px', color: '#14281d', margin: '0 0 12px' },
  text: { fontSize: '15px', lineHeight: '24px', color: '#33453b', margin: '0 0 16px' },
  small: { fontSize: '12px', lineHeight: '20px', color: '#6b7b72', wordBreak: 'break-all' as const },
  footer: { fontSize: '12px', lineHeight: '20px', color: '#6b7b72', margin: '24px 0 0' },
  hr: { borderColor: '#e3ebe6', margin: '20px 0' },
  button: {
    backgroundColor: '#2f7a4d',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  code: {
    fontFamily: 'Courier, monospace',
    fontSize: '30px',
    letterSpacing: '8px',
    fontWeight: 'bold' as const,
    color: '#14281d',
    margin: '18px 0',
  },
  link: { color: '#2f7a4d', textDecoration: 'underline' },
}

export const brandText = {
  fontSize: '13px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: '#2f7a4d',
  margin: '0 0 12px',
}

export const BrandMark = () => <Text style={brandText}>Verdant</Text>

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #14281d !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #14281d !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #14281d !important; }
`
