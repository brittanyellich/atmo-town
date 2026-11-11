import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import Login, { action } from "./login";

const mocks = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("~/lib/oauth.server", () => ({
  OAUTH_SCOPE: "atproto repo:town.atmo.idea", getOAuthClient: () => mocks,
}));
vi.mock("react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router")>(),
  useNavigation: () => ({ state: "idle" }),
  Form: (props: Record<string, unknown>) => createElement("form", props),
}));

it("preserves a failed handle, associates its error, and normalizes only the OAuth request", async () => {
  mocks.authorize.mockRejectedValueOnce(new Error("Fixture authorization failure"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const handle = "  @alice.example  ";
    const request = new Request("https://atmo.town/login", {
      method: "POST", body: new URLSearchParams({ handle, returnTo: "/ideas/new" }),
    });
    const result = await action({ request } as Parameters<typeof action>[0]);
    if (result instanceof Response) throw new Error("Expected a recoverable sign-in failure");
    expect(result.handle).toBe(handle);
    expect(mocks.authorize).toHaveBeenCalledWith("alice.example", {
      scope: "atproto repo:town.atmo.idea", state: "/ideas/new",
    });
    const html = renderToStaticMarkup(createElement(MemoryRouter, {},
      createElement(Login, {
        loaderData: { returnTo: "/ideas/new" }, actionData: result,
      } as Parameters<typeof Login>[0]),
    ));
    expect(html).toContain('aria-describedby="handle-hint handle-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="handle-error"');
    expect(html).toContain(`value="${handle}"`);
    expect(html).toContain("Your Atmosphere handle (required)");
    expect(html).toContain('value="/ideas/new"');
  } finally {
    log.mockRestore();
  }
});
