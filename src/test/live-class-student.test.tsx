import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";

const H = vi.hoisted(() => ({
  navigate: null as any,
  subStatus: {} as { cb?: (s: string) => void },
  classRow: null as any,
  classError: null as any,
  itemsRows: [] as any[],
  classFetches: 0,
  params: { id: "c1" },
  auth: { user: { id: "s1" }, loading: false },
}));

vi.mock("react-router-dom", () => ({ useParams: () => H.params, useNavigate: () => H.navigate }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string): any => {
    const q: any = {
      select: () => q, eq: () => q, order: () => q,
      maybeSingle: async () => {
        if (table === "live_classes") { H.classFetches++; return { data: H.classError ? null : H.classRow, error: H.classError }; }
        return { data: null, error: null };
      },
      then: (res: any) => res({ data: table === "live_class_items" ? H.itemsRows : [], error: null }),
    };
    return q;
  };
  const channel: any = {
    on: () => channel,
    subscribe: (cb?: (s: string) => void) => { if (cb) H.subStatus.cb = cb; return channel; },
    send: () => "ok", track: async () => {}, presenceState: () => ({}),
  };
  return { supabase: { from: chain, channel: () => channel, removeChannel: () => {} } };
});
vi.mock("@/lib/live-class", async (orig) => {
  const m: any = await orig();
  return { ...m, fetchLiveItems: async () => H.itemsRows, markSectionSeen: async () => {} };
});

vi.mock("@/components/live/BoardRender", () => ({ BoardView: () => <div /> }));
vi.mock("@/components/live/LiveWriting", () => ({ default: () => <div data-testid="writing" /> }));
vi.mock("@/components/live/LiveReading", () => ({ default: () => <div data-testid="reading" /> }));
vi.mock("@/components/live/LiveGrammar", () => ({ default: () => <div data-testid="grammar" /> }));
vi.mock("@/components/live/LiveNotes", () => ({ default: () => <div data-testid="notes" /> }));
vi.mock("@/components/live/LiveVideo", () => ({ default: () => <div data-testid="video" /> }));
vi.mock("@/components/textbook/TextbookWorkbook", () => ({ default: () => <div data-testid="textbook" /> }));
vi.mock("@/components/live/BoardStudentView", () => ({ default: () => <div data-testid="boardview" /> }));
vi.mock("@/lib/books", () => ({ signedPageUrl: async () => null }));
vi.mock("@/components/dictionary/AddMyWordForm", () => ({ default: () => <div />, addMyWord: async () => {} }));
vi.mock("@/components/dictionary/PandaLookup", () => ({ default: () => <div data-testid="panda" /> }));
vi.mock("@/components/interactive/InteractiveScene", () => ({ default: () => <div data-testid="scene" /> }));
vi.mock("@/lib/interactivePages", () => ({ fetchInteractivePage: async () => null }));
vi.mock("@/components/tutoring/PresentationView", () => ({ default: () => <div data-testid="pres" /> }));
vi.mock("@/components/blocks/LessonReader", () => ({ default: () => <div data-testid="reader" /> }));
vi.mock("@/lib/lesson-kits", () => ({ kitSections: () => [], normalizeKit: (k: any) => k }));
vi.mock("@/components/live/LaserPointer", () => ({ LaserSurface: ({ children }: any) => <div>{children}</div>, useLaserReceiver: () => null }));
vi.mock("@/hooks/useLivePresence", () => ({ useLivePresence: () => ({ online: true, other: null }) }));

import LiveClass from "@/pages/LiveClass";

const base = { id: "c1", teacher_id: "t1", student_id: "s1", title: "Урок", status: "active", current_section: "board", board: [], started_at: "", ended_at: null };
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(20); });

describe("LiveClass (ученик): урок не вилітає при проблемах зі зв'язком", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    H.navigate = vi.fn(); H.classFetches = 0; H.classError = null; H.classRow = { ...base }; H.itemsRows = [];
    H.subStatus.cb = undefined; localStorage.clear();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("помилка мережі при вході НЕ перекидає на /academy, а дає кнопку «Повторити»", async () => {
    H.classError = { message: "Failed to fetch" };
    const { getByText } = render(<LiveClass />);
    await flush();
    expect(H.navigate).not.toHaveBeenCalled();
    expect(getByText(/Немає зв'язку з уроком/)).toBeTruthy();
    H.classError = null;
    await act(async () => { fireEvent.click(getByText("Повторити")); });
    await flush();
    expect(getByText("Урок")).toBeTruthy();
  });

  it("завершений урок веде на /academy", async () => {
    H.classRow = { ...base, status: "ended" };
    render(<LiveClass />);
    await flush();
    expect(H.navigate).toHaveBeenCalledWith("/academy", { replace: true });
  });

  it("після обриву realtime показує банер і докачує пропущене при відновленні", async () => {
    const { queryByRole, getByText } = render(<LiveClass />);
    await flush();
    const before = H.classFetches;
    await act(async () => { H.subStatus.cb?.("CHANNEL_ERROR"); });
    expect(queryByRole("status")?.textContent).toMatch(/Немає зв'язку/);
    H.classRow = { ...base, current_section: "slides" };
    await act(async () => { H.subStatus.cb?.("SUBSCRIBED"); });
    await flush();
    expect(H.classFetches).toBeGreaterThan(before);
    expect(queryByRole("status")).toBeNull();
    expect(getByText("Урок")).toBeTruthy();
  });

  it("коли телефон прокидається (вкладка знову видима) — синхронізується", async () => {
    render(<LiveClass />);
    await flush();
    const before = H.classFetches;
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await flush();
    expect(H.classFetches).toBeGreaterThan(before);
  });
});
