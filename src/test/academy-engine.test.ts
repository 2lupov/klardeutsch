import { describe, it, expect } from "vitest";
import catalog from "@/data/catalog.json";
import { isAccepted } from "@/features/academy-engine/answers";
import { computeStatus, type Attempt } from "@/features/academy-engine/passport";

const good = { task: 2, coherence: 2, vocabulary: 3, grammar: 2, pronunciation: 2 };
const weak = { ...good, grammar: 1 };
const a = (d: string, r: Attempt["rubric"], with_support = false, new_situation = false): Attempt =>
  ({ created_at: d, rubric: r, with_support, new_situation });

describe("catalog", () => {
  it("has 65 courses with the block split from the plan", () => {
    const n = (b: string) => catalog.filter((c) => c.block === b).length;
    expect(catalog.length).toBe(65);
    expect([n("K"), n("AL"), n("EX"), n("CA"), n("PR"), n("MD"), n("TC"), n("LG")]).toEqual([21, 14, 6, 7, 6, 4, 4, 3]);
  });
  it("keeps ranges as min/max", () => {
    const md1 = catalog.find((c) => c.code === "MD-01")!;
    expect([md1.title, md1.hoursMin, md1.hoursMax]).toEqual(["Deutsch für Pflege", 40, 60]);
  });
});

describe("answers", () => {
  it("accepts ae for ä", () => expect(isAccepted("Ich moechte", ["Ich möchte"])).toBe(true));
});

describe("passport", () => {
  it("one rated attempt = with support", () => expect(computeStatus([a("2026-10-01T10:00:00", weak, true)])).toBe("supported"));
  it("two solo sufficient attempts on the same day stay supported", () =>
    expect(computeStatus([a("2026-10-01T10:00:00", good), a("2026-10-01T18:00:00", good)])).toBe("supported"));
  it("two solo sufficient attempts on different days = independent", () =>
    expect(computeStatus([a("2026-10-01T10:00:00", good), a("2026-10-02T10:00:00", good)])).toBe("independent"));
  it("a criterion below sufficient does not count", () =>
    expect(computeStatus([a("2026-10-01T10:00:00", good), a("2026-10-02T10:00:00", weak)])).toBe("supported"));
});
