# Tech stack

atmo.town is an open source TypeScript monorepo on Tangled: a server-rendered React app, a Tap-fed indexer, and a Jetstream mention bot, with lexicons as the source of truth. These are recommendations; the two open choices are at the bottom.

## Repo layout

| Package | What it does |
| --- | --- |
| `lexicons` | The `town.atmo.*` JSON schemas. Everything else depends on these. |
| `web` | The React app: town map, all screens, OAuth, live draw |
| `indexer` | Consumes Tap events and writes the atmo.town database |
| `mention-bot` | Watches Jetstream for @atmo.town forwards and writes suggestions |
| `shared` | Generated types, database access, ATStore and Open Social clients |

## Lexicons and types

- Write the schemas as JSON and generate TypeScript. `@atproto/lex-cli` is the official generator, and the Tangled CLI uses it, noting some issues under strict TypeScript configs ([tangled-cli](https://tangled.org/markbennett.ca/tangled-cli/blob/main/src/lexicon/README.md?code=true)). `@atcute/lex-cli` is a community alternative ([atcute lex-cli](https://git.gay/mary/atcute/src/branch/trunk/packages/lexicons/lex-cli)).
- Publish the schemas from atmo.town the way NeoDB does: a `com.atproto.lexicon.schema` record plus a `_lexicon` DNS TXT record ([NeoDB](https://neodb.net/internals/atproto/)).

## Web app

- React with a server-rendering framework, so OAuth and the database stay on the server and idea, event, and profile pages render their own link preview metadata when shared on Bluesky. React Router (framework mode) or TanStack Start both fit.
- OAuth with `@atproto/oauth-client-node`, which is meant for server-side deployments ([atproto OAuth guide](https://atproto.com/guides/oauth)).
- Live draw updates pushed from the server over WebSockets or SSE.

## Town map and sprites

- The scene is SVG built as React components, with colors from CSS variables. The Day/Dusk toggle swaps the variables and shows a night layer with the moon and stars.
- Place labels are real links positioned over the SVG, so the map works with a keyboard and screen reader. The place cards under the map double as a plain list.
- Residents are drawn from their `actor.rpg.sprite` sheets: a PNG with its pixel size and row count, usually 4 rows for walking down, left, right, and up ([actor.rpg.sprite bindings](https://docs.rs/crate/jacquard-api/latest/source/src/actor_rpg/sprite.rs)). Render with `image-rendering: pixelated`, which scales by nearest neighbor to keep the pixel look and has wide browser support ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)).
- The indexer follows `actor.rpg.sprite` for residents, and atmo.town caches the sheet images so page views don't hit people's PDSes.
- Walking stops when someone has reduced motion turned on.
- No game engine for now. Revisit PixiJS or Phaser only if people can steer their own character or hundreds of residents are on screen.

## Indexing

- Tap with a `town.atmo.*` filter does backfill, live updates, and verification ([The AT Stack](https://atproto.com/guides/the-at-stack)). There's a TypeScript client, `@atproto/tap`.
- Tap keeps its own state in SQLite by default ([backfilling guide](https://atproto.com/guides/backfilling)). Start the atmo.town database on SQLite too, since it's a rebuildable cache, and move to Postgres when more than one process needs to write.
- Sealed white elephant entries and draw state live in tables that are never rebuilt from records.
- The mention bot uses `@bsky/jetstream` for a live tail of `app.bsky.feed.post` ([Jetstream docs](https://bsky.network/docs/jetstream)).

## Integrations

| Service | Used for | How |
| --- | --- | --- |
| ATStore | Builds | XRPC `fyi.atstore.directory.getListing` and `searchListings` ([ATStore API](https://atstore.fyi/developers/atproto)) |
| Open Social | Communities and posting as a community | API with an app key ([Open Social](https://opensocial.community)) |
| rpg.actor | Resident sprites | `actor.rpg.sprite` records; check rpg.actor/licenses first |
| Streamplace | Live draw stream | v1 links out from the Live now banner. Before embedding later, test their React player in a plain React app: their own embed screen imports Tamagui ([Streamplace source](https://tangled.org/stream.place/streamplace/blob/eli%2Ffix-context-recursion/js/app/src/screens/embed.tsx)). An iframe of their embed page is the fallback. |

## CI and hosting

- CI on Tangled's spindle, which is built on Nix and atproto and has a free hosted instance for Tangled users ([Tangled blog](https://blog.tangled.org/ci/)).
- Tap, the indexer, the bot, and live draw push are long-running processes, so host on a small VPS or container host, not serverless only.

## Build order

Works back from submissions opening Nov 16:

1. Lexicons, codegen, and publishing
2. Sign in, profiles, and the Tap indexer
3. Town map with sprites
4. White elephant event page and sealed submissions (by Nov 16)
5. Live draw (by Dec 10)
6. Reveal wall with ATStore builds (by Dec 30)
7. Ideas app, mention bot, and community center (January)

## Your calls

- [ ] Open source license
- [ ] React Router or TanStack Start
