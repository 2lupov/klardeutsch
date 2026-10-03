import { describe, it, expect } from "vitest";
import { A2_PRICE_UAH } from "@/features/german-a2/pricing";

describe("A2 course price", () => {
  it("costs 500 UAH", () => {
    expect(A2_PRICE_UAH).toBe(500);
  });
});
