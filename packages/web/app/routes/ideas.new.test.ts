import { expect, it, vi } from "vitest";
import { action } from "./ideas.new";

const mocks = vi.hoisted(() => ({ requireAgent: vi.fn(), createRecord: vi.fn() }));
vi.mock("~/lib/session.server", () => ({ requireAgent: mocks.requireAgent }));

it("returns the original draft after a failed PDS write while sending a normalized record", async () => {
  const did = "did:plc:abcdefghijklmnopqrstuvwx";
  mocks.requireAgent.mockResolvedValue({
    did, agent: { com: { atproto: { repo: { createRecord: mocks.createRecord } } } },
  });
  mocks.createRecord.mockRejectedValueOnce(new Error("Fixture PDS failure"));
  const original = {
    title: "  A town idea  ",
    pitch: "\n  Build together.\n ",
    link: " https://example.org/idea ",
    tags: "  Music , music,,  Maps  ",
  };
  const form = new URLSearchParams(original);
  const request = new Request("https://atmo.town/ideas/new", { method: "POST", body: form });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await action({ request } as Parameters<typeof action>[0])).toEqual({
      errors: { form: "Your PDS didn't accept the idea. Try again in a moment." },
      fields: original,
    });
    expect(mocks.createRecord).toHaveBeenCalledExactlyOnceWith({
      repo: did,
      collection: "town.atmo.idea",
      record: {
        $type: "town.atmo.idea",
        title: "A town idea",
        pitch: "Build together.",
        links: ["https://example.org/idea"],
        tags: ["Music", "Maps"],
        status: "open",
        createdAt: expect.any(String),
      },
    });
  } finally {
    log.mockRestore();
  }
});
