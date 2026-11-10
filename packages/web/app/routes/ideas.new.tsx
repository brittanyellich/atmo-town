import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/ideas.new";
import { ideaPath } from "~/lib/idea-path.server";
import { IDEA_COLLECTION, parseIdeaForm, type IdeaErrors, type IdeaFields } from "~/lib/idea";
import { lookupHandle, requireAgent } from "~/lib/session.server";

export function meta() {
  return [{ title: "Post an idea · atmo.town" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { agent, did } = await requireAgent(request);
  return { handle: (await lookupHandle(agent, did)) ?? did };
}

type ActionResult =
  | { posted: { uri: string; detailPath?: string; title: string; pitch: string } }
  | { errors: IdeaErrors; fields: IdeaFields };

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const { agent, did } = await requireAgent(request);
  const parsed = parseIdeaForm(await request.formData());
  if (!parsed.ok) return { errors: parsed.errors, fields: parsed.fields };

  try {
    const res = await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: IDEA_COLLECTION,
      record: parsed.record,
    });
    return { posted: { uri: res.data.uri, detailPath: ideaPath(res.data.uri), title: parsed.record.title, pitch: parsed.record.pitch } };
  } catch (err) {
    console.error("createRecord failed", err);
    return {
      errors: { form: "Your PDS didn't accept the idea. Try again in a moment." },
      fields: {
        title: parsed.record.title,
        pitch: parsed.record.pitch,
        link: parsed.record.links?.[0] ?? "",
        tags: parsed.record.tags?.join(", ") ?? "",
      },
    };
  }
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
            <h2>Pinned to the Notice board</h2>
            <p>It's saved as a town.atmo.idea record in your own repo:</p>
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
          <div className="posting-as">
            <span>Posting as <strong>@{loaderData.handle}</strong></span>
          </div>

          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}

          <div className="field">
            <label htmlFor="title">Title</label>
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
            <label htmlFor="pitch">Pitch</label>
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

          <button type="submit" className="button" disabled={busy}>
            {busy ? "Pinning…" : "Pin it to the board"}
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
