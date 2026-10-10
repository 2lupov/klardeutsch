import { describe, it, expect } from "vitest";
import { academyPathFor, canSeeSpanish } from "@/features/spanish/access";

describe("Spanish course access", () => {
  it("allows ludmila", () => expect(canSeeSpanish("Ludmila")).toBe(true));
  it("blocks other accounts", () => expect(canSeeSpanish("david")).toBe(false));
  it("blocks missing nickname", () => expect(canSeeSpanish(null)).toBe(false));
});

describe("Academy entry target", () => {
  it("sends ludmila straight to the Spanish course", () =>
    expect(academyPathFor("ludmila")).toBe("/spanish"));
  it("sends everyone else to the academy", () =>
    expect(academyPathFor("david")).toBe("/academy"));
  it("sends accounts without a nickname to the academy", () =>
    expect(academyPathFor(null)).toBe("/academy"));
});
