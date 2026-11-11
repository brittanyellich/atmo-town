import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { newIdeaSubmission } from "~/lib/idea-submission.server";
import PostIdea, { action } from "./ideas.new";
vi.mock("react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router")>(),
  useNavigation: () => ({ state: "idle" }),
  Form: (props: Record<string, unknown>) => createElement("form", props),
}));

const mocks = vi.hoisted(() => ({ requireAgent: vi.fn(), putRecord: vi.fn() }));
vi.mock("~/lib/session.server", () => ({ requireAgent: mocks.requireAgent }));

it("returns the original draft after a failed PDS write while sending a normalized record", async () => {
  const did = "did:plc:abcdefghijklmnopqrstuvwx";
  mocks.requireAgent.mockResolvedValue({
    did, agent: { com: { atproto: { repo: { putRecord: mocks.putRecord } } } },
  });
  mocks.putRecord.mockRejectedValueOnce(new Error("Fixture PDS failure"));
  const original = {
    title: "  A town idea  ",
    pitch: "\n  Build together.\n ",
    link: " https://example.org/idea ",
    tags: "  Music , music,,  Maps  ",
  };
  const submission = newIdeaSubmission(did);
  const form = new URLSearchParams({ ...original, submission });
  const request = new Request("https://atmo.town/ideas/new", { method: "POST", body: form });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await action({ request } as Parameters<typeof action>[0])).toEqual({
      errors: { form: "We couldn’t confirm whether your idea was published. Your draft is saved here. Submit again to check safely." },
      submission,
      fields: original,
    });
    expect(mocks.putRecord).toHaveBeenCalledExactlyOnceWith({
      repo: did,
      collection: "town.atmo.idea",
      rkey: expect.any(String),
      swapRecord: null,
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

it("returns an invalid draft unchanged and renders linked field errors without an alert", async () => {
  mocks.putRecord.mockReset();
  mocks.requireAgent.mockResolvedValue({ did: "did:plc:abcdefghijklmnopqrstuvwx", agent: {} });
  const fields = { title: "  ", pitch: " Keep this pitch. ", link: "javascript:alert(1)", tags: " Music, music " };
  const request = new Request("https://atmo.town/ideas/new", {
    method: "POST", body: new URLSearchParams({ ...fields, submission: newIdeaSubmission("did:plc:abcdefghijklmnopqrstuvwx") }),
  });
  const result = await action({ request } as Parameters<typeof action>[0]);
  if (!("fields" in result)) throw new Error("Expected validation errors");
  expect(result.fields).toEqual(fields);
  expect(mocks.putRecord).not.toHaveBeenCalled();
  const html = renderToStaticMarkup(createElement(MemoryRouter, {},
    createElement(PostIdea, {
      loaderData: { handle: "alice.example" }, actionData: result,
    } as Parameters<typeof PostIdea>[0]),
  ));
  expect(html).toContain('aria-labelledby="error-summary-title"');
  expect(html).toContain('href="#title"');
  expect(html).toContain('href="#link"');
  expect(html).toContain('aria-describedby="title-error"');
  expect(html).toContain(" Keep this pitch. ");
  expect(html).not.toContain('role="alert"');
});
