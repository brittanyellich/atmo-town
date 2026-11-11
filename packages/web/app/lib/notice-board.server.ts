import { isAtprotoDid } from "@atproto-labs/did-resolver";
import { isValidTid } from "@atproto/syntax";
import { readIdeasPage, type IdeaCursor } from "../../indexer/read-ideas";
import { IDEA_COLLECTION } from "./idea";
import { ideaPath } from "./idea-path.server";

const BOARD_PATH = "/notice-board";

function decodeCursor(token: string): IdeaCursor | undefined {
  if (!/^[A-Za-z0-9_-]{1,4096}$/.test(token)) return;
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.toString("base64url") !== token) return;
    const value: unknown = JSON.parse(bytes.toString("utf8"));
    if (!Array.isArray(value) || value.length !== 3) return;
    const [createdAt, did, rkey] = value;
    if (!Number.isSafeInteger(createdAt) || !isAtprotoDid(did) || !isValidTid(rkey)) return;
    return { createdAt, did, rkey };
  } catch {
    return;
  }
}

function pagePath({ createdAt, did, rkey }: IdeaCursor) {
  const cursor = Buffer.from(JSON.stringify([createdAt, did, rkey])).toString("base64url");
  return `${BOARD_PATH}?cursor=${cursor}`;
}

export function loadNoticeBoard(request: Request) {
  const tokens = new URL(request.url).searchParams.getAll("cursor");
  const cursor = tokens.length === 1 ? decodeCursor(tokens[0]) : undefined;
  if (tokens.length > 0 && !cursor) return { state: "invalid" as const };

  try {
    const path = process.env.ATMO_IDEA_INDEX_PATH ?? ".data/ideas.sqlite";
    const page = readIdeasPage(path, cursor);
    const ideas = page.ideas.flatMap(({ did, rkey, title, pitch }) => {
      const detailPath = ideaPath(`at://${did}/${IDEA_COLLECTION}/${rkey}`);
      return detailPath ? [{ did, title, pitch, detailPath }] : [];
    });
    return {
      state: "available" as const,
      ideas,
      hasCursor: !!cursor,
      next: page.next ? pagePath(page.next) : undefined,
    };
  } catch (error) {
    const sqliteCode = error instanceof Error && "errcode" in error && typeof error.errcode === "number"
      ? error.errcode
      : undefined;
    // SQLite result codes distinguish missing files, invalid schemas and locks
    // without printing database paths or raw exception content.
    console.error("Notice board index read failed", {
      errorType: error instanceof Error ? error.name : "Unknown",
      sqliteCode,
    });
    return { state: "unavailable" as const, retry: cursor ? pagePath(cursor) : BOARD_PATH };
  }
}
