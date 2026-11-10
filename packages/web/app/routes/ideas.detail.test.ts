import { beforeEach, expect, it, vi } from "vitest";
import { ideaPath } from "~/lib/idea-path.server";
import { loader } from "./ideas.detail";

const fetchRecord = vi.hoisted(() => vi.fn());
vi.mock("@atproto-labs/fetch-node", async (importOriginal) => ({
  ...await importOriginal<typeof import("@atproto-labs/fetch-node")>(),
  safeFetchWrap: () => fetchRecord,
}));

const did = "did:plc:abcdefghijklmnopqrstuvwx";
const key = "3lxyzabcdefg2";
const uri = `at://${did}/town.atmo.idea/${key}`;
const load = (params = { did, key }) => loader({
  params, request: new Request(`https://atmo.town${ideaPath(uri)}`),
} as Parameters<typeof loader>[0]);

beforeEach(() => {
  fetchRecord.mockReset();
  fetchRecord.mockResolvedValueOnce(Response.json({
    id: did,
    service: [{ id: "#atproto_pds", type: "AtprotoPersonalDataServer", serviceEndpoint: "https://pds.example" }],
  }));
});

it("reads a public record from the resolved PDS and drops unsafe links", async () => {
  fetchRecord.mockResolvedValueOnce(Response.json({
    uri,
    value: {
      $type: "town.atmo.idea", title: "An idea", pitch: "A pitch",
      createdAt: "2026-11-10T00:00:00.000Z", tags: ["music"],
      links: ["javascript:alert(1)", "https://example.org/"],
    },
  }));

  expect(ideaPath(uri)).toBe(`/ideas/${encodeURIComponent(did)}/${key}`);
  const result = await load();
  expect(result.data.idea).toMatchObject({ did, tags: ["music"], links: ["https://example.org/"] });
  const [url, init] = fetchRecord.mock.calls[1];
  expect(url.origin).toBe("https://pds.example");
  expect(url.pathname).toBe("/xrpc/com.atproto.repo.getRecord");
  expect(Object.fromEntries(url.searchParams)).toEqual({ repo: did, collection: "town.atmo.idea", rkey: key });
  expect(init.redirect).toBe("error");
});

it("returns 404 without contacting the network for an invalid route", async () => {
  expect((await load({ did, key: "not-a-tid" })).init?.status).toBe(404);
  expect(fetchRecord).not.toHaveBeenCalled();
});

it.each([
  { status: 400, error: "RecordNotFound", expected: 404 },
  { status: 503, error: "Unavailable", expected: 503 },
])("maps a PDS $status to page status $expected", async ({ status, error, expected }) => {
  fetchRecord.mockResolvedValueOnce(Response.json({ error }, { status }));
  const result = await load();
  expect(result.init?.status).toBe(expected);
  expect(result.data.idea).toBeNull();
  expect(result.data.unavailable).toBe(expected === 503);
});
