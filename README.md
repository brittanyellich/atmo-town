# atmo.town

A cozy little town for people building on the Atmosphere (the AT Protocol ecosystem). Post an idea that would help the Atmosphere, and find people who want to build it with you.

## Packages

| Package | What it does |
| --- | --- |
| `packages/lexicons` | The `town.atmo.*` lexicon JSON. Everything else depends on these. |
| `packages/web` | The React Router app: sign-in and posting ideas. |

## Run it locally

Requires Node 22 or newer.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 (use `127.0.0.1`, not `localhost`: atproto's local OAuth mode needs it). Sign in with your Atmosphere handle and post an idea. It's written as a `town.atmo.idea` record to your own repo.

```sh
npm test        # unit tests
npm run typecheck
```

## License

MIT

### Local idea index

Run a Tap instance configured to discover and backfill `town.atmo.idea` records
and deliver them over WebSocket with acknowledgments enabled. See the
[Tap setup instructions](https://github.com/bluesky-social/indigo/tree/main/cmd/tap).
Start the worker from the repository root:

```sh
ATMO_TAP_URL=http://127.0.0.1:2480 npm run index:ideas
```

Set `ATMO_TAP_PASSWORD` in the worker environment if the Tap server requires
authentication. The worker writes a rebuildable SQLite index at
`packages/web/.data/ideas.sqlite` by default. The public notice board reads this
index. If you set `ATMO_IDEA_INDEX_PATH`, use the same absolute path for both
the worker and the web app. To reuse an index created by the earlier root-level
worker command, point both processes at its existing file. Run one writer per
index. To rebuild a lost index, replay or backfill from Tap again; reconnecting alone does not replay events already acknowledged.

The New board orders ideas by creation timestamp, then author DID and record
key, all descending. Ideas dated in the future become eligible once that time
arrives. The board cursor uses this order. Interest-based views will define
their own ordering and cursors once their ranking rules are agreed.
