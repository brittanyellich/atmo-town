import {
  Form,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import { getSignedInDid } from "./lib/session.server";
import { signInHref } from "./lib/return-to";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Pixelify+Sans:wght@400;600&display=swap",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  return { signedIn: Boolean(await getSignedInDid(request)) };
}

function TownLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="6" y="1" width="2" height="1" fill="var(--ember)" />
      <rect x="4" y="2" width="6" height="2" fill="var(--ember)" />
      <rect x="2" y="4" width="10" height="2" fill="var(--ember)" />
      <rect x="3" y="6" width="8" height="7" fill="var(--wall)" stroke="var(--ink)" strokeWidth=".5" />
      <rect x="6" y="9" width="2" height="4" fill="var(--ink)" />
      <rect x="4" y="7" width="2" height="2" fill="var(--win)" />
      <rect x="8" y="7" width="2" height="2" fill="var(--win)" />
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const location = useLocation();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="page">
          <a href="#main-content" className="skip-link">Skip to content</a>
          <header className="topbar">
            <Link to="/" className="brand">
              <TownLogo />
              atmo.town
            </Link>
            <div className="topbar-actions">
              {data?.signedIn ? (
                <Form method="post" action="/logout">
                  <button type="submit" className="pill">Sign out</button>
                </Form>
              ) : (
                <Link to={signInHref(location.pathname, location.search)} className="pill">Sign in</Link>
              )}
            </div>
          </header>
          <div id="main-content" className="route-content" tabIndex={-1}>
            {children}
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Nothing here" : "Error";
    details = error.status === 404 ? "That page isn't in town." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="main">
      <h1 className="title">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre style={{ overflowX: "auto" }}>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
