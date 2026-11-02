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
