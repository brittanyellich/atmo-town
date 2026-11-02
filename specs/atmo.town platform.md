# atmo.town spec

Oct 14, 2026 · @Brittany Ellich

## What atmo.town is

atmo.town is a place to grow the Atmosphere: people post ideas for it, find others who want to build them, run community events, and show off what got made. It is closer to Discourse in purpose, but tuned for getting people involved rather than for long threads, and with a friendlier UI.

It is for atproto developers who want a project, community members with ideas but no time to build them, and Bluesky team members who want to back community work. Two apps live there at launch: the Ideas app (see the Ideas app tab) and the first community event, Domain White Elephant (see its tab).

Out of scope for v1: replacing Bluesky as the place for discussion, hosting code, or running a general forum.

## Core concepts

Five objects cover both launch apps. Every one except the event secrets is a record in the author's own repo, so other Atmosphere apps can read and reuse them.

| Concept | What it is | Created by | Example |
| --- | --- | --- | --- |
| Idea | A short pitch for something that would help the Atmosphere | Anyone | A Teal collab for an Atmosphere Wrapped |
| Interest | A signal on an idea: I'd use this, I'd build this, or I'd help | Anyone | "I'd build this, I know the Teal lexicons" |
| Build | A shipped thing, listed on ATStore and linked to the idea or event it came from | The builders | A launch post with a link and screenshots |
| Event | A time-boxed community activity with phases and rules | Event hosts | Domain White Elephant, December 2026 |
| Entry | A person's participation in an event | Participants | A domain submitted to the white elephant |

A person's atmo.town profile is their atproto identity plus a small profile record for skills and what they're looking for. No separate accounts.

## How it sits on atproto

atmo.town writes to people's own repos and reads from its own index. It never holds the canonical copy of an idea or a build.

&#91;embedded content: atmo.town on atproto · write path and read path\]

