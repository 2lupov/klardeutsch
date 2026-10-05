import { describe, it, expect } from "vitest";
import { MODULES, EXAMS, SECTIONS, scoreExam, isCorrect } from "@/features/deutschraum/data";

describe("Deutschraum A2 content", () => {
  it("has 17 modules × 7 sections = 119 lessons", () => {
    expect(MODULES.length).toBe(17);
    expect(MODULES.length * SECTIONS.length).toBe(119);
  });
  it("has 3 exams with 35 auto-scored items each", () => {
    expect(EXAMS.length).toBe(3);
    for (const e of EXAMS) expect(scoreExam(e, {}).total).toBe(35);
  });
  it("scores only correct answers", () => {
    const e = EXAMS[0];
    const r = scoreExam(e, { "h1-0": e.notes[0].question.answer, "h2-0": "falsch-xyz" });
    expect(r.correct).toBe(1);
  });
  it("accepts typed answers ignoring case and final punctuation", () => {
    expect(isCorrect(" Bonn. ", "bonn")).toBe(true);
    expect(isCorrect("Berlin", "Bonn")).toBe(false);
  });
});
