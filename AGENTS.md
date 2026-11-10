# Working on atmo.town

atmo.town is a cozy gathering place for people building on the Atmosphere
(AT Protocol): share ideas, find collaborators, and run community events.
Read the relevant files in `specs/` before changing a feature. `designs/` holds
reference mockups, not the production app. Specs include proposed work; check
the code before treating a proposed package or integration as implemented.

## Setup and verification

Use Node 22 or newer and run from the repository root:

```sh
npm ci
npm run dev
# Visit http://127.0.0.1:5173 (not localhost, for local AT Protocol OAuth).
```

Before delivering an application change, run:

```sh
npm test
npm run typecheck
npm run build
git diff --check
```

There are currently no lint or formatting scripts in the app. Follow
surrounding formatting and report unavailable checks explicitly. For specs or
instructions alone, check referenced paths and commands and run
`git diff --check`; do not claim runtime validation. For behavior changes,
verify the ticket's acceptance criteria, including a relevant edge or failure
case. A clean AI review alone does not establish that the behavior works.

## Project rules

1. **The person's repo owns their idea.** Applies to idea creation and other
   person-authored public AT Protocol records. Write through the authenticated
   person's OAuth session to their PDS; a local index is a rebuildable view,
   not a replacement for that record. Forwarded Bluesky ideas are a separate
   suggestion owned by the town account until claimed, as described in
   `specs/Ideas app.md`. This keeps authorship and portability intact without
   pretending the town can write to someone else's repo.

2. **Sealed means sealed.** Applies to white elephant submissions and draw
   state. Keep sealed entry contents in private server-side storage; never
   publish them as public AT Protocol records or expose them in public
   responses, logs, or client bundles before the authorized reveal. Do not
   treat submissions or draw state as disposable index data. The event needs
   both secrecy before the draw and durable state that cannot be rebuilt from
   public records (`specs/Tech stack.md`, `specs/Domain White Elephant.md`).

3. **The lexicon gets the last word.** Applies to `town.atmo.*` record writes.
   Keep schemas in `packages/lexicons` as the source of truth and validate
   records on the server before writing to a PDS. Client form validation helps
   people correct input but cannot replace record validation. When a schema
   changes, update affected types, parsers, and checks together so the UI
   cannot silently emit a different protocol.

   For idea title, pitch, and individual tag validation in
   `packages/web/app/lib/idea.ts`, enforce both the lexicon's grapheme and
   UTF-8 byte limits. Changes to these checks must retain tests for exact
   limits and over-limit input, including complex multi-code-point graphemes.
   Return field-specific errors and preserve submitted input for correction;
   keep final server-side lexicon validation. A family emoji can fit the
   character limit yet exceed the byte limit, so counting characters alone
   gives misleading form guidance.

4. **Credentials stay on the server.** Applies to OAuth, sessions, and service
   integrations. Keep token and key handling in server-only modules; never
   return or log credentials or commit local session data. The JSON
   session store and loopback OAuth setup are development-only; replace them
   with appropriate durable storage and hosted OAuth configuration before
   deployment. Otherwise a working local demo can become an unsafe deployment.

5. **The town must work without the scenery.** Applies to production UI,
   especially the map, forms, and animation. Use semantic links and controls
   with labels, keyboard access, and visible focus. Provide a plain list of
   destinations alongside the map and honor reduced motion for walking or
   other animated scenery. Reuse the app's CSS color variables instead of
   copying mockup colors into components. The cozy visual style should remain
   usable with assistive technology and consistent across Day/Dusk themes.

## Delivery

Use an isolated worktree and a `codex/<short-task-name>` branch based on the
current remote default branch; preserve existing edits. Take backlog tickets
one at a time, with a separate branch and PR for each. Include the ticket link,
acceptance criteria, validation results, and known limitations in the PR.
This is a personal project: do not run Roast unless explicitly requested.
This project-specific exception overrides any default instruction to run it.
Use Qodo for PR review, investigate its findings against the code, and repeat
affected checks after fixes. Before handing a PR over for a merge decision,
record the Qodo review link, reviewed commit, and assessment of findings in
the PR. If the review is absent or covers an older commit, report that gap
explicitly rather than claiming review is complete. Stop and explain blockers
rather than claiming a review or check ran when it did not. Leave merging to
the human.
