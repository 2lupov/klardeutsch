import { z } from "zod";

export const nicknameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[\p{L}\p{N}_.-]{3,24}$/u, "Нікнейм: 3–24 символи — літери, цифри та _ - . (без пробілів)");

export const passwordSchema = z.string().min(6, "Пароль має містити щонайменше 6 символів").max(200);

export const PASSWORD_RULES = "Пароль: від 8 символів, обов'язково літери й цифри. Не використовуй прості комбінації на кшталт 12345678, qwerty чи password.";

/** Stricter check used at signup (server additionally rejects leaked passwords). */
export function getSignupPasswordError(password: string): string | null {
  if (password.length < 8) return "Пароль має містити щонайменше 8 символів";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Пароль має містити і літери, і цифри";
  const lower = password.toLowerCase();
  if (/^(.)\1+$/.test(password) || /(password|qwerty|12345|йцукен|пароль)/.test(lower)) {
    return "Пароль занадто простий — придумай складніший";
  }
  return null;
}

export const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().trim().email("Введіть правильний email").max(255),
]);

export function getNicknameAuthError(input: { nickname: string; password: string; email?: string }) {
  // Login accepts a real email address too — skip the nickname format check then.
  const isEmailLogin = input.nickname.includes("@");
  const nickname = isEmailLogin
    ? z.string().trim().email("Введіть правильний email").max(255).safeParse(input.nickname)
    : nicknameSchema.safeParse(input.nickname);
  if (!nickname.success) return nickname.error.issues[0]?.message ?? "Неправильний нікнейм";
  const password = passwordSchema.safeParse(input.password);
  if (!password.success) return password.error.issues[0]?.message ?? "Неправильний пароль";
  const email = optionalEmailSchema.safeParse(input.email ?? "");
  if (!email.success) return email.error.issues[0]?.message ?? "Неправильний email";
  return null;
}