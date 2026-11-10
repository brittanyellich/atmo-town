import { Link } from "react-router";
import type { Route } from "./+types/home";
import { ideaPath } from "~/lib/idea-path.server";
import { IDEA_COLLECTION } from "~/lib/idea";
import { getSignedInDid, lookupHandle, requireAgent } from "~/lib/session.server";

export function meta() {
  return [
    { title: "atmo.town" },
    { name: "description", content: "Post ideas for the Atmosphere and find people to build them with." },
  ];
}

type IdeaView = { uri: string; path?: string; title: string; pitch: string; createdAt?: string };

export async function loader({ request }: Route.LoaderArgs) {
  if (!(await getSignedInDid(request))) return { signedIn: false as const };

  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const { agent, did } = await requireAgent(request);
  const handle = (await lookupHandle(agent, did)) ?? did;
  let ideas: IdeaView[] = [];
  let loadError: string | undefined;
  let paginationError: string | undefined;
  let nextCursor: string | undefined;
  try {
    // Until the indexer exists, read ideas straight from the signed-in person's repo.
    const res = await agent.com.atproto.repo.listRecords({
      repo: did, collection: IDEA_COLLECTION, limit: 50, ...(cursor ? { cursor } : {}),
    });
    ideas = res.data.records.map((r) => {
      const value = r.value as Partial<IdeaView>;
      return {
        uri: r.uri,
        path: ideaPath(r.uri),
        title: String(value.title ?? "Untitled"),
        pitch: String(value.pitch ?? ""),
        createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
      };
    });
    // A cursor can describe the last record even on a final page. Probe once,
    // without consuming that record from the next displayed page.
    if (res.data.cursor) {
      try {
        const probe = await agent.com.atproto.repo.listRecords({
          repo: did, collection: IDEA_COLLECTION, limit: 1, cursor: res.data.cursor,
        });
        if (probe.data.records.length > 0) nextCursor = res.data.cursor;
      } catch (err) {
        console.error("Pagination check failed", err);
        paginationError = "Couldn't check for another page. Your ideas on this page are still available.";
      }
    }
  } catch (err) {
    console.error("listRecords failed", err);
    loadError = "Couldn't load your ideas from your PDS.";
  }
  const nextPage = nextCursor ? `/?${new URLSearchParams({ cursor: nextCursor })}` : undefined;
  const currentPage = cursor ? `/?${new URLSearchParams({ cursor })}` : "/";
  return { signedIn: true as const, handle, ideas, loadError, paginationError, nextPage, currentPage, hasCursor: !!cursor };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  if (!loaderData.signedIn) {
    return (
      <main className="main">
        <h1 className="title">Welcome to town</h1>
        <p style={{ fontSize: 18, maxWidth: 620, lineHeight: 1.5 }}>
          Post an idea that would help the Atmosphere, and find people who want to build it with you.
        </p>
        <div className="actions">
          <Link to="/login?returnTo=%2Fideas%2Fnew" className="button">Sign in to post an idea</Link>
        </div>
      </main>
    );
  }

  const { handle, ideas, loadError, paginationError, nextPage, currentPage, hasCursor } = loaderData;
  return (
    <main className="main">
      <h1 className="title">Town square</h1>
      <div className="actions">
        <Link to="/ideas/new" className="button">Post an idea</Link>
      </div>
      <section aria-labelledby="your-ideas" className="board">
        <h2 id="your-ideas" className="board-label" style={{ margin: 0 }}>Your ideas</h2>
        {loadError && <p className="form-error">{loadError}</p>}
        {paginationError && <p className="form-error" role="alert">{paginationError}</p>}
        {!loadError && ideas.length === 0 && (
          <p style={{ color: "var(--paper)", margin: 0 }}>
            {hasCursor ? "No ideas on this page." : "Nothing pinned yet."}
          </p>
        )}
        {ideas.map((idea) => (
          <article key={idea.uri} className="note">
            <h3 className="note-title">{idea.path ? <Link to={idea.path}>{idea.title}</Link> : idea.title}</h3>
            <span className="note-pitch">{idea.pitch}</span>
            <span className="note-meta">
              @{handle}
              {idea.createdAt && <> · <time dateTime={idea.createdAt}>{new Date(idea.createdAt).toLocaleDateString()}</time></>}
            </span>
          </article>
        ))}
      </section>
      {(hasCursor || nextPage || paginationError) && (
        <nav aria-label="Idea pages" className="actions">
          {hasCursor && <Link to="/" className="pill">First page</Link>}
          {!loadError && nextPage && <Link to={nextPage} className="pill">Next page</Link>}
          {paginationError && <Link to={currentPage} reloadDocument className="pill">Check next page again</Link>}
        </nav>
      )}
    </main>
  );
}
