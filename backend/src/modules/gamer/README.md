# gamer module

Gamer profiles and libraries. A gamer is a user with the `gamer` role and a `gamer_profiles`
row; they sign up with email + password or by signing in with a Solana wallet (see `auth`).

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/gamers/me` | user | my profile |
| PATCH | `/gamers/me` | `profile:write` | username, displayName, avatarUrl, bio, country, dateOfBirth |
| GET | `/gamers/me/library` | user | games I own |
| GET | `/gamers/:username` | public | public profile (no email, country or DOB) |
