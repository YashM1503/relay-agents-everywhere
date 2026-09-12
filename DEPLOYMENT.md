# RELAY Deployment Guide

RELAY is a **single Next.js 15 app** with in-memory sessions. Deploy it as one long-running Node process — not as static export.

---

## Requirements

- **Node.js** ≥ 18.18 (recommended: 20 LTS — see `.nvmrc`)
- **API keys** on the server only (`OPENAI_API_KEY`, optional `OPENROUTER_API_KEY`)
- **HTTPS** in production (reverse proxy or platform TLS)

---

## Environment variables

Copy `.env.example` to `.env.local` (local) or set in your platform.

| Variable | Required | Notes |
|----------|----------|-------|
| `RELAY_APP_MODE` | Yes | `production` or `demo` (server) |
| `NEXT_PUBLIC_RELAY_APP_MODE` | Yes | Must match — **baked at build time** |
| `NEXT_PUBLIC_DEMO_MODE` | Legacy | Use `false` for production builds |
| `OPENAI_API_KEY` | For Talk/live agents | Server-side only |
| `OPENROUTER_API_KEY` | Optional | Fallback router |
| `PORT` | Optional | Default `3000` |
| `HOST` / `HOSTNAME` | Optional | `0.0.0.0` for LAN/mobile |

**Demo vs production builds**

```bash
# Production (Talk, Show, no demo banner)
NEXT_PUBLIC_RELAY_APP_MODE=production
NEXT_PUBLIC_DEMO_MODE=false
RELAY_APP_MODE=production

# Hackathon clinic demo
NEXT_PUBLIC_RELAY_APP_MODE=demo
NEXT_PUBLIC_DEMO_MODE=true
RELAY_APP_MODE=demo
```

---

## Option A — Bare metal / VM (recommended for demos)

```bash
git clone https://github.com/YashM1503/relay-agents-everywhere.git
cd relay-agents-everywhere
npm ci
cp .env.example .env.local   # edit with your keys
chmod +x scripts/start-production.sh
./scripts/start-production.sh
```

Or manually:

```bash
npm run deploy:check          # test + typecheck + build
npm run start:prod            # next start on 0.0.0.0:3000
```

**Critical:** Do not run `npm run build` while `next dev` is still running. Kill dev first or use `scripts/start-production.sh`.

Verify:

```bash
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

---

## Option B — Docker

```bash
docker compose up --build -d
```

Or build with demo mode:

```bash
docker build \
  --build-arg NEXT_PUBLIC_RELAY_APP_MODE=demo \
  --build-arg NEXT_PUBLIC_DEMO_MODE=true \
  -t relay:demo .
docker run -p 3000:3000 -e RELAY_APP_MODE=demo relay:demo
```

Health check: `GET /api/health`

---

## Option C — Replit (hosted demo + iOS backend)

**URL:** [https://relay-assist--yashmishra1904.replit.app/](https://relay-assist--yashmishra1904.replit.app/)

The repo includes `.replit` and `replit.nix`. Import on Replit, set API keys in **Secrets**, and deploy.

```bash
# iPhone shell → Replit (no local dev server)
npm run ios:replit
npm run cap:open:ios
```

Full guide: [REPLIT.md](./REPLIT.md)

---

## Option D — Platform (Railway, Render, Fly, etc.)

1. Connect repo
2. **Build command:** `npm ci && npm run build`
3. **Start command:** `npm run start:prod` or `node server.js` (if using standalone artifact)
4. Set env vars from table above
5. Set `NEXT_PUBLIC_*` vars in **build** environment

---

## Pre-deploy checklist

```bash
npm run deploy:check
npm run ios:verify-secrets    # if shipping iOS shell
bash scripts/runtime-integration.sh   # with server running
```

---

## iOS Capacitor (separate step)

The iPhone shell loads a **hosted** backend URL — deploy the web app first, then:

```bash
CAPACITOR_SERVER_URL=https://relay-assist--yashmishra1904.replit.app npm run ios:sync
# or: npm run ios:replit
```

See [IOS_DEMO_SETUP.md](./IOS_DEMO_SETUP.md).

---

## Limitations (current build)

- Sessions are **in-memory** — restart clears state; no horizontal scale without sticky sessions + shared store
- No production auth or persistence (by design for hackathon demo)
- `NEXT_PUBLIC_*` changes require a **rebuild**
