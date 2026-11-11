import { useEffect, useRef, useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/ideas.new";
import { ideaPath } from "~/lib/idea-path.server";
import { newIdeaSubmission, readIdeaSubmission, publishIdea } from "~/lib/idea-submission.server";
import { parseIdeaForm, type IdeaErrors, type IdeaFields } from "~/lib/idea";
import { lookupHandle, requireAgent } from "~/lib/session.server";

export function meta() {
  return [{ title: "Post an idea · atmo.town" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { agent, did } = await requireAgent(request);
  return { handle: (await lookupHandle(agent, did)) ?? did, submission: newIdeaSubmission(did) };
}

type ActionResult =
  | { posted: { uri: string; detailPath?: string; title: string; pitch: string } }
  | { errors: IdeaErrors; fields: IdeaFields; submission: string; existingPath?: string };

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const { agent, did } = await requireAgent(request);
  const form = await request.formData();
  const token = form.get("submission");
  const submission = readIdeaSubmission(token, did);
  const parsed = parseIdeaForm(form, submission ? new Date(submission.createdAt) : undefined);
  const fields = parsed.ok ? parsed.submittedFields : parsed.fields;
  if (!submission || typeof token !== "string") {
    return {
      errors: { form: "This draft needs a fresh publishing confirmation. Review it and submit again." },
      fields, submission: newIdeaSubmission(did),
    };
  }
  if (!parsed.ok) return { errors: parsed.errors, fields, submission: token };

  const result = await publishIdea(agent, submission, parsed.record);
  if (result.state === "posted") {
    return { posted: {
      uri: result.uri, detailPath: ideaPath(result.uri),
      title: parsed.record.title, pitch: parsed.record.pitch,
    } };
  }
  return {
    errors: { form: result.state === "conflict"
      ? "An earlier version of this draft is already published. View it or start a new idea to publish these changes."
      : "We couldn’t confirm whether your idea was published. Your draft is saved here. Submit again to check safely." },
    fields, submission: token,
    ...(result.state === "conflict" ? { existingPath: ideaPath(result.uri) } : {}),
  };
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export default function PostIdea({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const result = actionData as ActionResult | undefined;
  const fields = result && "fields" in result ? result.fields : undefined;
  const errors: IdeaErrors = result && "errors" in result ? result.errors : {};
  const fieldErrors = (["title", "pitch", "link", "tags"] as const)
    .flatMap((name) => errors[name] ? [{ name, message: errors[name] }] : []);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (actionData && "errors" in actionData) summary.current?.focus();
  }, [actionData]);
  const [title, setTitle] = useState(fields?.title ?? "");
  const [pitch, setPitch] = useState(fields?.pitch ?? "");

  if (result && "posted" in result) {
    const { detailPath } = result.posted;
    return (
      <main className="main">
        <div>
          <Link to="/" className="back"><BackIcon />Town square</Link>
          <h1 className="title">Your idea is up</h1>
        </div>
        <section role="status" className="posted">
          <div className="note">
            <span className="note-title">{result.posted.title}</span>
            <span className="note-meta">@{loaderData.handle} · just now</span>
          </div>
          <div className="posted-copy">
            <h2>Idea published</h2>
            <p>Your idea is saved in your AT Protocol repository.</p>
            <code className="uri">{result.posted.uri}</code>
            <div className="actions">
              <Link to="/" className="button">See your ideas</Link>
              {detailPath && <Link to={detailPath} className="pill">View public idea</Link>}
              <Link to="/ideas/new" reloadDocument className="pill">Post another</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <div>
        <Link to="/" className="back"><BackIcon />Town square</Link>
        <h1 className="title">Post an idea</h1>
      </div>
      <div className="layout">
        <Form method="post" className="card" noValidate>
          <input type="hidden" name="submission" value={result && "submission" in result ? result.submission : loaderData.submission} />
          <div className="posting-as">
            <span>Posting as <strong>@{loaderData.handle}</strong></span>
          </div>

          {Object.keys(errors).length > 0 && (
            <div ref={summary} className="form-error error-summary" tabIndex={-1} role="group" aria-labelledby="error-summary-title">
              <h2 id="error-summary-title">Your idea needs attention</h2>
              {errors.form && <p>{errors.form}</p>}
              {result && "existingPath" in result && result.existingPath && (
                <div className="actions">
                  <Link to={result.existingPath}>View published idea</Link>
                  <Link to="/ideas/new" reloadDocument>Start a new idea</Link>
                </div>
              )}
              {fieldErrors.length > 0 && <ul>
                {fieldErrors.map(({ name, message }) => (
                  <li key={name}>
                    <a href={`#${name}`} onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(name)?.focus();
                    }}>{message}</a>
                  </li>
                ))}
              </ul>}
            </div>
          )}

          <div className="field">
            <label htmlFor="title">Title (required)</label>
            <input
              id="title"
              name="title"
              className="input big"
              placeholder="A short name for the idea"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && <p id="title-error" className="field-error">{errors.title}</p>}
          </div>

          <div className="field">
            <label htmlFor="pitch">Pitch (required)</label>
            <p id="pitch-hint" className="hint">What it is, who it helps, and what kind of help you're looking for.</p>
            <textarea
              id="pitch"
              name="pitch"
              rows={6}
              className="textarea"
              placeholder="It would be great if…"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              required
              aria-invalid={errors.pitch ? true : undefined}
              aria-describedby={errors.pitch ? "pitch-hint pitch-error" : "pitch-hint"}
            />
            {errors.pitch && <p id="pitch-error" className="field-error">{errors.pitch}</p>}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="link">Link <span className="optional">(optional)</span></label>
              <input
                id="link"
                name="link"
                type="url"
                className="input"
                placeholder="https://"
                defaultValue={fields?.link}
                aria-invalid={errors.link ? true : undefined}
                aria-describedby={errors.link ? "link-error" : undefined}
              />
              {errors.link && <p id="link-error" className="field-error">{errors.link}</p>}
            </div>
            <div className="field">
              <label htmlFor="tags">Tags <span className="optional">(optional)</span></label>
              <input
                id="tags"
                name="tags"
                className="input"
                placeholder="music, recap"
                defaultValue={fields?.tags}
                aria-invalid={errors.tags ? true : undefined}
                aria-describedby={errors.tags ? "tags-error" : undefined}
              />
              {errors.tags && <p id="tags-error" className="field-error">{errors.tags}</p>}
            </div>
          </div>

          <p id="idea-visibility" className="hint">
            Anyone can read your idea once you publish it. It will be saved in your AT Protocol repository.
          </p>
          <button type="submit" className="button" disabled={busy} aria-describedby="idea-visibility">
            {busy ? "Publishing…" : "Publish idea"}
          </button>
        </Form>

        <aside aria-label="Preview" className="board">
          <span className="board-label">Preview</span>
          <div className="note">
            <span className="note-tag">New</span>
            <span className="note-title">{title || "Your title shows here"}</span>
            <span className="note-pitch">{pitch || "And the first lines of your pitch."}</span>
            <span className="note-meta">@{loaderData.handle}</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
