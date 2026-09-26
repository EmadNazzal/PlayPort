# games module

Listings for games that partners host on their own infrastructure. PlayPort stores the
metadata and launch URL, never the game.

Status flow: `draft` → `pending_review` → `published` | `rejected` → (`archived`).
Changing `launchUrl` or `priceLamports` on a published game sends it back to `pending_review`.
Only published games of approved partners appear in the public catalog.

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/games?search=&genre=&limit=&offset=` | public |
| GET | `/games/:slug` | public |
| GET | `/games/manage?partnerId=` | `games:manage` + partner member / API key |
| POST | `/games` | `games:manage` — `{ partnerId, title, slug, launchUrl, ... }` |
| PATCH | `/games/:id` | `games:manage` |
| POST | `/games/:id/submit` | `games:manage` — partner must be approved |
| POST | `/games/:id/archive` | `games:manage` |
| POST | `/games/:id/claim` | `games:claim` — free games only |

Prices are in lamports, sent and returned as decimal strings.
