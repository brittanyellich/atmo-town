# Ideas app

The Ideas app lets anyone post an idea for the Atmosphere in under a minute, gathers people who'd use it or build it, and links the idea to whatever ships. It is the main thing people see on atmo.town between events.

## Goals

- Posting an idea takes a title and two sentences. Nothing else is required.
- An idea with interested builders gets those builders talking to each other, which is the step that usually fails today.
- Shipped work points back to the idea, so the person who suggested it sees it happen.

## User flows

1. Post: title, short pitch, optional links and tags. Optional share to Bluesky.
2. React: mark an idea with "I'd use this", "I'd build this", or "I'd help" (design, testing, docs), plus an optional note.
3. Form a crew: once someone marks "I'd build this", the idea page lists builders and offers to start a crew thread on Bluesky that tags them. The author can mark the idea as being built and name the crew.
4. Ship: a builder links the ATStore listing for what they shipped. The idea shows as shipped, and everyone who reacted gets a notification.
5. Browse: new, most wanted (most "I'd use this"), needs builders (wanted, no builders yet), and shipped.

An idea's status comes from its records: no builders, has builders, being built, or shipped. Nobody sets it by hand except the author marking "being built".

## Forwarding ideas from Bluesky

Anyone can send a Bluesky post to the Ideas list by mentioning @atmo.town with the word "idea". It shows up right away in a "Spotted on Bluesky" view, credited to the original poster, who can claim it or ask for it to be removed.

1. Forward: reply to a post, quote it, or write a new post, and include "@atmo.town idea". For a reply or quote, the idea is the post being replied to or quoted.
2. Detect: a listener reads `app.bsky.feed.post` from Jetstream and keeps posts that mention the atmo.town account's DID along with the keyword. Mentions are stored as `app.bsky.richtext.facet#mention` features that carry the mentioned account's DID ([richtext facet lexicon](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/richtext/facet.json)). Jetstream's `wantedDids` filter selects post authors, not mentioned accounts ([Skyware JetstreamOptions](https://skyware.js.org/docs/jetstream/types/JetstreamOptions)), so the listener has to filter mentions itself.
3. Record: the atmo.town account writes a `town.atmo.suggestion` record to its own repo, with a strong reference to the source post, the forwarder's DID, a draft title, and a status. It can't write to the original poster's repo, so the idea stays a suggestion until they claim it.
4. Confirm: the atmo.town account replies to the forwarder with a link to the new entry.
5. Claim or remove: the original poster can sign in and claim it, which creates a `town.atmo.idea` in their repo linked to the suggestion. They can also remove it with one tap or a reply saying "remove".

Suggestion statuses: spotted, claimed, removed. Interest reactions work on suggestions too, so a spotted idea can gather builders before its author ever visits.

- [ ] Is "idea" the right keyword, or should any mention of @atmo.town count?
- [ ] Should a model draft the title and pitch from the post, or should the title just be the post's first line?
- [ ] Limit forwards per account per day?
- [ ] Skip posts from accounts that block or mute the atmo.town account?

## Records

| NSID (proposed) | Fields | Notes |
| --- | --- | --- |
| `town.atmo.idea` | title, pitch, tags, links, status, createdAt | status is only `open` or `building`; shipped is derived from build links |
| `town.atmo.suggestion` | source post, forwardedBy, title, status | written by the atmo.town account for ideas forwarded from Bluesky |
| `town.atmo.interest` | subject (idea or suggestion reference), kind (use, build, help), note | one per person per idea |
| `town.atmo.buildLink` | listing (ATStore listing AT URI), ideas and events it came from | the app itself is described by its ATStore listing |
| `town.atmo.profile` | skills, lookingFor | single record, key `self` |

Builds live on ATStore as `fyi.atstore.listing.detail` records, and atmo.town looks them up with `fyi.atstore.directory.getListing` ([ATStore developer API](https://atstore.fyi/developers/atproto)). Andrew confirmed atmo.town can reuse these lexicons. Still open: how listing records get created, and whether small projects fit the directory.

References use an AT URI plus CID so a link always points at the version someone reacted to ([Skyware glossary](https://skyware.js.org/guides/bot/glossary)). A single-record collection with the key `self` is a known atproto pattern ([atproto data repos](https://atproto.com/guides/data-repos)).

## Screens

- Home: four tabs matching the browse views, plus live events at the top.
- Idea page: pitch, reaction counts with faces, builders list, crew thread link, linked builds.
- Post an idea: one form, three fields visible.
- Build page: what shipped, who made it, which idea or event it came from.
- Profile: skills, ideas posted, ideas building, builds.

## Open questions

- [ ] Can people comment on ideas on atmo.town, or does discussion stay on Bluesky through the share post?
- [ ] Should an author be able to hand an idea to a crew, so the crew can edit it?
- [ ] Do ideas expire or get archived after a period with no reactions?
- [ ] Should builds from outside atmo.town (an existing app) be linkable to an idea after the fact?
