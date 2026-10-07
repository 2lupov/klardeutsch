import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act, cleanup } from "@testing-library/react";

// ── Підміна Supabase: канал з обробниками + таблиця з upsert ──
const handlers: Record<string, (p: any) => void> = {};
const sent: any[] = [];
const upserts: any[] = [];
let upsertError: any = null;

vi.mock("@/integrations/supabase/client", () => {
  const channel: any = {
    on: (_t: string, opts: any, cb: any) => { handlers[opts.event === "*" ? "pg" : opts.event] = cb; return channel; },
    subscribe: () => channel,
    send: (m: any) => { sent.push(m); return "ok"; },
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      channel: () => channel,
      removeChannel: () => {},
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        upsert: async (row: any) => { upserts.push(row); return { error: upsertError }; },
      }),
      functions: { invoke: async () => ({ data: {}, error: null }) },
    },
  };
});
vi.mock("@/lib/materials", () => ({ fetchFolders: async () => [], createFolder: async () => ({ id: "f" }), createItem: async () => ({}) }));

import LiveWriting from "@/components/live/LiveWriting";

const editor = (c: HTMLElement) => c.querySelector("[contenteditable]") as HTMLDivElement;
const type = (el: HTMLDivElement, text: string) => { el.focus(); el.innerHTML = text; fireEvent.input(el); };

describe("LiveWriting: надійність спільного листа", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.keys(handlers).forEach((k) => delete handlers[k]);
    sent.length = 0; upserts.length = 0; upsertError = null;
    localStorage.clear();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  const mount = async (role: "teacher" | "student" = "student") => {
    const r = render(<LiveWriting classId="c1" role={role} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    return r;
  };

  it("чужий текст не затирає те, що учень друкує просто зараз", async () => {
    const { container } = await mount();
    const ed = editor(container);
    type(ed, "Liebe Anna, ich");
    await act(async () => { handlers.text({ payload: { text: "ЧУЖА ВЕРСІЯ" } }); });
    expect(ed.innerHTML).toBe("Liebe Anna, ich");
  });

  it("після паузи чужі правки застосовуються", async () => {
    const { container } = await mount();
    const ed = editor(container);
    type(ed, "alt");
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    await act(async () => { handlers.text({ payload: { text: "neu vom Lehrer" } }); });
    expect(ed.textContent).toBe("neu vom Lehrer");
  });

  it("текст зберігається на сервері через ~0.7 с і мережа не засипається", async () => {
    const { container } = await mount();
    const ed = editor(container);
    for (const t of ["H", "Ha", "Hal", "Hall", "Hallo"]) type(ed, t);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(upserts.length).toBe(1);
    expect(upserts[0].text).toBe("Hallo");
    expect(sent.filter((m) => m.event === "text").length).toBeLessThanOrEqual(2);
  });

  it("при помилці мережі текст лишається на пристрої й повторюється", async () => {
    upsertError = { message: "offline" };
    const { container, getByText } = await mount();
    type(editor(container), "Mein Brief");
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(JSON.parse(localStorage.getItem("live-writing:c1")!).html).toBe("Mein Brief");
    expect(getByText(/немає зв'язку/i)).toBeTruthy();
    // зв'язок повернувся
    upsertError = null;
    await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
    expect(upserts.at(-1).text).toBe("Mein Brief");
    expect(localStorage.getItem("live-writing:c1")).toBeNull();
  });

  it("при виході з розділу незбережене дозаписується одразу", async () => {
    const { container, unmount } = await mount();
    type(editor(container), "Schnell weg");
    expect(upserts.length).toBe(0);
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5); });
    expect(upserts.at(-1)?.text).toBe("Schnell weg");
  });

  it("чернетка після перезавантаження відновлюється й дозберігається", async () => {
    localStorage.setItem("live-writing:c1", JSON.stringify({ html: "Vor dem Absturz", ts: 1 }));
    const { container } = await mount();
    expect(editor(container).textContent).toBe("Vor dem Absturz");
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(upserts.at(-1)?.text).toBe("Vor dem Absturz");
  });

  it("зберігаючи текст, не затирає тему листа", async () => {
    const { container } = await mount("teacher");
    await act(async () => { handlers.topic({ payload: { topic: { title_de: "Einladung", level: "A2" } } }); });
    type(editor(container), "Hallo");
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(upserts.at(-1).topic).toEqual({ title_de: "Einladung", level: "A2" });
  });
});
