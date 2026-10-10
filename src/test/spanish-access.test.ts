import { describe, it, expect } from "vitest";
import { canSeeSpanish } from "@/features/spanish/access";

describe("Spanish course access", () => {
  it("allows ludmila", () => expect(canSeeSpanish("Ludmila")).toBe(true));
  it("blocks other accounts", () => expect(canSeeSpanish("david")).toBe(false));
  it("blocks missing nickname", () => expect(canSeeSpanish(null)).toBe(false));
});
