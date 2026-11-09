import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { getOAuthClient } from "~/lib/oauth.server";
import { destroySession, getSession } from "~/lib/session.server";

export async function loader() {
  return redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const did = session.get("did");
  if (did) {
    try {
      await getOAuthClient().revoke(did);
    } catch (err) {
      // Still sign out locally if the PDS can't be reached.
      console.error("OAuth revoke failed", err);
    }
  }
  return redirect("/", { headers: { "Set-Cookie": await destroySession(session) } });
}