- Records: each concept is a Lexicon-typed record in the author's repo. Repos group records into collections named by NSID, and records are addressed by a record key ([atproto data repos](https://atproto.com/guides/data-repos)). The records are the source of truth.
- Index with Tap: Tap syncs existing records and then keeps receiving new ones, and it handles the firehose connection, verification, backfill, and filtering ([The AT Stack](https://atproto.com/guides/the-at-stack)). Run with a signal collection and a `town.atmo.*` filter, it finds repos through `com.atproto.sync.listReposByCollection`, backfills them, and streams new records, as [plyr.fm does for `fm.plyr.*`](https://tangled.org/zzstoatzz.io/plyr.fm/blob/main/docs/tools/tap.md). It filters by collection, so records written by any app or script are indexed the same way.
- The atmo.town database is a cache of those records that can be dropped and rebuilt from a Tap backfill. The one exception is the white elephant's sealed entries, which live in a small private store.
- Mentions with Jetstream: the forward-an-idea listener reads `app.bsky.feed.post` live from Jetstream and keeps posts that mention the atmo.town account. Jetstream filters by collection and replays from a cursor only within a bounded lookback window ([Jetstream docs](https://bsky.network/docs/jetstream)), which is fine for a live-only job.
- Writes: the web app writes records through atproto OAuth on the person's behalf ([atproto OAuth guide](https://atproto.com/guides/oauth)). The mention listener writes suggestions as the atmo.town account.
- Privacy: repo records are public content ([Skyware glossary](https://skyware.js.org/guides/bot/glossary)), which is why sealed entries stay out of repos until revealed.

To check: anyone can write a `town.atmo.suggestion`, so the indexer should decide whether to accept suggestions only from the atmo.town account. Also confirm in the [Tap README](https://github.com/bluesky-social/indigo/blob/main/cmd/tap/README.md) whether repos that never wrote the signal collection (someone who only left an interest) get tracked.

## Shared platform features

Every app on atmo.town gets these, so a new event type only has to define its own rules and records.

- Sign in with atproto OAuth, asking only for write access to atmo.town's own collections. atproto OAuth supports granular permission scopes alongside the coarse transition scopes ([atproto scopes guide](https://atproto.com/guides/scopes)), and a `repo:` scope can be limited to a collection and action ([atproto-oauth crate docs](https://docs.rs/atproto-oauth/latest/atproto_oauth/scopes/index.html)).
- A profile page per person: their ideas, interests, entries, and builds.
- A home feed with new ideas, ideas that just picked up builders, live events, and recent builds.
- Share to Bluesky: one-tap post for a new idea, a join, or a launch, with a link back.
- Notifications for interest on your ideas, event phase changes, and your turn in a live draw. atmo.pub is one option to evaluate here, since you're already looking at it for Taste Test.
- Moderation: hosts can hide entries in their event, and atmo.town can subscribe to labelers. You moderate the Ideas feed and can take down anything that breaks the atmo.town terms, so the site needs a terms page and a report button on every idea.

## Community events

An event is a record that names its type, its hosts, and the dates of each phase. atmo.town supplies the shell: an event page, a join button, phase-change notifications, an entries list, and a builds wall at the end. Each event type adds its own entry fields and any live mechanics.

Standard phases, which a type can skip or rename:

1. Announced: page is up, people can follow it.
2. Open: people join and submit entries.
3. Live: the main activity, such as a draw or a vote.
4. Building: participants work on what they got.
5. Showcase: builds are posted and linked to the event.
6. Archived: read-only, with the builds wall kept.

Anyone can propose an event as an idea. For v1, you approve which ones go live, so the first few set a good pattern. Domain White Elephant is the first event type. v1 ships with only this one. Later event types will likely be more build and hackathon events.

## Community center

Communities from Open Social get a community center in town. It shows what the community is up to on atmo.town and what its members can offer, and members can post ideas, entries, and builds as the community.

Open Social gives each community its own atproto identity, with a DID, a handle, and a PDS-backed repo. Apps register for an API key and can store records in community repositories ([Open Social](https://opensocial.community)).

- Post as a community: when posting an idea, joining an event, or linking a build, a member can choose a community they belong to. The record goes to the community's repo through the Open Social API, with a `postedBy` field naming the member.
- Community center page: the community's ideas, event entries, and builds, plus its members grouped by what they offer.
- Offers: each person lists what they can offer on their profile, such as design, spec writing, building or collaborating, testing, or docs. Someone with an idea can find a designer in a community they already belong to.
- Setup: atmo.town registers as an Open Social app to get an API key.

Open questions:

- [ ] Can any member post as the community, or only its admins? Open Social supports multiple admins and open, admin-approved, and private community types ([Open Social](https://opensocial.community)).
- [ ] Should activity from private communities appear on atmo.town at all?

## Design direction

atmo.town should feel like a cozy little town you walk around in, not a dashboard. The reference is [Where We're At 2026](https://where-were.at/2026), a community survey of Atmosphere developers. Its share image shows an orange balloon lifting a small TV-shaped robot into a dusk sky, it frames the survey as floating a balloon up through the protocol, and it offers a Dusk view.

The town as navigation, with names as placeholders until you pick them:

| Place | What it holds |
| --- | --- |
| Town square | Home feed: new ideas, live events, recent builds |
| Notice board | The Ideas app |
| Town hall | Events, including the white elephant draw shown as wrapped gifts on a table |
| Market | Builds, pulled from ATStore listings |
| Community center | One per Open Social community: its activity and what its members offer |
| Houses | Profiles, one per resident |

Residents are shown as their [rpg.actor](https://rpg.actor) characters. A character's look is an `actor.rpg.sprite` record: a PNG sprite sheet with its pixel size and row count, usually 4 rows for walking down, left, right, and up ([actor.rpg.sprite bindings](https://docs.rs/crate/jacquard-api/latest/source/src/actor_rpg/sprite.rs)). rpg.actor publishes its lexicon JSON, a public API, and a developer guide ([rpg.actor Game Jam page](https://itch.io/jam/rpgactor)). People without a character fall back to their Bluesky avatar, with a link to make one.

- [ ] Check rpg.actor's licenses page and reach out before using sprites ([rpg.actor Game Jam page](https://itch.io/jam/rpgactor) links it at rpg.actor/licenses).
- [ ] Illustrated town map, or a tiled pixel map that matches the sprites?
- [ ] Who draws it?

## Phasing and open questions

The white elephant has a hard date, so it sets the order. Everything else can slip.

| Phase | Target | Ships |
| --- | --- | --- |
| 1 | Mid-November | Sign-in, profiles, event shell, white elephant submissions |
| 2 | Early December | Live draw for the white elephant |
| 3 | Late December | Builds wall and showcase posts, used for the white elephant reveal |
| 4 | January | Ideas app, seeded with the white elephant domains nobody built on, and the community center |

Decisions so far:

- You own atmo.town, so records live under `town.atmo.*` ([NSID spec](https://atproto.com/specs/nsid)).
- atmo.town is a personal project. It runs from its own accounts, and any promotion through Bluesky channels is a request to the team.
- Andrew confirmed atmo.town can reuse the ATStore lexicons for builds.
- You moderate the Ideas feed and reserve the right to take down ideas that break the terms.
- The white elephant is the only event type for now. Later ones will likely be build and hackathon events.
- Communities from opensocial.community get a community center (see that section).
