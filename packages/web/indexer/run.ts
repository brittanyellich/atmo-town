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
const handler = new SimpleIndexer()
  .record(async (event) => index.apply(event))
  .identity(async (event) => index.apply(event))
  .error(() => console.error("Tap indexer encountered an error. Check the Tap connection and index database."));
const channel = tap.channel(handler);

const shutdown = () => {
  void channel.destroy().catch(() => {
    console.error("Could not close the Tap channel cleanly.");
    process.exitCode = 1;
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
try {
  await channel.start();
} finally {
  index.close();
}
