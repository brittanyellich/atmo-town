import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import PostIdea, { action } from "./ideas.new";
vi.mock("react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router")>(),
  useNavigation: () => ({ state: "idle" }),
  Form: (props: Record<string, unknown>) => createElement("form", props),
}));

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

it("returns an invalid draft unchanged and renders linked field errors without an alert", async () => {
  mocks.createRecord.mockReset();
  mocks.requireAgent.mockResolvedValue({ did: "did:plc:abcdefghijklmnopqrstuvwx", agent: {} });
  const fields = { title: "  ", pitch: " Keep this pitch. ", link: "javascript:alert(1)", tags: " Music, music " };
  const request = new Request("https://atmo.town/ideas/new", {
    method: "POST", body: new URLSearchParams(fields),
  });
  const result = await action({ request } as Parameters<typeof action>[0]);
  if (!("fields" in result)) throw new Error("Expected validation errors");
  expect(result.fields).toEqual(fields);
  expect(mocks.createRecord).not.toHaveBeenCalled();
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
