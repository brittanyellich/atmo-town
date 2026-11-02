# Screens for design

atmo.town needs 21 screens for v1: 6 shared, 6 for the Ideas app, 6 for Domain White Elephant, and 3 for communities and trust. This tab is written to paste into Claude Design as the brief.

## Look and feel

- A cozy, approachable little town, not a dashboard. Each section is a place you walk to.
- Reference: [Where We're At 2026](https://where-were.at/2026), with its hand-made dusk-sky illustration and its Dusk view. atmo.town should have a day view and a dusk view.
- Residents appear as their [rpg.actor](https://rpg.actor) pixel sprites, which are sprite sheets with four walking directions. Anyone without one shows their Bluesky avatar in the same frame.
- Place names are placeholders: Town square, Notice board, Town hall, Market, Community center, Houses.
- Mobile and desktop for every screen. Most people will arrive from a Bluesky link on a phone.

## Shared

| # | Screen | Place | What's on it | States to design |
| --- | --- | --- | --- | --- |
| 1 | Town map | Town square | Illustrated map with the five places, residents walking around, live event banner | Day, dusk, an event live (Live now banner linking to the Streamplace stream) |
| 2 | Home feed | Town square | New ideas, ideas that just found builders, live events, recent builds | Signed out, signed in, quiet day |
| 3 | Sign in | Gate | Enter your handle, continue with atproto OAuth, short line on what atmo.town will write | Default, error |
| 4 | Profile | House | Sprite or avatar, skills, looking for, ideas posted, ideas building, builds, events joined | Own profile, someone else's, no sprite yet |
| 5 | Edit profile | House | Skills, what you're looking for, link to make an rpg.actor character | Default |
| 6 | Notifications | Mailbox | Interest on your ideas, event phase changes, your turn in a draw, forwarded ideas to claim | Empty, unread |

## Ideas app

| # | Screen | Place | What's on it | States to design |
| --- | --- | --- | --- | --- |
| 7 | Notice board | Notice board | Tabs: New, Most wanted, Needs builders, Shipped, Spotted on Bluesky | Each tab, empty tab |
| 8 | Idea page | Notice board | Pitch, author, reaction counts with faces, builders list, crew thread link, linked builds | No builders, has builders, being built, shipped |
| 9 | Post an idea | Notice board | Title, pitch, optional links and tags, share to Bluesky toggle | Empty, filled, posted confirmation |
| 10 | React to an idea | Notice board | I'd use this, I'd build this, I'd help, optional note | Sheet or popover on the idea page |
| 11 | Spotted on Bluesky item | Notice board | Embedded source post, who forwarded it, claim and remove buttons for the original poster | Unclaimed, claimed, viewer is the original poster |
| 12 | Market | Market | Builds pulled from ATStore listings, each linked to its idea or event | Default, filtered by event |

## Domain White Elephant

| # | Screen | Place | What's on it | States to design |
| --- | --- | --- | --- | --- |
| 13 | Event page | Town hall | What it is, rules, timeline, join button, count of wrapped domains | Announced, open, live, building, showcase |
| 14 | Submit a domain | Town hall | Domain, your idea for it, renewal choice, registrar, registration date | Empty, young-domain warning, submitted |
| 15 | Waiting room | Town hall | Wrapped gifts on a table, list of players with sprites, countdown to the draw | Before draw |
| 16 | Live draw | Town hall | Wrapped and opened gifts, holder and steal count on each, whose turn, turn timer, open or steal actions | Your turn, waiting, someone stole yours, locked domain, final steal |
| 17 | My domain | House | The domain, the idea it came with, DNS request to the giver, link your ATStore listing | Before build, build linked |
| 18 | Reveal wall | Market | Every domain, who gave it, who built on it, what they made | During showcase, archived |

## Communities and trust

| # | Screen | Place | What's on it | States to design |
| --- | --- | --- | --- | --- |
| 19 | Community center | Community center | Community name and handle, its ideas, entries, and builds, members grouped by what they offer (design, spec writing, building, testing, docs) | Your community, someone else's, new community with no activity |
| 20 | Post as picker | Any form | Choose yourself or a community you belong to when posting an idea, joining an event, or linking a build | You only, you plus communities |
| 21 | Report and terms | Town hall | Report sheet on any idea, plus the atmo.town terms page | Report sent, terms page |

## Not designed yet

- Event types after the white elephant reuse screens 13 to 18 with their own middle screen.
- Moderation and host tools are out of this round.
