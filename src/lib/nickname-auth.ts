import { z } from "zod";

export const nicknameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Нікнейм: 3–24 символи, лише латиниця, цифри та _");

export const passwordSchema = z.string().min(6, "Пароль має містити щонайменше 6 символів").max(200);

export const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().trim().email("Введіть правильний email").max(255),
]);

export function getNicknameAuthError(input: { nickname: string; password: string; email?: string }) {
  const nickname = nicknameSchema.safeParse(input.nickname);
  if (!nickname.success) return nickname.error.issues[0]?.message ?? "Неправильний нікнейм";
  const password = passwordSchema.safeParse(input.password);
  if (!password.success) return password.error.issues[0]?.message ?? "Неправильний пароль";
  const email = optionalEmailSchema.safeParse(input.email ?? "");
  if (!email.success) return email.error.issues[0]?.message ?? "Неправильний email";
  return null;
}