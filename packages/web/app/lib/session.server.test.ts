import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./session.server";

describe("safeReturnTo", () => {
  it.each(["/", "/ideas/new", "/ideas/new?tag=music#preview", "/?next=https://example.com"])(
    "preserves the local destination %s",
    (path) => expect(safeReturnTo(path)).toBe(path),
  );

  it.each([
    undefined, null, 42, {}, "", "ideas/new", "https://evil.example",
    "//evil.example", "/\\evil.example", "/path\\elsewhere",
    "/\t/evil.example", "/\n/evil.example", "/\r/evil.example",
    "/\u0000/evil.example", "/\u007f/evil.example",
    "/a/..//evil.example", "/a/%2e%2e//evil.example",
  ])("rejects unsafe or non-path input %j", (value) => {
    expect(safeReturnTo(value)).toBe("/");
  });

  it.each(["%2F%09%2Fevil.example", "%2F%0A%2Fevil.example", "%2F%0D%2Fevil.example", "%2F%5Cevil.example"])(
    "rejects decoded login returnTo input %s",
    (encoded) => {
      const requestUrl = new URL(`http://127.0.0.1:5173/login?returnTo=${encoded}`);
      const destination = safeReturnTo(requestUrl.searchParams.get("returnTo"));
      expect(destination).toBe("/");
      expect(new URL(destination, requestUrl).origin).toBe(requestUrl.origin);
    },
  );

  it("returns a normalized local path", () => {
    expect(safeReturnTo("/ideas/../ideas/new?tag=cozy town#preview")).toBe(
      "/ideas/new?tag=cozy%20town#preview",
    );
  });
});
