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
  Section,
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
      <Container style={wrapper}>
        <Section style={card}>
          <Img src="https://jqqsszwbbxvevebmebfm.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="KLAR" width="56" height="56" style={logo} />
          <Text style={brand}>KLAR</Text>
          <Heading style={h1}>Добро пожаловать! 🎉</Heading>
          <Text style={text}>
            Спасибо за регистрацию в{' '}
            <Link href={siteUrl} style={link}>
              <strong>KLAR</strong>
            </Link>
            ! Введи этот код для подтверждения email:
          </Text>
          {token ? (
            <Text style={codeBox}>{token}</Text>
          ) : (
            <Text style={codeBox}>------</Text>
          )}
          <Text style={hintText}>
            Скопируй код и вставь его на странице подтверждения.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const wrapper = { padding: '24px 16px' }
const card = {
  backgroundColor: '#0f1729',
  borderRadius: '16px',
  padding: '36px 28px',
}
const logo = { margin: '0 0 12px', borderRadius: '12px' }
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
const link = { color: '#e6a817', textDecoration: 'underline' }
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
const hintText = { fontSize: '13px', color: '#64748b', margin: '0', textAlign: 'center' as const }
