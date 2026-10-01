import { describe, expect, it } from "vitest";
import { youtubeVideoId } from "@/components/live/useLiveVideo";

describe("youtubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("extracts a YouTube video ID from %s", (url, expected) => {
    expect(youtubeVideoId(url)).toBe(expected);
  });

  it("rejects non-YouTube links", () => {
    expect(youtubeVideoId("https://example.com/video")).toBeNull();
  });
});