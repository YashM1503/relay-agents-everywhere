# Contributing to RELAY

Thank you for helping make RELAY more accessible and more reliable. This project
was built for a hackathon demo, but contributions that improve clarity, safety,
and test coverage are welcome.

## Before you start

1. Read the [Code of Conduct](./CODE_OF_CONDUCT.md).
2. Skim [`docs/product/00_READ_ME_FIRST.md`](./docs/product/00_READ_ME_FIRST.md)
   for product intent and scope.
3. Use **synthetic demo data only** — never commit real PII, API keys, or
   production credentials.

## Development setup

```bash
git clone https://github.com/YashM1503/relay-agents-everywhere.git
cd relay-agents-everywhere
npm install
cp .env.example .env
npm run dev
```

Verify your change:

```bash
npm test
npm run typecheck
npm run build
```

For API-level checks with the dev server running:

```bash
bash scripts/runtime-integration.sh
```

## Branch workflow

| Branch | Purpose |
|--------|---------|
| `main` | Stable integration branch — web app, COUNTERSIGN, iOS shell |
| `feat/*` | Focused feature work — open a PR into `main` |
| `builder2/*` | Builder 2 runtime and adapter work — coordinate before merging |

Keep branches short-lived. Rebase or merge from `main` before opening a PR.

## Pull request guidelines

- One logical change per PR when possible.
- Include a short summary and test plan.
- Do not expand scope beyond the stated goal (feature freeze applies to the
  demo hero path unless explicitly agreed).
- Ensure CI checks pass: tests, typecheck, build.

## What we are not accepting (yet)

- Production auth, billing, or real clinic integrations
- Duplicate COUNTERSIGN implementations
- Committed secrets or real user data

## Questions

Open a GitHub issue for bugs or design questions. For security concerns, see
[SECURITY.md](./SECURITY.md).
