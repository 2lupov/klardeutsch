import { describe, expect, it } from "vitest";
import { getPostSignupAction } from "@/lib/registration-flow";

describe("email registration", () => {
  it("completes registration immediately when auto-confirm returns a session", () => {
    expect(getPostSignupAction(true)).toBe("complete-registration");
  });

  it("never sends a new user to an email confirmation step", () => {
    expect(getPostSignupAction(false)).toBe("show-auto-login-error");
  });
});