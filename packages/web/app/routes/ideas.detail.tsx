import { data, Link } from "react-router";
import type { Route } from "./+types/ideas.detail";
import { readPublicIdea } from "~/lib/public-idea.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  try {
    const idea = await readPublicIdea(params.did, params.key, request.signal);
    if (idea) return data({ idea, unavailable: false as const });
  } catch {
    return data({ idea: null, unavailable: true as const }, { status: 503 });
  }
  return data({ idea: null, unavailable: false as const }, { status: 404 });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const idea = loaderData?.idea;
  if (!idea) return [{ title: "Idea unavailable · atmo.town" }];
  return [
    { title: `${idea.title} · atmo.town` },
    { name: "description", content: idea.pitch },
    { property: "og:title", content: idea.title },
    { property: "og:description", content: idea.pitch },
  ];
}

export default function IdeaDetail({ loaderData }: Route.ComponentProps) {
  const { idea, unavailable } = loaderData;
  return (
    <main className="main">
      <Link to="/" className="back">Town square</Link>
      {idea ? (
        <article className="note idea-detail">
          <h1 className="note-title">{idea.title}</h1>
          <p className="note-meta">Posted by {idea.did}</p>
          <p className="note-pitch">{idea.pitch}</p>
          {idea.tags.length > 0 && (
            <ul aria-label="Tags">
              {idea.tags.map((tag, index) => <li key={index}>{tag}</li>)}
            </ul>
          )}
          {idea.links.length > 0 && (
            <ul aria-label="Links">
              {idea.links.map((link, index) => <li key={index}><a href={link}>{link}</a></li>)}
            </ul>
          )}
        </article>
      ) : (
        <>
          <h1 className="title">Idea unavailable</h1>
          {unavailable ? (
            <>
              <p>We couldn’t reach the idea’s repository. Try again in a moment.</p>
              <Link to="." reloadDocument className="button">Try again</Link>
            </>
          ) : <p>This idea may have been removed, or the link may be incorrect.</p>}
        </>
      )}
    </main>
  );
}
