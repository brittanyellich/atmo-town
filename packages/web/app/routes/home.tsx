import { Link } from "react-router";
import type { Route } from "./+types/home";
import { IDEA_COLLECTION } from "~/lib/idea";
import { getSignedInDid, lookupHandle, requireAgent } from "~/lib/session.server";

export function meta() {
  return [
    { title: "atmo.town" },
    { name: "description", content: "Post ideas for the Atmosphere and find people to build them with." },
  ];
}

type IdeaView = { uri: string; title: string; pitch: string; createdAt?: string };

export async function loader({ request }: Route.LoaderArgs) {
  if (!(await getSignedInDid(request))) return { signedIn: false as const };

  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const { agent, did } = await requireAgent(request);
  const handle = (await lookupHandle(agent, did)) ?? did;
  let ideas: IdeaView[] = [];
  let loadError: string | undefined;
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
        title: String(value.title ?? "Untitled"),
        pitch: String(value.pitch ?? ""),
        createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
      };
    });
    nextCursor = res.data.cursor || undefined;
  } catch (err) {
    console.error("listRecords failed", err);
    loadError = "Couldn't load your ideas from your PDS.";
  }
  const nextPage = nextCursor ? `/?${new URLSearchParams({ cursor: nextCursor })}` : undefined;
  return { signedIn: true as const, handle, ideas, loadError, nextPage, hasCursor: !!cursor };
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

  const { handle, ideas, loadError, nextPage, hasCursor } = loaderData;
  return (
    <main className="main">
      <h1 className="title">Town square</h1>
      <div className="actions">
        <Link to="/ideas/new" className="button">Post an idea</Link>
      </div>
      <section aria-labelledby="your-ideas" className="board">
        <h2 id="your-ideas" className="board-label" style={{ margin: 0 }}>Your ideas</h2>
        {loadError && <p className="form-error">{loadError}</p>}
        {!loadError && ideas.length === 0 && (
          <p style={{ color: "var(--paper)", margin: 0 }}>
            {hasCursor ? "No ideas on this page." : "Nothing pinned yet."}
          </p>
        )}
        {ideas.map((idea) => (
          <article key={idea.uri} className="note">
            <span className="note-title">{idea.title}</span>
            <span className="note-pitch">{idea.pitch}</span>
            <span className="note-meta">
              @{handle}
              {idea.createdAt && <> · <time dateTime={idea.createdAt}>{new Date(idea.createdAt).toLocaleDateString()}</time></>}
            </span>
          </article>
        ))}
      </section>
      {(hasCursor || nextPage) && (
        <nav aria-label="Idea pages" className="actions">
          {hasCursor && <Link to="/" className="pill">First page</Link>}
          {!loadError && nextPage && <Link to={nextPage} className="pill">Next page</Link>}
        </nav>
      )}
    </main>
  );
}
