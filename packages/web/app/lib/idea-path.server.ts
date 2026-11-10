import { isValidDid, isValidTid } from "@atproto/syntax";
import { IDEA_COLLECTION } from "./idea";

export function ideaPath(uri: string): string | undefined {
  const [did, collection, key, extra] = uri.startsWith("at://") ? uri.slice(5).split("/") : [];
  if (!isValidDid(did) || collection !== IDEA_COLLECTION || !isValidTid(key) || extra !== undefined) {
    return undefined;
  }
  return `/ideas/${encodeURIComponent(did)}/${key}`;
}
