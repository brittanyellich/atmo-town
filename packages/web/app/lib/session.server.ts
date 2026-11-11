import { Agent } from "@atproto/api";
import { createCookieSessionStorage, redirect } from "react-router";
export { safeReturnTo } from "./return-to";
import { getOAuthClient } from "./oauth.server";

const secret = process.env.SESSION_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET must be set in production");
}

const storage = createCookieSessionStorage<{ did: string }>({
  cookie: {
    name: "atmo_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    secrets: [secret ?? "atmo-town-dev-only-secret"],
    maxAge: 60 * 60 * 24 * 30,
  },
});

export const { getSession, commitSession, destroySession } = storage;

export async function getSignedInDid(request: Request): Promise<string | undefined> {
  const session = await getSession(request.headers.get("Cookie"));
  return session.get("did");
}

/**
 * Restore the signed-in person's OAuth session and return an agent for their PDS.
 * Sends them to sign in again if there is no session or it can't be restored.
 */
export async function requireAgent(request: Request): Promise<{ agent: Agent; did: string }> {
  const url = new URL(request.url);
  const loginUrl = `/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`;
  const session = await getSession(request.headers.get("Cookie"));
  const did = session.get("did");
  if (!did) throw redirect(loginUrl);

  try {
    const oauthSession = await getOAuthClient().restore(did);
    return { agent: new Agent(oauthSession), did };
  } catch {
    throw redirect(loginUrl, { headers: { "Set-Cookie": await destroySession(session) } });
  }
}

export async function lookupHandle(agent: Agent, did: string): Promise<string | undefined> {
  try {
    const res = await agent.com.atproto.repo.describeRepo({ repo: did });
    return res.data.handle;
  } catch {
    return undefined;
  }
}
