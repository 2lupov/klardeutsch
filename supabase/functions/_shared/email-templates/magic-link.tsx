/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ссылка для входа в KLAR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>KLAR</Text>
        <Heading style={h1}>Войти в KLAR</Heading>
        <Text style={text}>
          Нажми кнопку ниже, чтобы войти в свой аккаунт. Ссылка действительна ограниченное время.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Войти
        </Button>
        <Text style={footer}>
          Если ты не запрашивал вход — просто проигнорируй это письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
