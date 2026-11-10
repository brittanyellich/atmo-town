import { DatabaseSync } from "node:sqlite";
import { isValidDid, isValidTid } from "@atproto/syntax";
import type { TapEvent } from "@atproto/tap";
import { IDEA_COLLECTION, assertIdeaRecord } from "../app/lib/idea.ts";

export function openIdeaIndex(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ideas (
      did TEXT NOT NULL,
      rkey TEXT NOT NULL,
      title TEXT NOT NULL,
      pitch TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (did, rkey)
    );
    CREATE INDEX IF NOT EXISTS ideas_chronological ON ideas (created_at DESC, did DESC, rkey DESC);
    CREATE TABLE IF NOT EXISTS unavailable_repos (did TEXT PRIMARY KEY);
  `);

  const upsert = db.prepare(`
    INSERT INTO ideas (did, rkey, title, pitch, created_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(did, rkey) DO UPDATE SET title = excluded.title, pitch = excluded.pitch
  `);
  const remove = db.prepare("DELETE FROM ideas WHERE did = ? AND rkey = ?");
  const removeRepo = db.prepare("DELETE FROM ideas WHERE did = ?");
  const markUnavailable = db.prepare("INSERT OR IGNORE INTO unavailable_repos (did) VALUES (?)");
  const markAvailable = db.prepare("DELETE FROM unavailable_repos WHERE did = ?");

  return {
    apply(event: TapEvent) {
      if (!isValidDid(event.did)) return;
      if (event.type === "identity") {
        if (event.status === "deleted") {
          db.exec("BEGIN");
          try {
            markUnavailable.run(event.did);
            removeRepo.run(event.did);
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
        } else if (event.isActive && event.status === "active") {
          markAvailable.run(event.did);
        } else {
          markUnavailable.run(event.did);
        }
        return;
      }

      if (event.collection !== IDEA_COLLECTION || !isValidTid(event.rkey)) return;
      const { did, rkey, record } = event;
      if (event.action === "delete") {
        remove.run(did, rkey);
        return;
      }

      try {
        assertIdeaRecord(record);
      } catch {
        // A malformed update replaces the earlier public record too.
        remove.run(did, rkey);
        return;
      }
      const createdAt = Date.parse(record.createdAt);
      if (!Number.isFinite(createdAt)) {
        remove.run(did, rkey);
        return;
      }
      upsert.run(did, rkey, record.title, record.pitch, createdAt);
    },
    close: () => db.close(),
  };
}
