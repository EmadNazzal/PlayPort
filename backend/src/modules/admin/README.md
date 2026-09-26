# admin module

Platform administration. Every route requires a user session plus a specific `admin:*`
permission (admins hold all of them). Admins are created with `npm run create-admin`, or
by another admin granting the role.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/users?search=&status=&role=` | `admin:users:read` |
| GET | `/admin/users/:id` | `admin:users:read` |
| POST | `/admin/users/:id/suspend` `{ reason }` | `admin:users:write` — revokes all their sessions |
| POST | `/admin/users/:id/reactivate` | `admin:users:write` |
| POST | `/admin/users/:id/roles` `{ role }` | `admin:roles:write` |
| DELETE | `/admin/users/:id/roles/:role` | `admin:roles:write` |
| GET | `/admin/partners?status=` | `admin:partners:review` |
| POST | `/admin/partners/:id/review` `{ decision, reason? }` | `admin:partners:review` |
| GET | `/admin/games?status=` | `admin:games:review` |
| POST | `/admin/games/:id/review` `{ decision, reason? }` | `admin:games:review` |
| GET | `/admin/audit-logs?actorUserId=&action=&targetId=` | `admin:audit:read` |

Admins can't suspend themselves or remove their own admin role.
