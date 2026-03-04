/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Код подтверждения для KLAR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://jqqsszwbbxvevebmebfm.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="KLAR" width="64" height="64" style={logo} />
        <Text style={brand}>KLAR</Text>
        <Heading style={h1}>Добро пожаловать! 🎉</Heading>
        <Text style={text}>
          Спасибо за регистрацию в{' '}
          <Link href={siteUrl} style={link}>
            <strong>KLAR</strong>
          </Link>
          ! Введи этот код для подтверждения email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ):
        </Text>
        {token ? (
          <Text style={codeBox}>{token}</Text>
        ) : (
          <Text style={codeBox}>------</Text>
        )}
        <Text style={hintText}>
          Скопируй код и вставь его на странице подтверждения.
        </Text>
        <Text style={footer}>
          Если ты не регистрировался — просто проигнорируй это письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { margin: '0 0 16px', borderRadius: '12px' }
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
const codeBox = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#111827',
  backgroundColor: '#fef9e7',
  border: '2px solid #e6a817',
  borderRadius: '12px',
  padding: '16px 24px',
  textAlign: 'center' as const,
  letterSpacing: '8px',
  margin: '0 0 16px',
}
const hintText = { fontSize: '13px', color: '#9ca3af', margin: '0 0 24px', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
