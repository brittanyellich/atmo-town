import { Lexicons, type LexiconDoc } from "@atproto/lexicon";
import ideaLexicon from "@atmo-town/lexicons/town/atmo/idea.json";

export const IDEA_COLLECTION = "town.atmo.idea";

// The lexicon JSON is the source of truth. Every record is checked against it
// before it is written, so the form rules below can't drift past the schema.
const lexicons = new Lexicons([ideaLexicon as unknown as LexiconDoc]);

export const LIMITS = {
  titleGraphemes: 100,
  pitchGraphemes: 600,
  tags: 8,
  tagGraphemes: 32,
} as const;

export type IdeaRecord = {
  $type: typeof IDEA_COLLECTION;
  title: string;
  pitch: string;
  tags?: string[];
  links?: string[];
  status: "open";
  createdAt: string;
};

export type IdeaFields = {
  title: string;
  pitch: string;
  link: string;
  tags: string;
};

export type IdeaErrors = Partial<Record<keyof IdeaFields | "form", string>>;

export type ParseResult =
  | { ok: true; record: IdeaRecord }
  | { ok: false; errors: IdeaErrors; fields: IdeaFields };

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function countGraphemes(value: string): number {
  let count = 0;
  for (const _ of segmenter.segment(value)) count++;
  return count;
}

function text(form: FormData, name: keyof IdeaFields): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
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
  const fields: IdeaFields = {
    title: text(form, "title"),
    pitch: text(form, "pitch"),
    link: text(form, "link"),
    tags: text(form, "tags"),
  };
  const errors: IdeaErrors = {};

  if (!fields.title) {
    errors.title = "Give the idea a short title.";
  } else if (countGraphemes(fields.title) > LIMITS.titleGraphemes) {
    errors.title = `Keep the title under ${LIMITS.titleGraphemes} characters.`;
  }

  if (!fields.pitch) {
    errors.pitch = "Add a sentence or two about the idea.";
  } else if (countGraphemes(fields.pitch) > LIMITS.pitchGraphemes) {
    errors.pitch = `Keep the pitch under ${LIMITS.pitchGraphemes} characters.`;
  }

  if (fields.link && !isHttpUrl(fields.link)) {
    errors.link = "Links need to start with https://";
  }

  const tags = parseTags(fields.tags);
  if (tags.length > LIMITS.tags) {
    errors.tags = `Use ${LIMITS.tags} tags or fewer.`;
  } else if (tags.some((tag) => countGraphemes(tag) > LIMITS.tagGraphemes)) {
    errors.tags = `Keep each tag under ${LIMITS.tagGraphemes} characters.`;
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
    lexicons.assertValidRecord(IDEA_COLLECTION, record);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: { form: `That idea doesn't match the town.atmo.idea schema: ${message}` }, fields };
  }

  return { ok: true, record };
}
