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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Сброс пароля для KLAR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>KLAR</Text>
        <Heading style={h1}>Сброс пароля</Heading>
        <Text style={text}>
          Мы получили запрос на сброс пароля для твоего аккаунта KLAR.
          Нажми кнопку ниже, чтобы выбрать новый пароль.
        </Text>
        <Button style={button} href={confirmationUrl} target="_blank">
          Сбросить пароль
        </Button>
        <Text style={fallbackText}>
          Если кнопка не работает, скопируй ссылку:{' '}
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const link = { color: '#e6a817', textDecoration: 'underline' }
const button = {
  backgroundColor: '#e6a817',
  color: '#0f1729',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  textAlign: 'center' as const,
}
const fallbackText = { fontSize: '12px', color: '#64748b', margin: '16px 0 0', wordBreak: 'break-all' as const }
