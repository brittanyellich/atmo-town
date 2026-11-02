import { join } from "node:path";
import {
  NodeOAuthClient,
  buildAtprotoLoopbackClientMetadata,
  requestLocalLock,
  type NodeSavedSession,
  type NodeSavedState,
} from "@atproto/oauth-client-node";
import { jsonFileStore, memoryStore } from "./store.server";

// Only ask for what today's feature needs: creating town.atmo.idea records.
export const OAUTH_SCOPE = "atproto repo:town.atmo.idea";

// Loopback OAuth (no hosted client metadata) for local development.
// The redirect must use 127.0.0.1; set PUBLIC_URL when serving on another port.
export const PUBLIC_URL = (process.env.PUBLIC_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");

function createOAuthClient() {
  return new NodeOAuthClient({
    clientMetadata: buildAtprotoLoopbackClientMetadata({
      scope: OAUTH_SCOPE,
      redirect_uris: [`${PUBLIC_URL}/oauth/callback`],
    }),
    stateStore: memoryStore<NodeSavedState>(),
    sessionStore: jsonFileStore<NodeSavedSession>(join(process.cwd(), ".data", "oauth-sessions.json")),
    requestLock: requestLocalLock,
  });
}

// Keep one client across dev-server module reloads.
const globalForOAuth = globalThis as typeof globalThis & { __atmoOAuthClient?: NodeOAuthClient };

export function getOAuthClient(): NodeOAuthClient {
  globalForOAuth.__atmoOAuthClient ??= createOAuthClient();
  return globalForOAuth.__atmoOAuthClient;
}
