# partner module

Partners are studios and developers who **host their own games**. PlayPort never hosts
partner games — it stores the partner's profile, team, payout wallet and API keys.

Lifecycle: any signed-in user applies (`POST /partners`) → becomes the partner's `owner` and
gains the global `partner` role → an admin approves (needs a payout wallet) → the partner's
games can be submitted for review and its API keys start working.

Per-partner roles: `owner` > `admin` > `developer`, enforced by `assertPartnerAccess`.
Non-members get 404 so partner IDs can't be probed.

| Method | Path | Min partner role |
| --- | --- | --- |
| POST | `/partners` | — (any user, `partners:apply`) |
| GET | `/partners/mine` | — |
| GET | `/partners/:id` | developer (or the partner's API key) |
| PATCH | `/partners/:id` | admin |
| GET | `/partners/:id/members` | developer |
| POST | `/partners/:id/members` | admin (owner to add an owner) |
| DELETE | `/partners/:id/members/:userId` | admin, or yourself; the last owner can't leave |
| GET/POST | `/partners/:id/api-keys` | admin — the key is shown once |
| DELETE | `/partners/:id/api-keys/:keyId` | admin |

Partner backends authenticate with `X-API-Key: pp_<prefix>_<secret>`. Scopes:
`games:manage`, `payments:read_partner`.
