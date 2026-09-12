# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |

RELAY is a hackathon demonstration project, not a production service. Treat all
deployments as experimental.

## Reporting a vulnerability

If you discover a security issue, please report it responsibly:

1. **Do not** open a public GitHub issue for exploitable vulnerabilities.
2. Email **yashmisra1503@gmail.com** with:
   - A description of the issue
   - Steps to reproduce
   - Impact assessment (if known)
3. Allow reasonable time for a response before public disclosure.

We will acknowledge receipt within a few business days and work with you on a
fix or mitigation where appropriate.

## Scope notes

- Demo mode uses **synthetic data only**. Do not test against real patient or
  financial records.
- API keys belong in `.env` (gitignored). Never commit secrets to the repo or
  the iOS bundle — run `npm run ios:verify-secrets` before device builds.
- COUNTERSIGN is a demo policy engine, not a certified compliance control.

## Safe defaults

- `NEXT_PUBLIC_DEMO_MODE=true` keeps the clinic path deterministic.
- Live model and vision features require explicit env configuration.
- Capacitor loads a hosted backend URL — use LAN dev only on trusted networks.
