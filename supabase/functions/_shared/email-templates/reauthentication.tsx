/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Код подтверждения KLAR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>KLAR</Text>
        <Heading style={h1}>Код подтверждения</Heading>
        <Text style={text}>Используй этот код для подтверждения:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Код действителен ограниченное время. Если ты не запрашивал его — просто проигнорируй.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#e6a817',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: "'Space Grotesk', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#e6a817',
  letterSpacing: '4px',
  margin: '0 0 32px',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
