# React best practices

## Structure

The frontend is organised by feature, mirroring the backend modules:

```
frontend/src/
├── features/<feature>/   # components, hooks, api calls for one feature
├── shared/               # reusable UI, the api client, utilities
└── App.tsx
```

- A feature exposes what others need through its `index.ts`. Don't reach into another
  feature's internals.
- Components that are only used in one feature stay in that feature. Promote to `shared/`
  when a second feature needs them.

## Components

- Function components and hooks only. Named exports.
- Keep components small and focused; extract a component when a section has its own state
  or a clear name.
- Props are typed with a `type` alias. Avoid `React.FC`.
- Derive values during render instead of mirroring props into state. If you can compute it,
  don't store it.
- `useEffect` is for synchronising with something outside React (subscriptions, the DOM,
  wallets). It is not for data transformation or for reacting to your own state changes.

## State and data

- Server state (anything fetched from the API) goes through a data-fetching layer
  (TanStack Query when we add it), not ad-hoc `useEffect` + `useState`.
- Local UI state stays as local as possible. Lift it only when siblings need it.
- Every async UI has explicit loading, error, and empty states.

## Performance

- Don't memoise by default. Reach for `useMemo` / `useCallback` / `memo` when profiling
  shows a problem or a referential identity is required by a dependency.
- Stable `key`s from data IDs, never array indexes for lists that reorder.
- Lazy-load heavy routes and wallet adapters with `React.lazy`.
- See also the `vercel-react-best-practices` guidelines for deeper performance patterns.

## Wallets

- Wallet connection lives in `features/wallets`; other features consume a hook
  (`useWallet`) rather than touching the adapter.
- Never ask for or handle private keys or seed phrases in the UI. Ownership is proven by
  signing a server-issued message.
- Show addresses truncated (`AbCd…WxYz`) with copy-to-clipboard; show full value on demand.

## Accessibility

- Semantic elements first (`button`, `nav`, `main`, `label`). A clickable `div` is a bug.
- Every interactive element is reachable and operable by keyboard with a visible focus state.
- Images have `alt`; icon-only buttons have `aria-label`.

## Testing

- Test behaviour through the UI (React Testing Library): what the user sees and does,
  not implementation details.
- Mock at the network boundary, not inside components.
