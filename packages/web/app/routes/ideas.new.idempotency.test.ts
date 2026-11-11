import type { IdeaRecord } from "~/lib/idea";
import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { newIdeaSubmission, readIdeaSubmission } from "~/lib/idea-submission.server";
import { action } from "./ideas.new";

const mocks = vi.hoisted(() => ({ requireAgent: vi.fn() }));
vi.mock("~/lib/session.server", () => ({ requireAgent: mocks.requireAgent }));

const did = "did:plc:abcdefghijklmnopqrstuvwx";
const records = new Map<string, IdeaRecord>();
let commits: number;
let loseResponse: boolean;
let readUnavailable: boolean;
let writeUnavailable: boolean;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  records.clear();
  commits = 0;
  loseResponse = false;
  readUnavailable = false;
  writeUnavailable = false;
  const repo = {
    async putRecord(input: { rkey: string; record: IdeaRecord; repo: string; swapRecord: null }) {
      if (writeUnavailable) throw Object.assign(new Error("private upstream detail"), { status: 503, error: "UpstreamUnavailable" });
      expect(input.repo).toBe(did);
      expect(input.swapRecord).toBeNull();
      if (records.has(input.rkey)) throw new Error("InvalidSwap");
      records.set(input.rkey, structuredClone(input.record));
      commits++;
      await Promise.resolve();
      if (loseResponse) throw new Error("Connection lost after commit");
      return { data: { uri: `at://${did}/town.atmo.idea/${input.rkey}`, cid: "fixture-cid" } };
    },
    async getRecord({ rkey }: { rkey: string }) {
      if (readUnavailable) throw new Error("Read unavailable");
      const value = records.get(rkey);
      if (!value) throw new Error("RecordNotFound");
      return { data: { uri: `at://${did}/town.atmo.idea/${rkey}`, value: structuredClone(value) } };
    },
  };
  mocks.requireAgent.mockResolvedValue({ did, agent: { com: { atproto: { repo } } } });
});

afterEach(() => vi.restoreAllMocks());

function submit(submission: string, title = " An idea ") {
  const request = new Request("https://atmo.town/ideas/new", {
    method: "POST",
    body: new URLSearchParams({ submission, title, pitch: " Keep this draft. ", tags: "Music, music" }),
  });
  return action({ request } as Parameters<typeof action>[0]);
}

it("reconciles commit-then-throw and retries to one record, URI, and timestamp", async () => {
  const token = newIdeaSubmission(did);
  const identity = readIdeaSubmission(token, did);
  const before = Date.now();
  loseResponse = true;
  const initial = await submit(token);
  const retry = await submit(token);
  expect(initial).toEqual(retry);
  expect(initial).toHaveProperty("posted.uri", `at://${did}/town.atmo.idea/${identity?.rkey}`);
  expect(records.size).toBe(1);
  expect(commits).toBe(1);
  expect(Date.parse([...records.values()][0].createdAt)).toBeGreaterThanOrEqual(before);
});

it("serializes concurrent attempts at the PDS conditional creation boundary", async () => {
  const token = newIdeaSubmission(did);
  const results = await Promise.all([submit(token), submit(token), submit(token)]);
  expect(results[0]).toHaveProperty("posted");
  expect(results[1]).toEqual(results[0]);
  expect(results[2]).toEqual(results[0]);
  expect(commits).toBe(1);
  expect(records.size).toBe(1);
});

it("retains a changed draft without overwriting the committed version", async () => {
  const token = newIdeaSubmission(did);
  await submit(token);
  const changed = await submit(token, " Edited idea ");
  if (!("fields" in changed)) throw new Error("Expected a recoverable conflict");
  expect(changed.fields.title).toBe(" Edited idea ");
  expect(changed.submission).toBe(token);
  expect(changed.existingPath).toBeDefined();
  expect([...records.values()][0].title).toBe("An idea");
  expect(commits).toBe(1);
});

