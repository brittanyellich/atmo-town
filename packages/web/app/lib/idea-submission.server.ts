import { createHmac, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { TID } from "@atproto/common-web";
import type { Agent } from "@atproto/api";
import { IDEA_COLLECTION, type IdeaRecord } from "./idea";
import { sessionSecret } from "./session-secret.server";

type Submission = { did: string; rkey: string; createdAt: string };

function signature(body: string) {
  return createHmac("sha256", sessionSecret).update("idea-submission:" + body).digest();
}

export function newIdeaSubmission(did: string) {
  const submission: Submission = { did, rkey: TID.nextStr(), createdAt: new Date().toISOString() };
  const body = Buffer.from(JSON.stringify(submission)).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

export function readIdeaSubmission(token: unknown, did: string): Submission | undefined {
  if (typeof token !== "string" || token.length > 4096) return;
  const [body, encodedSignature, extra] = token.split(".");
  if (!body || !encodedSignature || extra !== undefined) return;
  const supplied = Buffer.from(encodedSignature, "base64url");
  const expected = signature(body);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (value.did !== did || typeof value.rkey !== "string" || !TID.is(value.rkey)) return;
    if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return;
    return { did, rkey: value.rkey, createdAt: value.createdAt };
  } catch {
    return;
  }
}

export async function publishIdea(agent: Agent, submission: Submission, record: IdeaRecord) {
  const { did, rkey } = submission;
  const uri = `at://${did}/${IDEA_COLLECTION}/${rkey}`;
  try {
    await agent.com.atproto.repo.putRecord({
      repo: did, collection: IDEA_COLLECTION, rkey, record, swapRecord: null,
    });
    return { state: "posted" as const, uri };
  } catch (writeError) {
    // A timeout can follow a committed write. Read the exact key before
    // asking for another explicit submit; never overwrite a record on retry.
    try {
      const existing = await agent.com.atproto.repo.getRecord({
        repo: did, collection: IDEA_COLLECTION, rkey,
      });
      if (existing.data.uri !== uri) return { state: "unconfirmed" as const };
      return isDeepStrictEqual(existing.data.value, record)
        ? { state: "posted" as const, uri }
        : { state: "conflict" as const, uri };
    } catch (readError) {
      console.error("Idea publication could not be confirmed", {
        writeErrorType: writeError instanceof Error ? writeError.name : "Unknown",
        readErrorType: readError instanceof Error ? readError.name : "Unknown",
      });
      return { state: "unconfirmed" as const };
    }
  }
}
