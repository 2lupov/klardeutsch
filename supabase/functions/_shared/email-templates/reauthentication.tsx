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
        <Text style={codeBox}>{token}</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#0f1729',
  fontFamily: "'Space Grotesk', Arial, sans-serif",
  margin: '0',
  padding: '0',
}
const container = { padding: '36px 28px' }
const brand = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#e6a817',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#f1f5f9',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#94a3b8',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const codeBox = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#f1f5f9',
  backgroundColor: '#1a2744',
  border: '2px solid #e6a817',
  borderRadius: '12px',
  padding: '16px 24px',
  textAlign: 'center' as const,
  letterSpacing: '8px',
  margin: '0 0 16px',
}