it("does not overwrite unrelated data at a colliding key", async () => {
  const token = newIdeaSubmission(did);
  const identity = readIdeaSubmission(token, did);
  if (!identity) throw new Error("Invalid fixture token");
  const unrelated: IdeaRecord = {
    $type: "town.atmo.idea", title: "Unrelated", pitch: "Keep me",
    createdAt: "2020-01-01T00:00:00.000Z", status: "open",
  };
  records.set(identity.rkey, unrelated);
  expect(await submit(token)).toHaveProperty("existingPath");
  expect(records.get(identity.rkey)).toEqual(unrelated);
  expect(commits).toBe(0);
});

it("makes an explicitly fresh submission a separate idea", async () => {
  const first = await submit(newIdeaSubmission(did));
  const second = await submit(newIdeaSubmission(did));
  expect(first).toHaveProperty("posted");
  expect(second).toHaveProperty("posted");
  expect(first).not.toEqual(second);
  expect(records.size).toBe(2);
});

it.each([
  () => newIdeaSubmission("did:plc:anotherauthor"),
  () => newIdeaSubmission(did) + "tampered",
  () => "",
])("rejects an invalid or different-author token without writing", async (makeToken) => {
  const result = await submit(makeToken());
  expect(result).toHaveProperty("errors");
  expect(records.size).toBe(0);
  if (!("fields" in result)) throw new Error("Expected retained fields");
  expect(result.fields.title).toBe(" An idea ");
  expect(readIdeaSubmission(result.submission, did)).toBeDefined();
});

it("retains the submission after an ambiguous write and failed reconciliation", async () => {
  const token = newIdeaSubmission(did);
  loseResponse = true;
  readUnavailable = true;
  const uncertain = await submit(token);
  expect(uncertain).toHaveProperty("submission", token);
  expect(uncertain).toHaveProperty("fields.title", " An idea ");
  readUnavailable = false;
  const retry = await submit(token);
  expect(retry).toHaveProperty("posted");
  expect(records.size).toBe(1);
  expect(commits).toBe(1);
});

it("allows draft corrections when a failed attempt never committed", async () => {
  const token = newIdeaSubmission(did);
  writeUnavailable = true;
  expect(await submit(token)).toHaveProperty("submission", token);
  expect(console.error).toHaveBeenCalledWith("Idea publication could not be confirmed", {
    write: { type: "Error", status: 503, code: "UpstreamUnavailable", causeCode: undefined },
    read: { type: "Error", status: undefined, code: undefined, causeCode: undefined },
  });
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private upstream detail");
  writeUnavailable = false;
  expect(await submit(token, " Corrected draft ")).toHaveProperty("posted.title", "Corrected draft");
  expect(records.size).toBe(1);
  expect(commits).toBe(1);
});

it("retains the changed draft for a fresh identity without publishing it", async () => {
  const token = newIdeaSubmission(did);
  await submit(token);
  const fields = { title: " Changed draft ", pitch: " Keep this pitch. ", tags: "Music, music", link: "" };
  const request = new Request("https://atmo.town/ideas/new", {
    method: "POST", body: new URLSearchParams({ ...fields, submission: token, intent: "fresh" }),
  });
  const result = await action({ request } as Parameters<typeof action>[0]);
  if (!("fields" in result)) throw new Error("Expected draft review");
  expect(result.fields).toEqual(fields);
  expect(result.submission).not.toBe(token);
  expect(commits).toBe(1);
  expect(await submit(result.submission, fields.title)).toHaveProperty("posted");
  expect(records.size).toBe(2);
});

it("timestamps a delayed form when first submitted and preserves it on later retry", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = newIdeaSubmission(did);
    vi.setSystemTime(new Date("2026-01-05T00:00:00.000Z"));
    const first = await submit(token);
    expect([...records.values()][0].createdAt).toBe("2026-01-05T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-01-06T00:00:00.000Z"));
    expect(await submit(token)).toEqual(first);
    expect([...records.values()][0].createdAt).toBe("2026-01-05T00:00:00.000Z");
    expect(commits).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});
