import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WelcomeIntro from "@/components/onboarding/WelcomeIntro";

const mocks = vi.hoisted(() => ({
  singleMock: vi.fn(),
  updateMock: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: mocks.singleMock }) }),
      update: mocks.updateMock,
    }),
  },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ lang: "uk" }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: {} } }),
}));

const clickNext = () => fireEvent.click(screen.getByRole("button", { name: /Далі/ }));

describe("WelcomeIntro nickname slide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.singleMock.mockResolvedValue({ data: { nickname: "nastya", display_name: "Nastya" } });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.updateMock.mockReturnValue({ eq: mocks.updateEq });
  });

  it("is the first slide and prefills the profile nickname", async () => {
    render(<WelcomeIntro onComplete={() => {}} />);
    expect(screen.getByText("Твій особистий нікнейм")).toBeTruthy();
    await waitFor(() => expect((screen.getByPlaceholderText("твій_нікнейм") as HTMLInputElement).value).toBe("nastya"));
    expect(screen.getByText(/за ним повертається пароль/i)).toBeTruthy();
  });

  it("blocks invalid nicknames without saving", async () => {
    render(<WelcomeIntro onComplete={() => {}} />);
    await waitFor(() => expect((screen.getByPlaceholderText("твій_нікнейм") as HTMLInputElement).value).toBe("nastya"));
    fireEvent.change(screen.getByPlaceholderText("твій_нікнейм"), { target: { value: "поганий нік!" } });
    clickNext();
    expect(await screen.findByText(/3–24 символи без пробілів/i)).toBeTruthy();
    expect(screen.getByText("Твій особистий нікнейм")).toBeTruthy();
    expect(mocks.updateMock).not.toHaveBeenCalled();
  });

  it("advances without saving when the nickname is unchanged", async () => {
    render(<WelcomeIntro onComplete={() => {}} />);
    await waitFor(() => expect((screen.getByPlaceholderText("твій_нікнейм") as HTMLInputElement).value).toBe("nastya"));
    clickNext();
    expect(await screen.findByText("Живі заняття")).toBeTruthy();
    expect(mocks.updateMock).not.toHaveBeenCalled();
  });

  it("saves a changed nickname and advances", async () => {
    render(<WelcomeIntro onComplete={() => {}} />);
    const input = await waitFor(() => screen.getByPlaceholderText("твій_нікнейм"));
    await waitFor(() => expect((input as HTMLInputElement).value).toBe("nastya"));
    fireEvent.change(input, { target: { value: "nastya2" } });
    clickNext();
    expect(mocks.updateMock).toHaveBeenCalledWith({ nickname: "nastya2" });
    expect(await screen.findByText("Живі заняття")).toBeTruthy();
  });

  it("reports a taken nickname and stays on the slide", async () => {
    mocks.updateEq.mockResolvedValue({ error: { code: "23505" } });
    render(<WelcomeIntro onComplete={() => {}} />);
    const input = await waitFor(() => screen.getByPlaceholderText("твій_нікнейм"));
    await waitFor(() => expect((input as HTMLInputElement).value).toBe("nastya"));
    fireEvent.change(input, { target: { value: "nastya2" } });
    clickNext();
    expect(await screen.findByText(/уже зайнятий/i)).toBeTruthy();
    expect(screen.getByText("Твій особистий нікнейм")).toBeTruthy();
  });
});
