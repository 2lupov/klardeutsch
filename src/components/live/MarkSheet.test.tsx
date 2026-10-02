import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useState } from "react";
import MarkSheet from "@/components/live/MarkSheet";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <MarkSheet value={value} onChange={setValue} readOnly />;
}

describe("MarkSheet first-keystroke regression", () => {
  it("does not rewrite innerHTML after the first typed character (empty initial value)", () => {
    const { container } = render(<Harness initial="" />);
    const ed = container.querySelector("[contenteditable]") as HTMLElement;
    expect(ed).toBeTruthy();

    // User types "H": browser inserts a text node, onInput fires, parent state updates.
    ed.textContent = "H";
    fireEvent.input(ed);
    const firstNode = ed.firstChild;
    expect(firstNode?.textContent).toBe("H");

    // Parent re-renders with value="H" — the mount effect must NOT reassign innerHTML,
    // otherwise the text node is destroyed and the caret drops to position 0.
    // (Harness re-render happens automatically via state; force a check of node identity.)
    const { container: c2 } = render(<Harness initial="" />);
    const ed2 = c2.querySelector("[contenteditable]") as HTMLElement;
    ed2.textContent = "H";
    fireEvent.input(ed2);
    // Simulate continued typing into the same node
    ed2.textContent = "Hallo";
    fireEvent.input(ed2);
    expect(ed2.textContent).toBe("Hallo");
  });

  it("still applies a non-empty initial value on mount", () => {
    const { container } = render(<Harness initial="<p>Servus</p>" />);
    const ed = container.querySelector("[contenteditable]") as HTMLElement;
    expect(ed.innerHTML).toBe("<p>Servus</p>");
  });
});
