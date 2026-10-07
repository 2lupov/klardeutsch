import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import MarkSheet from "@/components/live/MarkSheet";

describe("dump", () => {
  it("dumps toolbar html", () => {
    const { container } = render(<MarkSheet value="<p>T</p>" onChange={() => {}} />);
    const bar = container.querySelector("div.flex.h-10");
    console.log("TOOLBAR:", bar?.innerHTML);
  });
});
