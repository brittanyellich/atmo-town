// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import PostIdea, { action } from "./ideas.new";

vi.mock("~/lib/session.server", () => ({
  requireAgent: async () => ({ did: "did:plc:abcdefghijklmnopqrstuvwx", agent: {} }),
}));
vi.mock("react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router")>(),
  useNavigation: () => ({ state: "idle" }),
  Form: (props: Record<string, unknown>) => createElement("form", props),
}));

it("focuses the invalid-post summary and moves focus to each linked field", async () => {
  const request = new Request("https://atmo.town/ideas/new", {
    method: "POST",
    body: new URLSearchParams({ title: " ", pitch: " Keep this pitch. ", link: "javascript:alert(1)" }),
  });
  const result = await action({ request } as Parameters<typeof action>[0]);
  if (!("fields" in result)) throw new Error("Expected invalid submission");

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previousEnvironment = environment.IS_REACT_ACT_ENVIRONMENT;
  environment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    await act(async () => root.render(createElement(MemoryRouter, {},
      createElement(PostIdea, {
        loaderData: { handle: "fixture.example" }, actionData: result,
      } as Parameters<typeof PostIdea>[0]),
    )));
    const summary = container.querySelector(".error-summary");
    expect(document.activeElement).toBe(summary);
    expect(container.querySelector<HTMLTextAreaElement>("#pitch")?.value).toBe(" Keep this pitch. ");
    for (const id of ["title", "link"]) {
      const link = container.querySelector<HTMLAnchorElement>(`.error-summary a[href="#${id}"]`);
      if (!link) throw new Error(`Missing summary link to ${id}`);
      await act(async () => link.click());
      const field = container.querySelector(`#${id}`);
      expect(field).not.toBeNull();
      expect(document.activeElement).toBe(field);
    }
  } finally {
    await act(async () => root.unmount());
    container.remove();
    environment.IS_REACT_ACT_ENVIRONMENT = previousEnvironment;
  }
});
