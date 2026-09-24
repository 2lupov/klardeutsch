import { describe, expect, it } from "vitest";
import { emptyPayload, scoreBlock, type LessonBlock } from "@/components/blocks/types";
import { kitBlocksToLessonBlocks, kitSections, normalizeKit } from "@/lib/lesson-kits";

const block = (type: string, payload: LessonBlock["payload"]): LessonBlock => ({
  id: "sample", lesson_id: "lesson", type, title: null, sort_order: 0,
  visible_to_student: true, payload, source: "kit", book_page_id: null,
});

describe("German lesson canvas adapters", () => {
  it("keeps the sections and editorial layout of new kits", () => {
    const kit = normalizeKit({ title: "Genitiv B1", sections: [{ id: "one", title: "Regel", layout: "grammar", blocks: [{ id: "a", type: "table", payload: emptyPayload("table") }] }] });
    expect(kitSections(kit)).toHaveLength(1);
    expect(kitBlocksToLessonBlocks(kitSections(kit)[0].blocks, "one")[0]).toMatchObject({ id: "one-a", type: "table", source: "kit" });
  });

  it("falls back to a readable single topic for earlier flat lessons", () => {
    const kit = normalizeKit({ title: "Wortschatz", blocks: [{ type: "lesen", payload: { text: "Guten Tag" } }] });
    expect(kitSections(kit)[0]).toMatchObject({ title: "Wortschatz", blocks: [{ type: "lesen" }] });
  });

  it("scores article selection and sentence transformation without grading theory", () => {
    expect(scoreBlock(block("artikel", { article_items: [{ word: "Haus", article: "das" }, { word: "Mann", article: "der" }] }), { 0: "das", 1: "die" })).toEqual({ score: 1, max: 2 });
    expect(scoreBlock(block("transformation", { transformations: [{ source: "Ich habe Zeit.", answer: "Wenn ich Zeit hätte." }] }), { 0: " wenn  ich Zeit hätte. " })).toEqual({ score: 1, max: 1 });
    expect(scoreBlock(block("table", emptyPayload("table")), {})).toEqual({ score: 0, max: 0 });
  });
});