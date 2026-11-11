import { createHmac, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { TID } from "@atproto/common-web";
import type { Agent } from "@atproto/api";
import { IDEA_COLLECTION, isIdeaRecord, type IdeaRecord } from "./idea";
import { sessionSecret } from "./session-secret.server";

type Submission = { did: string; rkey: string };

function signature(body: string) {
  return createHmac("sha256", sessionSecret).update("idea-submission:" + body).digest();
}

export function newIdeaSubmission(did: string) {
  const submission: Submission = { did, rkey: TID.nextStr() };
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
    return { did, rkey: value.rkey };
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
      if (!isIdeaRecord(existing.data.value)) return { state: "conflict" as const, uri };
      const { createdAt: existingTime, ...existingContent } = existing.data.value;
      const { createdAt: attemptedTime, ...attemptedContent } = record;
      // Conditional creation preserves the first commit's timestamp. Retries
      // compare author content while leaving that timestamp unchanged.
      return isDeepStrictEqual(existingContent, attemptedContent)
        ? { state: "posted" as const, uri }
        : { state: "conflict" as const, uri };
    } catch (readError) {
      console.error("Idea publication could not be confirmed", {
        write: errorDetails(writeError),
        read: errorDetails(readError),
      });
      return { state: "unconfirmed" as const };
    }
  }
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { type: "Unknown" };
  return {
    type: error.name,
    status: "status" in error && typeof error.status === "number" ? error.status : undefined,
    code: "error" in error && typeof error.error === "string" && /^[A-Za-z0-9_]+$/.test(error.error)
      ? error.error : undefined,
    causeCode: "cause" in error && error.cause instanceof Error && "code" in error.cause
      && typeof error.cause.code === "string" && /^[A-Z0-9_]+$/.test(error.cause.code)
      ? error.cause.code : undefined,
  };
}
