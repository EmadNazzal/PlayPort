# PlayPort — agent instructions

- Backend code follows `docs/best-practices/backend-typescript.md`; frontend follows `docs/best-practices/react.md`. Read the relevant one before writing code.
- Backend code lives in a module under `backend/src/modules/<module>/`. Modules talk to each other only through the other module's `index.ts` exports — never import another module's internal files.
- Partners host their own games. PlayPort stores integration metadata (URLs, webhooks, credentials) only; never add game hosting or game asset storage.
- Never commit secrets, private keys or seed phrases. Wallets are verified by signed messages; we never hold user private keys.
- Solana-specific work: use the skills in `.claude/skills/solana-new/` (see `SKILL_ROUTER.md`).
