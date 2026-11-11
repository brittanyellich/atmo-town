import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openIdeaIndex } from "../../indexer/idea-index";
import NoticeBoard, { loader } from "./notice-board";

const firstAuthor = "did:plc:abcdefghijklmnopqrstuvwx";
const secondAuthor = "did:plc:zyxwvutsrqponmlkjihgfedc";
const hiddenAuthor = "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa";
const createdAt = "2026-11-10T00:00:00.000Z";

let directory: string;
let index: ReturnType<typeof openIdeaIndex>;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "atmo-notice-board-"));
  const path = join(directory, "ideas.sqlite");
  index = openIdeaIndex(path);
  vi.stubEnv("ATMO_IDEA_INDEX_PATH", path);
});

afterEach(() => {
  index.close();
  rmSync(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function load(path = "/notice-board") {
  return loader({ request: new Request(`https://atmo.town${path}`) } as Parameters<typeof loader>[0]);
}

function render(result: ReturnType<typeof loader>) {
  return renderToStaticMarkup(createElement(MemoryRouter, {},
    createElement(NoticeBoard, { loaderData: result.data } as Parameters<typeof NoticeBoard>[0]),
  ));
}

function add(did: string, rkey: string, title: string, date = createdAt) {
  index.apply({
    type: "record", id: 1, rev: rkey, action: "create", collection: "town.atmo.idea",
    did: did as `did:${string}:${string}`, rkey, live: false,
    record: { $type: "town.atmo.idea", title, pitch: "A pitch", createdAt: date },
  });
}

it("renders public detail links and pages a timestamp tie across authors without gaps", () => {
  const keys = [..."234567abcdefghijklmnopqrst"].map((suffix) => `3lxyzabcdefg${suffix}`);
  for (const [i, key] of keys.entries()) add(i < 25 ? secondAuthor : firstAuthor, key, `Idea ${i}`);
  add(hiddenAuthor, keys[0], "Unavailable idea");
  index.apply({
    id: 2, type: "identity", did: hiddenAuthor, handle: "hidden.example",
    isActive: false, status: "deactivated",
  });
  add(firstAuthor, "3lxyzabcdefgz", "Deleted idea");
  index.apply({
    id: 3, type: "record", did: firstAuthor, rev: "3lxyzabcdefgz", collection: "town.atmo.idea",
    rkey: "3lxyzabcdefgz", action: "delete", live: true,
  });

  const first = load();
  expect(first.init?.status).toBe(200);
  if (first.data.state !== "available" || !first.data.next) throw new Error("Expected another page");
  expect(first.data.ideas).toHaveLength(25);
  expect(first.data.ideas[0]?.did).toBe(secondAuthor);
  expect(first.data.ideas.at(-1)?.did).toBe(secondAuthor);

  const second = load(first.data.next);
  if (second.data.state !== "available") throw new Error("Expected a second page");
  expect(second.data.ideas).toHaveLength(1);
  expect(second.data.next).toBeUndefined();
  const ideas = [...first.data.ideas, ...second.data.ideas];
  expect(new Set(ideas.map((idea) => idea.title))).toEqual(new Set(keys.map((_, i) => `Idea ${i}`)));
  expect(render(first)).toContain(`href="${first.data.ideas[0].detailPath}"`);
  expect(render(first)).toContain("Next page");
  expect(render(second)).toContain("First page");
});

it("distinguishes an initialized empty index from an exhausted page", () => {
  const empty = load();
  expect(empty.init?.status).toBe(200);
  expect(render(empty)).toContain("No ideas have been indexed yet.");
  const token = Buffer.from(JSON.stringify([0, firstAuthor, "3lxyzabcdefg2"])).toString("base64url");
  const exhausted = load(`/notice-board?cursor=${token}`);
  expect(exhausted.init?.status).toBe(200);
  expect(render(exhausted)).toContain("There are no ideas on this page.");
  expect(render(exhausted)).toContain("First page");
});

it.each(["?cursor=!", "?cursor=", "?cursor=abc&cursor=def"])("rejects an invalid page link %s", (query) => {
  const result = load(`/notice-board${query}`);
  expect(result.init?.status).toBe(400);
  expect(render(result)).toContain("This page link is invalid.");
  expect(render(result)).toContain("First page");
});

it("reports an unavailable index and offers to retry the same page", () => {
  vi.stubEnv("ATMO_IDEA_INDEX_PATH", join(directory, "missing.sqlite"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const token = Buffer.from(JSON.stringify([0, firstAuthor, "3lxyzabcdefg2"])).toString("base64url");
  const path = `/notice-board?cursor=${token}`;
  const result = load(path);
  expect(result.init?.status).toBe(503);
  expect(log.mock.calls).toEqual([["Notice board index read failed", { errorType: "Error", sqliteCode: 14 }]]);
  expect(render(result)).toContain("Ideas are temporarily unavailable.");
  expect(render(result)).toContain(`href="${path}"`);
  expect(render(result)).toContain("Try again");
});

it("keeps future-dated ideas out of New until their timestamp arrives", () => {
  const now = new Date("2026-11-11T00:00:00.000Z");
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(now);
    add(firstAuthor, "3lxyzabcdefg2", "Current idea");
    const future = new Date(now.getTime() + 60_000);
    add(secondAuthor, "3lxyzabcdefg3", "Future idea", future.toISOString());
    const current = load();
    if (current.data.state !== "available") throw new Error("Expected indexed ideas");
    expect(current.data.ideas.map(({ title }) => title)).toEqual(["Current idea"]);

    vi.setSystemTime(future);
    const later = load();
    if (later.data.state !== "available") throw new Error("Expected indexed ideas");
    expect(later.data.ideas.map(({ title }) => title)).toEqual(["Future idea", "Current idea"]);
  } finally {
    vi.useRealTimers();
  }
});
