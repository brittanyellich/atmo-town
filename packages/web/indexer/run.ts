import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SimpleIndexer, Tap } from "@atproto/tap";
import { openIdeaIndex } from "./idea-index.ts";

const tapUrl = process.env.ATMO_TAP_URL;
if (!tapUrl) throw new Error("Set ATMO_TAP_URL to the Tap HTTP endpoint.");

const dbPath = process.env.ATMO_IDEA_INDEX_PATH ?? ".data/ideas.sqlite";
const tap = new Tap(tapUrl, { adminPassword: process.env.ATMO_TAP_PASSWORD });
mkdirSync(dirname(dbPath), { recursive: true });
const index = openIdeaIndex(dbPath);
function reportError(stage: string, error: unknown) {
  const chain = [];
  for (let cause = error; cause instanceof Error && chain.length < 4; cause = cause.cause) {
    const code = "code" in cause && typeof cause.code === "string" && /^[A-Z0-9_]+$/.test(cause.code)
      ? cause.code
      : undefined;
    chain.push({ name: cause.name, code });
  }
  console.error("Tap indexer failure", { stage, chain });
}

const handler = new SimpleIndexer()
  .record(async (event) => index.apply(event))
  .identity(async (event) => index.apply(event))
  .error((error) => reportError("event processing", error));
const channel = tap.channel(handler, {
  onReconnectError: (error, _attempt, firstAttempt) => {
    if (firstAttempt) reportError("reconnect", error);
  },
});

const shutdown = () => {
  void channel.destroy().catch((error) => {
    reportError("shutdown", error);
    process.exitCode = 1;
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
try {
  await channel.start();
} catch (error) {
  reportError("channel", error);
  process.exitCode = 1;
} finally {
  index.close();
}
