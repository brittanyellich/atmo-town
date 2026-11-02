import { describe, expect, it } from "vitest";
import { countGraphemes, parseIdeaForm, parseTags } from "./idea";

const NOW = new Date("2026-11-02T20:00:00.000Z");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseIdeaForm", () => {
  it("builds a valid town.atmo.idea record from title and pitch only", () => {
    const result = parseIdeaForm(form({ title: "  Atmosphere Wrapped ", pitch: "A year-end recap." }), NOW);
    expect(result).toEqual({
      ok: true,
      record: {
        $type: "town.atmo.idea",
        title: "Atmosphere Wrapped",
        pitch: "A year-end recap.",
        status: "open",
        createdAt: "2026-11-02T20:00:00.000Z",
      },
    });
  });

  it("includes optional link and tags when given", () => {
    const result = parseIdeaForm(
      form({ title: "Wrapped", pitch: "Recap.", link: "https://teal.fm", tags: "music, recap, Music" }),
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.links).toEqual(["https://teal.fm"]);
      expect(result.record.tags).toEqual(["music", "recap"]);
    }
  });

  it("requires a title and a pitch", () => {
    const result = parseIdeaForm(form({ title: " ", pitch: "" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toBeDefined();
      expect(result.errors.pitch).toBeDefined();
    }
  });

  it("rejects non-http links", () => {
    const result = parseIdeaForm(form({ title: "T", pitch: "P", link: "javascript:alert(1)" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.link).toBeDefined();
  });

  it("enforces the title grapheme limit, counting emoji as one character", () => {
    const fits = parseIdeaForm(form({ title: "🏡".repeat(100), pitch: "P" }), NOW);
    expect(fits.ok).toBe(true);
    const tooLong = parseIdeaForm(form({ title: "a".repeat(101), pitch: "P" }), NOW);
    expect(tooLong.ok).toBe(false);
  });

  it("enforces the tag count limit", () => {
    const tags = Array.from({ length: 9 }, (_, i) => `t${i}`).join(",");
    const result = parseIdeaForm(form({ title: "T", pitch: "P", tags }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.tags).toBeDefined();
  });

  it("keeps what the person typed when validation fails", () => {
    const result = parseIdeaForm(form({ title: "", pitch: "Keep me", tags: "a, b" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fields).toMatchObject({ pitch: "Keep me", tags: "a, b" });
  });
});

describe("helpers", () => {
  it("counts graphemes, not UTF-16 units", () => {
    expect(countGraphemes("👩‍👩‍👧‍👦")).toBe(1);
  });

  it("drops empty and duplicate tags", () => {
    expect(parseTags(" ,a,, A ,b ")).toEqual(["a", "b"]);
  });
});

describe("emoji-heavy input", () => {
  it("accepts a tag of 32 emoji", () => {
    const result = parseIdeaForm(form({ title: "T", pitch: "P", tags: "🎵".repeat(32) }), NOW);
    expect(result.ok).toBe(true);
  });
});
