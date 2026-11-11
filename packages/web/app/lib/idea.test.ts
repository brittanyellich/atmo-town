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
      submittedFields: { title: "  Atmosphere Wrapped ", pitch: "A year-end recap.", link: "", tags: "" },
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

  it.each(["http://teal.fm", "https://teal.fm"])("accepts the advertised scheme in %s", (link) => {
    const result = parseIdeaForm(form({ title: "T", pitch: "P", link }), NOW);
    expect(result).toMatchObject({ ok: true, record: { links: [link] } });
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "not a url"])("explains accepted schemes for %s", (link) => {
    const result = parseIdeaForm(form({ title: "T", pitch: "P", link }), NOW);
    expect(result).toMatchObject({
      ok: false,
      errors: { link: "Links need to start with http:// or https://" },
      fields: { title: "T", pitch: "P", link },
    });
  });

  it.each([
    { field: "title", limit: 100, message: "Use 100 characters or fewer for the title." },
    { field: "pitch", limit: 600, message: "Use 600 characters or fewer for the pitch." },
    { field: "tags", limit: 32, message: "Use 32 characters or fewer for each tag." },
  ])("describes the inclusive $field limit and retains rejected input", ({ field, limit, message }) => {
    const atLimit = { title: "T", pitch: "P", link: "https://teal.fm", tags: "music", [field]: "🏡".repeat(limit) };
    expect(parseIdeaForm(form(atLimit), NOW).ok).toBe(true);

    const overLimit = { ...atLimit, [field]: "🏡".repeat(limit + 1) };
    expect(parseIdeaForm(form(overLimit), NOW)).toEqual({
      ok: false,
      errors: { [field]: message },
      fields: overLimit,
    });
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

  it.each([
    { field: "title", graphemes: 100, bytes: 1000 },
    { field: "pitch", graphemes: 600, bytes: 6000 },
    { field: "tags", graphemes: 32, bytes: 320 },
  ])("reports byte overflow on $field while retaining submitted fields", ({ field, graphemes, bytes }) => {
    const fields = { title: "T", pitch: "P", link: "https://teal.fm", tags: "music", [field]: "👩‍👩‍👧‍👦".repeat(graphemes) };
    expect(countGraphemes(fields[field as keyof typeof fields])).toBe(graphemes);
    expect(new TextEncoder().encode(fields[field as keyof typeof fields]).byteLength).toBeGreaterThan(bytes);
    const result = parseIdeaForm(form(fields), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual([field]);
      expect(result.errors[field as "title" | "pitch" | "tags"]).toContain("Shorten");
      expect(result.errors[field as "title" | "pitch" | "tags"]).toContain(`${bytes}-byte limit`);
      expect(result.errors[field as "title" | "pitch" | "tags"]).toContain(
        `${new TextEncoder().encode(fields[field as keyof typeof fields]).byteLength} UTF-8 bytes`,
      );
      expect(result.fields).toEqual(fields);
    }
  });

  it.each([
    { field: "title", bytes: 1000 },
    { field: "pitch", bytes: 6000 },
    { field: "tags", bytes: 320 },
  ])("accepts the exact $field byte limit and rejects one byte over", ({ field, bytes }) => {
    // Combining accents stay in one grapheme; the final ASCII character
    // makes the even byte boundary exact without exceeding grapheme limits.
    const text = "a" + "\u0301".repeat((bytes - 2) / 2) + "b";
    expect(new TextEncoder().encode(text).byteLength).toBe(bytes);
    const fields = { title: "T", pitch: "P", tags: "music", [field]: text };
    expect(parseIdeaForm(form(fields), NOW).ok).toBe(true);
    const result = parseIdeaForm(form({ ...fields, [field]: text + "c" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual([field]);
  });

  it("checks individual trimmed tags after parsing the list", () => {
    const tags = ` music, Music, , ${"👩‍👩‍👧‍👦".repeat(13)}, music `;
    const result = parseIdeaForm(form({ title: "T", pitch: "P", tags }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual(["tags"]);
      expect(result.errors.tags).toContain("Shorten comma-separated tag 4");
      expect(result.errors.tags).toContain("325 UTF-8 bytes exceeds the 320-byte limit");
      expect(result.fields.tags).toBe(tags.trim());
    }
  });
});
