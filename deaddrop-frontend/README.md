# DeadDrop frontend (Svelte + Vite)

A minimal SPA for the DeadDrop API: sender dashboard, package creation, the
public recipient access flow, and an admin console.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your backend, e.g. http://localhost:4000/api
npm run dev
```

## Structure

- `src/lib/api.js` — fetch wrapper that attaches the JWT and normalizes errors
- `src/lib/auth.js` — auth store persisted to `localStorage`
- `src/lib/router.js` — tiny hash-based router (`#/dashboard`, `#/access/:token`, …)
- `src/pages/Login.svelte`, `Register.svelte` — auth
- `src/pages/Dashboard.svelte`, `CreatePackage.svelte` — sender side
- `src/pages/Access.svelte` — public recipient flow via link token: check
  status, then a deliberate "Reveal package" action (so simply visiting the
  link doesn't consume a view)
- `src/pages/AccessPackage.svelte` — the "Access package" homepage: paste a
  link/code, or browse packages addressed to your logged-in account
- `src/pages/ReceivedAccess.svelte` — same reveal flow as `Access.svelte` but
  for a package identified by account + id instead of a link token
- `src/pages/Admin.svelte` — packages / users / attempts / audit log, each
  with search, filtering, and pagination against the corresponding
  `/api/admin/*` endpoint

## Design notes

Dark, low-contrast surface with a cold teal accent for "active/secure" states,
amber for revoked, and red reserved for locked (the state that signals
someone was trying to brute-force a package) — so the one alarming color in
the UI means something specific rather than being decoration. Monospace is
used only for literal data (tokens, timestamps, IDs), not as a stylistic label
font.
