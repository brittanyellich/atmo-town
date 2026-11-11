import { expect, it } from "vitest";
import { signInHref } from "./lib/return-to";

it.each([
  "/ideas/did%3Aplc%3Aabcdefghijklmnopqrstuvwx/3lxyzabcdefg2",
  "/notice-board?cursor=abc%2B%2F%3D",
  "/notice-board?cursor=abc#new-ideas",
])("preserves the public destination %s in the header sign-in link", (path) => {
  const current = new URL(`https://atmo.town${path}`);
  const url = new URL(signInHref(current.pathname, current.search, current.hash), current.origin);
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("returnTo")).toBe(path);
});

it.each([
  ["/login", "/"],
  ["/oauth/callback?code=stale&state=one-time", "/"],
  ["/login?returnTo=%2Foauth%2Fcallback%3Fcode%3Dstale", "/"],
  ["/logout", "/"],
  ["/login?returnTo=%2Flogin", "/"],
  ["/login?returnTo=%2Fideas%2Fnew", "/ideas/new"],
  ["/login?returnTo=https%3A%2F%2Fevil.example", "/"],
  ["//evil.example", "/"],
])("validates return paths and avoids returning to login from %s", (path, expected) => {
  const current = new URL(`https://atmo.town${path}`);
  expect(new URL(signInHref(current.pathname, current.search, current.hash), current.origin).searchParams.get("returnTo")).toBe(expected);
});
