import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IdentityEvent, RecordEvent } from "@atproto/tap";
import { afterEach, beforeEach, expect, it } from "vitest";
import { openIdeaIndex } from "../../indexer/idea-index.ts";
import { readIdeasPage } from "../../indexer/read-ideas.ts";

const did = "did:plc:abcdefghijklmnopqrstuvwx";
const other = "did:plc:zyxwvutsrqponmlkjihgfedc";
const rkey = "3lxyzabcdefg2";
const createdAt = "2026-11-10T00:00:00.000Z";
const create: RecordEvent = {
  id: 1, type: "record", action: "create", did, rkey, rev: rkey,
  collection: "town.atmo.idea", live: true,
  record: { $type: "town.atmo.idea", title: "One", pitch: "A pitch", createdAt },
};
const identity: IdentityEvent = {
  id: 2, type: "identity", did, handle: "author.example", isActive: false, status: "deactivated",
};

let directory: string;
let path: string;
let index: ReturnType<typeof openIdeaIndex>;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "atmo-idea-index-"));
  path = join(directory, "ideas.sqlite");
  index = openIdeaIndex(path);
});
afterEach(() => {
  index.close();
  rmSync(directory, { recursive: true, force: true });
});

it("persists one row on replay, preserves creation order on edit, and removes deleted records", () => {
  index.apply(create);
  index.apply(create);
  index.apply({
    ...create, action: "update",
    record: { ...create.record, title: "Edited", createdAt: "2026-11-11T00:00:00.000Z" },
  });
  expect(readIdeasPage(path).ideas).toEqual([
    { did, rkey, title: "Edited", pitch: "A pitch", createdAt: Date.parse(createdAt) },
  ]);
  index.apply({ ...create, action: "delete", record: undefined });
  index.apply({ ...create, action: "delete", record: undefined });
  expect(readIdeasPage(path).ideas).toEqual([]);
});

it("skips unrelated events and removes an idea replaced by an invalid record", () => {
  index.apply({ ...create, collection: "app.bsky.feed.post" });
  expect(readIdeasPage(path).ideas).toEqual([]);
  index.apply(create);
  index.apply({ ...create, action: "update", record: { ...create.record, pitch: 42 } });
  expect(readIdeasPage(path).ideas).toEqual([]);
});

it("hides unavailable repositories and clears a deleted repository's ideas", () => {
  index.apply(create);
  index.apply(identity);
  index.apply({ ...create, did: other });
  expect(readIdeasPage(path).ideas.map((idea) => idea.did)).toEqual([other]);
  index.apply({ ...identity, status: "active", isActive: true });
  expect(readIdeasPage(path).ideas).toHaveLength(2);
  index.apply({ ...identity, status: "deleted" });
  index.apply({ ...identity, status: "active", isActive: true });
  expect(readIdeasPage(path).ideas.map((idea) => idea.did)).toEqual([other]);
});

it("pages through a timestamp tie across authors without repeats or gaps", () => {
  for (const suffix of "234567abcdefghijklmnopqrstuvwxyz") {
    index.apply({ ...create, rkey: `3lxyzabcdefg${suffix}` });
  }
  index.apply({ ...create, did: other });
  const first = readIdeasPage(path);
  expect(first.ideas).toHaveLength(25);
  expect(first.next).toBeDefined();
  expect(first.ideas[0]?.did).toBe(other);
  const second = readIdeasPage(path, first.next);
  expect(second.ideas).toHaveLength(8);
  expect(second.next).toBeUndefined();
  expect(new Set([...first.ideas, ...second.ideas].map((idea) => `${idea.did}/${idea.rkey}`)).size).toBe(33);
});
