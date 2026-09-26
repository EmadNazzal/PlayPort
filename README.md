# PlayPort

PlayPort connects **gamers** with **partners** — studios and developers who host their own
games — and handles player **wallets** on Solana. Partner games are never hosted by PlayPort;
we integrate with them over their APIs and webhooks.

## Repository layout

```
PlayPort/
├── backend/              # TypeScript API (Express), organised by module
│   └── src/modules/
│       ├── gamer/        # player accounts, profiles
│       ├── partner/      # game hosts and their externally hosted games
│       └── wallets/      # Solana wallet linking and ownership verification
├── frontend/             # React + Vite + TypeScript app, organised by feature
├── docs/best-practices/  # how we write backend TypeScript and React
└── .claude/skills/       # AI agent skills (solana.new), usable from Claude Code
```

## Getting started

Requires Node.js 20+.

```bash
cd backend && npm install && npm run dev     # API on http://localhost:4000
cd frontend && npm install && npm run dev    # app on http://localhost:5173
```

## Engineering guidelines

- [Backend TypeScript best practices](docs/best-practices/backend-typescript.md)
- [React best practices](docs/best-practices/react.md)

## AI skills

`.claude/skills/solana-new/` vendors the [solana.new](https://www.solana.new/) skill set
(MIT, from [sendaifun/solana-new](https://github.com/sendaifun/solana-new)). Open the repo in
Claude Code and they are picked up automatically, e.g. `/scaffold-project`, `/build-with-claude`,
`/debug-program`, `/deploy-to-mainnet`. Start with `SKILL_ROUTER.md` to see them all.

## License

MIT
