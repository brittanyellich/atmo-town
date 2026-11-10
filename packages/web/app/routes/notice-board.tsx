import { data, Link } from "react-router";
import type { Route } from "./+types/notice-board";
import { loadNoticeBoard } from "~/lib/notice-board.server";

export function meta() {
  return [{ title: "Notice board · atmo.town" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const result = loadNoticeBoard(request);
  return data(result, { status: result.state === "invalid" ? 400 : result.state === "unavailable" ? 503 : 200 });
}

export default function NoticeBoard({ loaderData }: Route.ComponentProps) {
  return (
    <main className="main">
      <Link to="/" className="back">Town square</Link>
      <h1 className="title">Notice board</h1>
      {loaderData.state === "invalid" ? (
        <>
          <p>This page link is invalid.</p>
          <Link to="/notice-board" className="pill">First page</Link>
        </>
      ) : loaderData.state === "unavailable" ? (
        <>
          <p>Ideas are temporarily unavailable.</p>
          <Link to={loaderData.retry} reloadDocument className="pill">Try again</Link>
        </>
      ) : (
        <>
          <section aria-labelledby="new-ideas" className="board">
            <h2 id="new-ideas" className="board-label notice-heading">New ideas</h2>
            {loaderData.ideas.length === 0 && (
              <p className="notice-empty">
                {loaderData.hasCursor ? "There are no ideas on this page." : "No ideas have been indexed yet."}
              </p>
            )}
            {loaderData.ideas.map((idea) => (
              <article key={idea.detailPath} className="note notice-idea">
                <h3 className="note-title"><Link to={idea.detailPath}>{idea.title}</Link></h3>
                <span className="note-pitch">{idea.pitch}</span>
                <span className="note-meta">Posted by {idea.did}</span>
              </article>
            ))}
          </section>
          {(loaderData.hasCursor || loaderData.next) && (
            <nav aria-label="Idea pages" className="actions">
              {loaderData.hasCursor && <Link to="/notice-board" className="pill">First page</Link>}
              {loaderData.next && <Link to={loaderData.next} className="pill">Next page</Link>}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
