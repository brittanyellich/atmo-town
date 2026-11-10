import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, redirect } from "react-router";
import Home, { loader } from "./home";

const mocks = vi.hoisted(() => ({
  listRecords: vi.fn(), getSignedInDid: vi.fn(), requireAgent: vi.fn(), lookupHandle: vi.fn(),
}));
vi.mock("~/lib/session.server", () => mocks);

const DID = "did:plc:alice";
const token = "a+/=&?#% cursor";
const record = (id: number) => ({ uri: `at://${DID}/town.atmo.idea/${id}`, value: { title: `Idea ${id}`, pitch: "A pitch" } });
const load = (path = "/") => loader({ request: new Request(`http://127.0.0.1:5173${path}`) } as Parameters<typeof loader>[0]);
const render = (data: Awaited<ReturnType<typeof loader>>) => renderToStaticMarkup(
  createElement(MemoryRouter, {}, createElement(Home, { loaderData: data } as Parameters<typeof Home>[0])),
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInDid.mockResolvedValue(DID);
  mocks.requireAgent.mockResolvedValue({ did: DID, agent: { com: { atproto: { repo: { listRecords: mocks.listRecords } } } } });
  mocks.lookupHandle.mockResolvedValue("alice.test");
});

describe("home pagination", () => {
  it("makes 51 ideas reachable in two bounded requests and round-trips the opaque cursor", async () => {
    mocks.listRecords.mockResolvedValueOnce({ data: { records: Array.from({ length: 50 }, (_, i) => record(i)), cursor: token } })
      .mockResolvedValueOnce({ data: { records: [record(50)], cursor: "last-record" } });
    const first = await load();
    if (!first.signedIn) throw new Error("Expected signed-in data");
    expect(first.ideas).toHaveLength(50);
    expect(render(first)).toContain('href="/?cursor=a%2B%2F%3D%26%3F%23%25+cursor"');
    expect(render(first)).toContain("Next page");
    expect(render(first)).not.toContain("First page");
    const second = await load(first.nextPage);
    if (!second.signedIn) throw new Error("Expected signed-in data");
    expect(second.ideas.map((idea) => idea.title)).toEqual(["Idea 50"]);
    expect(mocks.listRecords.mock.calls).toEqual([
      [{ repo: DID, collection: "town.atmo.idea", limit: 50 }],
      [{ repo: DID, collection: "town.atmo.idea", limit: 50, cursor: token }],
    ]);
    expect(render(second)).toContain('href="/"');
    expect(render(second)).toContain("First page");
    expect(render(second)).not.toContain("Next page");
  });

  it.each([undefined, ""])("omits next-page navigation for final cursor %j", async (cursor) => {
    mocks.listRecords.mockResolvedValue({ data: { records: [record(1)], cursor } });
    const data = await load();
    expect(render(data)).not.toContain("Next page");
    expect(mocks.listRecords).toHaveBeenCalledTimes(1);
  });

  it.each([0, 1, 49])("omits next-page navigation for a short page of %i records even with a cursor", async (count) => {
    mocks.listRecords.mockResolvedValue({ data: { records: Array.from({ length: count }, (_, i) => record(i)), cursor: "last-record" } });
    const data = await load();
    expect(render(data)).not.toContain("Next page");
    expect(mocks.listRecords).toHaveBeenCalledTimes(1);
  });

  it("distinguishes an empty cursor page from an empty account", async () => {
    mocks.listRecords.mockResolvedValue({ data: { records: [] } });
    expect(render(await load())).toContain("Nothing pinned yet.");
    const page = render(await load("/?cursor=last"));
    expect(page).toContain("No ideas on this page.");
    expect(page).toContain("First page");
    expect(page).not.toContain("Nothing pinned yet.");
  });

  it("keeps a failed cursor request distinct from an empty page and offers recovery", async () => {
    mocks.listRecords.mockRejectedValue(new Error("Invalid cursor"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const page = render(await load("/?cursor=invalid&repo=someone-else&collection=other"));
      expect(page).toContain("Couldn&#x27;t load your ideas from your PDS.");
      expect(page).toContain("First page");
      expect(page).not.toContain("Next page");
      expect(page).not.toContain("Nothing pinned yet.");
      expect(mocks.listRecords).toHaveBeenCalledExactlyOnceWith({ repo: DID, collection: "town.atmo.idea", limit: 50, cursor: "invalid" });
    } finally { errorLog.mockRestore(); }
  });

  it("does not contact the PDS for signed-out requests", async () => {
    mocks.getSignedInDid.mockResolvedValue(undefined);
    expect(render(await load("/?cursor=private"))).toContain("Welcome to town");
    expect(mocks.requireAgent).not.toHaveBeenCalled();
    expect(mocks.listRecords).not.toHaveBeenCalled();
  });

  it("propagates reauthentication without attempting a page read", async () => {
    const response = redirect("/login?returnTo=%2F%3Fcursor%3Dresume");
    mocks.requireAgent.mockRejectedValue(response);
    await expect(load("/?cursor=resume")).rejects.toBe(response);
    expect(mocks.listRecords).not.toHaveBeenCalled();
  });
});
