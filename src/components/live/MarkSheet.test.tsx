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

    // User types "H": browser inserts a text node into the editable element.
    ed.textContent = "H";
    const typedNode = ed.firstChild;
    expect(typedNode?.textContent).toBe("H");

    // onInput fires -> parent state updates -> re-render with value="H".
    // The mount effect must NOT reassign innerHTML here: that would destroy the
    // text node and drop the caret to position 0 (the "alloH" bug).
    fireEvent.input(ed);
    expect(ed.firstChild).toBe(typedNode);
    expect(ed.textContent).toBe("H");
  });

  it("still applies a non-empty initial value on mount", () => {
    const { container } = render(<Harness initial="<p>Servus</p>" />);
    const ed = container.querySelector("[contenteditable]") as HTMLElement;
    expect(ed.innerHTML).toBe("<p>Servus</p>");
  });
});

describe("MarkSheet marker palette", () => {
  it("offers yellow, pink and blue markers and applies the clicked color", () => {
    const spy = vi.spyOn(document, "execCommand").mockReturnValue(true);
    const { container, getByTitle } = render(<MarkSheet value="<p>Test</p>" onChange={() => {}} />);

    const swatches = ["#FDE047", "#F9A8D4", "#93C5FD"].map((hex) =>
      container.querySelector(`span[style*="${hex}"]`),
    );
    expect(swatches.every(Boolean)).toBe(true);

    fireEvent.mouseDown(getByTitle("Рожевим"), { preventDefault: () => {} });
    fireEvent.click(getByTitle("Рожевим"));
    expect(spy).toHaveBeenCalledWith("styleWithCSS", false, "true");
    expect(spy).toHaveBeenCalledWith("hiliteColor", false, "#F9A8D4");

    fireEvent.click(getByTitle("Синім"));
    expect(spy).toHaveBeenCalledWith("hiliteColor", false, "#93C5FD");
    spy.mockRestore();
  });
});
