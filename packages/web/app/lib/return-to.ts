/** Only allow same-site relative paths, so returnTo can't send people off-site. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  // Browsers remove tabs/newlines and interpret backslashes as URL separators.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return "/";

  const origin = "http://atmo.invalid";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/";
    // Normalizing dot segments can expose a leading // (e.g. /a/..//evil).
    // Returning that pathname would create a new protocol-relative redirect.
    if (url.pathname.startsWith("//")) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

export function signInHref(pathname: string, search: string, hash = ""): string {
  const destination = safeReturnTo(pathname === "/login"
    ? new URLSearchParams(search).get("returnTo")
    : pathname + search + hash);
  const destinationPath = new URL(destination, "http://atmo.invalid").pathname;
  const returnTo = ["/login", "/oauth/callback", "/logout"].includes(destinationPath) ? "/" : destination;
  return `/login?${new URLSearchParams({ returnTo })}`;
}
