# PlayPort

PlayPort connects **gamers** with **partners** — studios and developers who host their own
games — and handles player **wallets** on Solana. Partner games are never hosted by PlayPort;
we integrate with them over their APIs and webhooks.

## Repository layout

```
PlayPort/
├── backend/              # TypeScript API (Express + Postgres/Drizzle), organised by module
│   └── src/modules/
│       ├── auth/         # email + Sign-In With Solana, JWT + rotating refresh tokens
│       ├── gamer/        # gamer profiles and libraries
│       ├── wallets/      # linked Solana wallets
│       ├── partner/      # studios hosting their own games, team roles, API keys
│       ├── games/        # catalog and review workflow
│       ├── payments/     # SOL purchases verified on-chain
│       └── admin/        # users, roles, reviews, audit log
├── frontend/             # React + Vite app: marketplace, player area, studio (partner) area
├── docs/best-practices/  # how we write backend TypeScript and React
└── .claude/skills/       # AI agent skills (solana.new), usable from Claude Code
```

## Getting started

Requires Node.js 20+ and Docker. Backend setup (database, env, first admin) is in
[backend/README.md](backend/README.md).

```bash
cd frontend && cp .env.example .env && npm install && npm run dev    # http://localhost:5173
```

Frontend structure and the design system are in [frontend/README.md](frontend/README.md).

## Engineering guidelines

- [Backend TypeScript best practices](docs/best-practices/backend-typescript.md)
- [React best practices](docs/best-practices/react.md)

## AI skills

Skills in `.claude/skills/` are picked up automatically when you open the repo in Claude Code.

- **solana.new** (`.claude/skills/solana-new/`) — Solana build journey: `/scaffold-project`,
  `/build-with-claude`, `/debug-program`, `/deploy-to-mainnet`, ... Start with `SKILL_ROUTER.md`.
  MIT, vendored from [sendaifun/solana-new](https://github.com/sendaifun/solana-new).
- **Emil Kowalski's design engineering skills** — UI polish and motion: `emil-design-eng`,
  `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`,
  `apple-design`, `mobile-native`, `pick-ui-library`, `prototype`, `ask-sonner`,
  `animation-vocabulary`, plus `animate-expo` and `write-swift` for native work.
  MIT, from [emilkowalski/skills](https://github.com/emilkowalski/skills); update with
  `npx skills@latest update -p`.

## License

MIT
