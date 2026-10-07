import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";

const H = vi.hoisted(() => ({
  rows: [] as any[],
  htmlCalls: [] as string[],
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/live/HtmlSlides", () => ({
  default: ({ html }: { html: string }) => <div data-testid="html-slides">{html}</div>,
}));
vi.mock("@/lib/presentations", async (orig) => {
  const m: any = await orig();
  return {
    ...m,
    listPresentations: async () => H.rows,
    listPresentationFolders: async () => [],
    getPresentationHtml: async (id: string) => { H.htmlCalls.push(id); return "<h1>Интерактив</h1>"; },
    slideUrls: async (paths: string[]) => paths.map((p) => `https://x/${p}`),
  };
});

import LiveSlidesPanel from "@/components/live/LiveSlidesPanel";

// jsdom не має scrollIntoView (у браузері є)
(Element.prototype as any).scrollIntoView = vi.fn();

const pres = (o: any) => ({
  id: "p1", owner_id: "t", title: "Test", slide_paths: [], page_count: 1, created_at: "", updated_at: "",
  kind: "pdf", level: null, skill: null, folder_id: null, tags: [], notes: null, pinned: false, archived: false, ...o,
});
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

describe("LiveSlidesPanel", () => {
  beforeEach(() => { H.rows = []; H.htmlCalls = []; });
  afterEach(cleanup);

  it("інтерактивна презентація підтягує HTML і показується як інтерактив (а не порожній PDF)", async () => {
    H.rows = [pres({ id: "i1", title: "Weltall", kind: "game", page_count: 1 })];
    const { findByTestId } = render(<LiveSlidesPanel teacherId="t" classId="c" current={null} onTransfer={() => {}} />);
    await flush();
    const el = await findByTestId("html-slides");
    expect(el.textContent).toContain("Интерактив");
    expect(H.htmlCalls).toEqual(["i1"]);
  });

  it("стрілки гортають слайди лише коли відкрито розділ «Презентація»", async () => {
    H.rows = [pres({ id: "p1", slide_paths: ["a", "b", "c"], page_count: 3 })];
    const onTransfer = vi.fn();
    const cur = { presentation_id: "p1", page: 1 };
    const { rerender } = render(<LiveSlidesPanel teacherId="t" classId="c" current={cur} onTransfer={onTransfer} active={false} />);
    await flush();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onTransfer).not.toHaveBeenCalled(); // учитель на «Дошці» — учню слайди не гортаємо

    rerender(<LiveSlidesPanel teacherId="t" classId="c" current={cur} onTransfer={onTransfer} active />);
    await flush();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onTransfer).toHaveBeenCalledWith("p1", 2);
  });

  it("стрілки в полі вводу не гортають слайди", async () => {
    H.rows = [pres({ id: "p1", slide_paths: ["a", "b"], page_count: 2 })];
    const onTransfer = vi.fn();
    const { container } = render(<div><input data-testid="i" /><LiveSlidesPanel teacherId="t" classId="c" current={{ presentation_id: "p1", page: 1 }} onTransfer={onTransfer} /></div>);
    await flush();
    const input = container.querySelector("input")!;
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onTransfer).not.toHaveBeenCalled();
  });
});
