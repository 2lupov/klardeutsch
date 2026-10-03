import { describe, expect, it } from "vitest";
import { getInitialOnboardingExperience, NEW_USER_START_LEVEL } from "@/lib/onboarding-flow";

describe("onboarding entry", () => {
  it("shows new users the welcome intro and starts them at A1", () => {
    expect(getInitialOnboardingExperience(false)).toBe("welcome");
    expect(NEW_USER_START_LEVEL).toBe("A1");
  });

  it("keeps placement testing for existing users", () => {
    expect(getInitialOnboardingExperience(true)).toBe("placement");
  });
});