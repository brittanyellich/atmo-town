import { Lexicons, type LexiconDoc } from "@atproto/lexicon";
import ideaLexicon from "@atmo-town/lexicons/town/atmo/idea.json" with { type: "json" };

export const IDEA_COLLECTION = "town.atmo.idea";

// The lexicon JSON is the source of truth. Every record is checked against it
// before it is written, so the form rules below can't drift past the schema.
const lexicons = new Lexicons([ideaLexicon as unknown as LexiconDoc]);

export function assertIdeaRecord(value: unknown): asserts value is IdeaRecord {
  lexicons.assertValidRecord(IDEA_COLLECTION, value);
}

export const LIMITS = {
  titleGraphemes: 100,
  pitchGraphemes: 600,
  tags: 8,
  tagGraphemes: 32,
  titleBytes: ideaLexicon.defs.main.record.properties.title.maxLength,
  pitchBytes: ideaLexicon.defs.main.record.properties.pitch.maxLength,
  tagBytes: ideaLexicon.defs.main.record.properties.tags.items.maxLength,
} as const;

export type IdeaRecord = {
  $type: typeof IDEA_COLLECTION;
  title: string;
  pitch: string;
  tags?: string[];
  links?: string[];
  status?: string;
  createdAt: string;
};

export function isIdeaRecord(value: unknown): value is IdeaRecord {
  try {
    lexicons.assertValidRecord(IDEA_COLLECTION, value);
    return true;
  } catch {
    return false;
  }
}

export type IdeaFields = {
  title: string;
  pitch: string;
  link: string;
  tags: string;
};

export type IdeaErrors = Partial<Record<keyof IdeaFields | "form", string>>;

export type ParseResult =
  | { ok: true; record: IdeaRecord; submittedFields: IdeaFields }
  | { ok: false; errors: IdeaErrors; fields: IdeaFields };

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const encoder = new TextEncoder();

export function countGraphemes(value: string): number {
  let count = 0;
  for (const _ of segmenter.segment(value)) count++;
  return count;
}

function text(form: FormData, name: keyof IdeaFields): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function parseIdeaForm(form: FormData, now: Date = new Date()): ParseResult {
  const submittedFields: IdeaFields = {
    title: text(form, "title"),
    pitch: text(form, "pitch"),
    link: text(form, "link"),
    tags: text(form, "tags"),
  };
  const fields = Object.fromEntries(
    Object.entries(submittedFields).map(([name, value]) => [name, value.trim()]),
  ) as IdeaFields;
  const errors: IdeaErrors = {};

  if (!fields.title) {
    errors.title = "Give the idea a short title.";
  } else if (countGraphemes(fields.title) > LIMITS.titleGraphemes) {
    errors.title = `Use ${LIMITS.titleGraphemes} characters or fewer for the title.`;
  } else if (encoder.encode(fields.title).byteLength > LIMITS.titleBytes) {
    errors.title = `Shorten the title: ${encoder.encode(fields.title).byteLength} UTF-8 bytes exceeds the ${LIMITS.titleBytes}-byte limit. Complex emoji and combined characters take extra space.`;
  }

  if (!fields.pitch) {
    errors.pitch = "Add a sentence or two about the idea.";
  } else if (countGraphemes(fields.pitch) > LIMITS.pitchGraphemes) {
    errors.pitch = `Use ${LIMITS.pitchGraphemes} characters or fewer for the pitch.`;
  } else if (encoder.encode(fields.pitch).byteLength > LIMITS.pitchBytes) {
    errors.pitch = `Shorten the pitch: ${encoder.encode(fields.pitch).byteLength} UTF-8 bytes exceeds the ${LIMITS.pitchBytes}-byte limit. Complex emoji and combined characters take extra space.`;
  }

  if (fields.link && !isHttpUrl(fields.link)) {
    errors.link = "Links need to start with http:// or https://";
  }

  const tags = parseTags(fields.tags);
  if (tags.length > LIMITS.tags) {
    errors.tags = `Use ${LIMITS.tags} tags or fewer.`;
  } else if (tags.some((tag) => countGraphemes(tag) > LIMITS.tagGraphemes)) {
    errors.tags = `Use ${LIMITS.tagGraphemes} characters or fewer for each tag.`;
  } else {
    const oversizedTag = tags.findIndex((tag) => encoder.encode(tag).byteLength > LIMITS.tagBytes);
    if (oversizedTag !== -1) {
      const tagNumber = fields.tags.split(",").findIndex((tag) => tag.trim() === tags[oversizedTag]) + 1;
      errors.tags = `Shorten comma-separated tag ${tagNumber}: ${encoder.encode(tags[oversizedTag]).byteLength} UTF-8 bytes exceeds the ${LIMITS.tagBytes}-byte limit. Complex emoji and combined characters take extra space.`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, fields };

  const record: IdeaRecord = {
    $type: IDEA_COLLECTION,
    title: fields.title,
    pitch: fields.pitch,
    ...(tags.length > 0 ? { tags } : {}),
    ...(fields.link ? { links: [fields.link] } : {}),
    status: "open",
    createdAt: now.toISOString(),
  };

  try {
    assertIdeaRecord(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: { form: `That idea doesn't match the town.atmo.idea schema: ${message}` }, fields };
  }

  return { ok: true, record, submittedFields };
}
