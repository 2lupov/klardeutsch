/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Подтверждение смены email в KLAR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>KLAR</Text>
        <Heading style={h1}>Смена email</Heading>
        <Text style={text}>
          Ты запросил смену email с{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          на{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Нажми кнопку ниже для подтверждения:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Подтвердить смену email
        </Button>
        <Text style={footer}>
          Если ты не запрашивал это — немедленно проверь безопасность своего аккаунта.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#e6a817', textDecoration: 'underline' }
const button = {
  backgroundColor: '#e6a817',
  color: '#111827',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
