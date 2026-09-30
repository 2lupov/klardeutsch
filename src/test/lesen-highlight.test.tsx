import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LesenBlock from "@/components/blocks/LesenBlock";
import type { LessonBlock } from "@/components/blocks/types";

const block = (payload: any): LessonBlock => ({ id: "b1", type: "lesen", title: "Lesen", payload } as any);

describe("LesenBlock highlighter", () => {
  it("hides the toolbar when the teacher did not enable it", () => {
    render(<LesenBlock block={block({ text: "Ich gebe dem Mann das Buch." })} value={{}} onChange={() => {}} />);
    expect(screen.queryByText("Гумка")).toBeNull();
  });

  it("shows instruction, colors and eraser when enabled", () => {
    render(
      <LesenBlock
        block={block({ text: "Ich gebe dem Mann das Buch.", enable_highlight: true, highlight_colors: ["yellow", "blue"], highlight_instructions: "Dativ синім" })}
        value={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Dativ синім")).toBeTruthy();
    expect(screen.getByLabelText("Жовтий")).toBeTruthy();
    expect(screen.getByLabelText("Синій")).toBeTruthy();
    expect(screen.queryByLabelText("Червоний")).toBeNull();
    expect(screen.getByText("Гумка")).toBeTruthy();
  });

  it("paints saved highlights and clears one on click", () => {
    const onChange = vi.fn();
    const text = "Ich gebe dem Mann das Buch.";
    const { container } = render(
      <LesenBlock
        block={block({ text, enable_highlight: true })}
        value={{ highlights: [{ start: 9, end: 17, color: "blue" }] }}
        onChange={onChange}
      />,
    );
    const painted = container.querySelectorAll("p.lesson-reading-text .hl-blue");
    expect(painted.length).toBeGreaterThan(0);
    expect(Array.from(painted).map((n) => n.textContent).join("")).toContain("dem Mann");
    fireEvent.click(painted[0]);
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].highlights).toEqual([]);
  });
});
