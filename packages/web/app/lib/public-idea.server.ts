import { DidResolverCommon, extractPdsUrl, isAtprotoDid } from "@atproto-labs/did-resolver";
import { FetchError, safeFetchWrap } from "@atproto-labs/fetch-node";
import { isValidTid } from "@atproto/syntax";
import { IDEA_COLLECTION, isHttpUrl, isIdeaRecord } from "./idea";

const publicFetch = safeFetchWrap({
  allowIpHost: false,
  ssrfProtection: true,
  responseMaxSize: 128 * 1024,
});
const resolver = new DidResolverCommon({ fetch: publicFetch });

export async function readPublicIdea(did: string, key: string, signal: AbortSignal) {
  if (!isAtprotoDid(did) || !isValidTid(key)) return null;

  let stage = "resolve DID";
  try {
    return await fetchIdea(did, key);
  } catch (error) {
    if (!signal.aborted) {
      console.error("Public idea read failed", { stage, errorType: error instanceof Error ? error.name : "Unknown" });
    }
    throw error;
  }

  async function fetchIdea(did: Parameters<typeof resolver.resolve>[0], key: string) {
    let document;
    try {
      document = await resolver.resolve(did, { signal });
    } catch (error) {
      if (error instanceof FetchError && (error.statusCode === 404 || error.statusCode === 410)) {
        return null;
      }
      throw error;
    }
    if (document.id !== did) throw new Error("DID document did not match the requested author");

    stage = "resolve PDS endpoint";
    const url = new URL("/xrpc/com.atproto.repo.getRecord", extractPdsUrl(document));
    url.search = new URLSearchParams({ repo: did, collection: IDEA_COLLECTION, rkey: key }).toString();
    stage = "fetch PDS record";
    const response = await publicFetch(url, { redirect: "error", signal });
    if (response.status === 404 || response.status === 410) {
      await response.body?.cancel();
      return null;
    }
    if (response.status === 400) {
      stage = "decode PDS error response";
      const body = await response.json();
      if (body?.error === "RecordNotFound" || body?.error === "RepoNotFound") return null;
    }
    if (!response.ok) {
      if (!response.bodyUsed) await response.body?.cancel();
      console.error("Public idea PDS HTTP failure", { status: response.status });
      throw new Error("Idea repository request failed");
    }

    stage = "decode PDS record";
    const body = await response.json();
    const value: unknown = body?.value;
    if (body?.uri !== `at://${did}/${IDEA_COLLECTION}/${key}` || !isIdeaRecord(value)) {
      return null;
    }
    const { title, pitch, tags, links } = value;
    return { did, title, pitch, tags: tags ?? [], links: (links ?? []).filter(isHttpUrl) };
  }
}
