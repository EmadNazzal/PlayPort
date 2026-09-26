# PlayPort — agent instructions

- Backend code follows `docs/best-practices/backend-typescript.md`; frontend follows `docs/best-practices/react.md`. Read the relevant one before writing code.
- Backend code lives in a module under `backend/src/modules/<module>/`. Modules talk to each other only through the other module's `index.ts` exports — never import another module's internal files.
- Partners host their own games. PlayPort stores integration metadata (URLs, webhooks, credentials) only; never add game hosting or game asset storage.
- Every new route: zod-validated via `handler()`, guarded with `requirePermission(...)`, and ownership checked in the service (`assertPartnerAccess` for partner resources). Add a test that the wrong caller is refused.
- Money is `bigint` lamports; never `number`.
- Schema changes: edit `backend/src/db/schema/`, run `npm run db:generate`, commit the migration.
- Never commit secrets, private keys or seed phrases. Wallets are verified by signed messages; we never hold user private keys.
- Frontend UI follows the "Night Market" design rules in `frontend/README.md` (accent colours have one job each; theme tokens only — both light and dark must work; entrances in CSS). Use the `emil-design-eng` skill for polish.
- Solana-specific work: use the skills in `.claude/skills/solana-new/` (see `SKILL_ROUTER.md`).
