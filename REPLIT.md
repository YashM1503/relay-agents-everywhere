# RELAY on Replit

Hosted web demo + backend for the iOS Capacitor shell.

**Live URL:** [https://relay-assist--yashmishra1904.replit.app/](https://relay-assist--yashmishra1904.replit.app/)

---

## Deploy on Replit

1. Import this repo into Replit (or connect GitHub).
2. Replit reads `.replit` — build runs `npm ci && npm run build`, start runs `npm run start:prod`.
3. Set **Secrets** in the Replit sidebar (never commit these):

| Secret | Required |
|--------|----------|
| `OPENAI_API_KEY` or `OPENROUTER_API_KEY` | For live agents |
| `RELAY_APP_MODE` | `demo` (clinic) or `production` |
| `NEXT_PUBLIC_RELAY_APP_MODE` | Must match — set before build |
| `NEXT_PUBLIC_DEMO_MODE` | `true` for clinic demo |

4. Click **Deploy** (or Run). Replit assigns `PORT` automatically.

Verify:

```bash
curl -s https://relay-assist--yashmishra1904.replit.app/api/health
```

---

## iOS shell → Replit (no Mac backend)

Once Replit is live, sync the iPhone app to the hosted URL:

```bash
npm run ios:replit
```

Or manually:

```bash
CAPACITOR_SERVER_URL=https://relay-assist--yashmishra1904.replit.app npm run ios:sync
npm run cap:open:ios
```

Build an IPA against Replit:

```bash
CAPACITOR_SERVER_URL=https://relay-assist--yashmishra1904.replit.app \
IOS_TEAM_ID=XXXXXXXXXX \
npm run ios:ipa
```

---

## Architecture

```
iPhone (Capacitor)  ──HTTPS──►  Replit (Next.js + API keys)
Browser             ──HTTPS──►  Replit (same app)
```

No API keys in the iOS binary. Replit holds server-side secrets only.
