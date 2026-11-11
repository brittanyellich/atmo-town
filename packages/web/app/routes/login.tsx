import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { OAUTH_SCOPE, getOAuthClient } from "~/lib/oauth.server";
import { getSignedInDid, safeReturnTo } from "~/lib/session.server";

export function meta() {
  return [{ title: "Sign in · atmo.town" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
  if (await getSignedInDid(request)) throw redirect(returnTo);
  return { returnTo };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const value = form.get("handle");
  const submittedHandle = typeof value === "string" ? value : "";
  const handle = submittedHandle.trim().replace(/^@/, "");
  const returnTo = safeReturnTo(form.get("returnTo"));
  if (!handle) return { error: "Enter your handle, like alice.bsky.social.", handle: submittedHandle };

  try {
    const url = await getOAuthClient().authorize(handle, {
      scope: OAUTH_SCOPE,
      // Carried through the OAuth round trip so we land back where we started.
      state: returnTo,
    });
    return redirect(url.toString());
  } catch (err) {
    console.error("OAuth authorize failed", err);
    return { error: `Couldn't start sign-in for @${handle}. Check the handle and try again.`, handle: submittedHandle };
  }
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <main className="main">
      <h1 className="title">Sign in</h1>
      <Form method="post" className="card" style={{ maxWidth: 560 }}>
        <input type="hidden" name="returnTo" value={loaderData.returnTo} />
        <div className="field">
          <label htmlFor="handle">Your Atmosphere handle (required)</label>
          <p id="handle-hint" className="hint">
            atmo.town only asks to write town.atmo.idea records to your repo.
          </p>
          <input
            id="handle"
            name="handle"
            className="input big"
            placeholder="alice.bsky.social"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={actionData?.handle}
            aria-describedby={actionData?.error ? "handle-hint handle-error" : "handle-hint"}
            aria-invalid={actionData?.error ? true : undefined}
          />
        </div>
        {actionData?.error && <p id="handle-error" className="form-error" role="alert">{actionData.error}</p>}
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Heading over…" : "Continue"}
        </button>
      </Form>
    </main>
  );
}
