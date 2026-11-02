import { Link, redirect } from "react-router";
import type { Route } from "./+types/oauth.callback";
import { getOAuthClient } from "~/lib/oauth.server";
import { commitSession, getSession, safeReturnTo } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  try {
    const { session: oauthSession, state } = await getOAuthClient().callback(params);
    const session = await getSession(request.headers.get("Cookie"));
    session.set("did", oauthSession.did);
    return redirect(safeReturnTo(state), {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (err) {
    console.error("OAuth callback failed", err);
    return { error: "Sign-in didn't finish. It may have been cancelled or timed out." };
  }
}

export default function OAuthCallback({ loaderData }: Route.ComponentProps) {
  return (
    <main className="main">
      <h1 className="title">Sign-in didn't work</h1>
      <p>{loaderData.error}</p>
      <div className="actions">
        <Link to="/login" className="button">Try again</Link>
      </div>
    </main>
  );
}
