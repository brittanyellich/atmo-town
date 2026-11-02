# Domain White Elephant

Domain White Elephant is the first atmo.town event: everyone brings a domain they've been sitting on plus the idea they had for it, picks or steals one in a white elephant draw, builds something on it in December, and shows it off at the end of the month. It started from [Brad Estey's post](https://bsky.app/profile/brittanyellich.com/post/3mxpzpurljs24) asking for a white elephant domain exchange.

## Timeline

&#91;embedded content: proposed event timeline · Nov to Dec 2026\]

These dates are proposals. Submissions close a week before the draw so you have time to check entries and post the draw order.

## Rules

1. To play, submit one domain you're willing to give away, plus the idea you had for it (optional) and whether you'll cover its next renewal.
2. Entries stay sealed until opened. Nobody sees which domains are in the pile, only how many.
3. Draw order is a random shuffle of everyone who submitted.
4. On your turn, open a sealed domain or steal an opened one. You never get offered your own.
5. If someone steals from you, you take a turn right away, but you can't steal back the one just taken.
6. A domain locks after it has been stolen 3 times.
7. After the last turn, the first player gets one final steal, since they had nothing to steal at the start.
8. During the building phase, any two players can agree to trade.
9. You can build the giver's idea or your own. Anything counts at the reveal, including a one-page site.

## Keeping entries sealed

Repo records are public ([Skyware glossary](https://skyware.js.org/guides/bot/glossary)), so a domain written to someone's repo at submission would spoil the draw. Instead:

- At submission, the participant's repo gets an entry record holding only the event reference and a SHA-256 hash of the domain plus a random salt.
- The atmo.town AppView keeps the domain, idea, and salt privately.
- When an entry is opened, the event account publishes a reveal record with the domain, idea, and salt. Anyone can check it against the hash, so a giver can't be accused of swapping.
- The shuffle seed is derived from all the commitment hashes once submissions close, so the draw order is checkable too.

## Records

| NSID (proposed) | Written by | Fields |
| --- | --- | --- |
| `town.atmo.event` | Host | type, hosts, phase dates, steal limit |
| `town.atmo.whiteElephant.entry` | Participant | event, commitment hash, createdAt |
| `town.atmo.whiteElephant.turn` | Participant | event, action (open or steal), target entry |
| `town.atmo.whiteElephant.reveal` | Event account | entry, domain, idea, salt |
| `fyi.atstore.listing.detail` + `town.atmo.buildLink` | Builders | the shipped project on ATStore, linked to the event |

Turn records go to each player's repo and the AppView checks them against the game state. If firehose delay makes a live draw feel slow, the web app can call the AppView directly and write the record after.

## Domain handoff

Moving a domain between people can trigger transfer locks, so the event keeps the formal handoff out of the game.

- During December, the giver keeps the registration and points DNS wherever the winner asks.
- After the reveal, winners who want to keep the domain arrange the transfer with the giver.
- Under ICANN's Transfer Policy, changing the registrant locks the domain against moving to another registrar for 60 days. Registrars may let the prior owner opt out first, and ICANN suggests moving registrar before changing registrant to avoid the lock ([ICANN](https://www.icann.org/en/resources/compliance/complaints/transfer/ownership)).
- A registrar may also deny a transfer in the first 60 days after a domain's initial registration ([NiceNIC](https://nicenic.com/fr/support/What-Is-the-60-Day-Domain-Transfer-Lock-4853)). The submission form asks for the registration date so the app can flag young domains.
- That ICANN policy covers gTLDs ([NiceNIC](https://nicenic.com/fr/support/What-Is-the-60-Day-Domain-Transfer-Lock-4853)). Country-code domains follow their registry's own rules, which this spec hasn't checked.

## Screens

- Submit: domain, idea, renewal choice, registrar, registration date.
- Waiting room: count of sealed domains, list of players, countdown to the draw.
- Draw board: sealed tiles, opened tiles with holder and steal count, whose turn it is, turn timer.
- My domain: the idea that came with it, DNS request to the giver, link to post a build.
- Reveal wall: every domain, who gave it, who built on it, and what they made.

## Open questions

- [ ] Live draw at a set time, or async turns over a few days? Live is more fun, but participants span time zones.
- [ ] Turn timer length, and what happens on timeout (auto-open a random sealed domain?)
- [ ] Who pays the renewal if the giver opts out?
- [ ] Is 3 steals the right cap for the expected group size?
- [ ] Will the Bluesky team post about it from team accounts? The draw itself streams on Streamplace, linked from the Live now banner.
