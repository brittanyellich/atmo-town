import { DatabaseSync } from "node:sqlite";

export type IdeaCursor = { createdAt: number; did: string; rkey: string };
type IndexedIdea = IdeaCursor & { title: string; pitch: string };

const PAGE_SIZE = 25;

export function readIdeasPage(path: string, after?: IdeaCursor) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 1000");
    const query = db.prepare(`
      SELECT created_at AS createdAt, did, rkey, title, pitch
      FROM ideas
      WHERE NOT EXISTS (SELECT 1 FROM unavailable_repos WHERE unavailable_repos.did = ideas.did)
      ${after ? "AND (created_at, did, rkey) < (?, ?, ?)" : ""}
      ORDER BY created_at DESC, did DESC, rkey DESC
      LIMIT ?
    `);
    const rows = (after
      ? query.all(after.createdAt, after.did, after.rkey, PAGE_SIZE + 1)
      : query.all(PAGE_SIZE + 1)) as IndexedIdea[];
    const ideas = rows.slice(0, PAGE_SIZE);
    const last = ideas.at(-1);
    const next = rows.length > PAGE_SIZE && last
      ? { createdAt: last.createdAt, did: last.did, rkey: last.rkey }
      : undefined;
    return { ideas, next };
  } finally {
    db.close();
  }
}
