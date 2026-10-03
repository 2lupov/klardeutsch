import { describe, expect, it } from "vitest";
import { getNicknameAuthError, nicknameSchema, optionalEmailSchema } from "@/lib/nickname-auth";

describe("nickname authentication rules", () => {
  it("accepts 3–24 lowercase latin characters, digits, and underscores", () => {
    expect(nicknameSchema.parse("  Klar_User7 ")).toBe("klar_user7");
  });

  it("rejects spaces in nicknames", () => {
    expect(nicknameSchema.safeParse("моє ім'я").success).toBe(false);
  });

  it("accepts cyrillic letters, dots and dashes", () => {
    expect(nicknameSchema.safeParse("Моє-Ім'я.7".replace("'", "")).success).toBe(true);
    expect(nicknameSchema.safeParse("олena.k").success).toBe(true);
  });

  it("allows registration without an email", () => {
    expect(optionalEmailSchema.safeParse("").success).toBe(true);
    expect(getNicknameAuthError({ nickname: "klar_user", password: "secret7", email: "" })).toBeNull();
  });

  it("validates email when the user supplies one", () => {
    expect(optionalEmailSchema.safeParse("not-an-email").success).toBe(false);
  });
});
import { getSignupPasswordError } from "@/lib/nickname-auth";
describe("signup password rules", () => {
  it("rejects shorter than 8", () => expect(getSignupPasswordError("ab12")).not.toBeNull());
  it("requires letters and digits", () => expect(getSignupPasswordError("abcdefgh")).not.toBeNull());
  it("rejects trivial combos", () => expect(getSignupPasswordError("password123")).not.toBeNull());
  it("accepts a solid password", () => expect(getSignupPasswordError("Klar2026sonne")).toBeNull());
});
