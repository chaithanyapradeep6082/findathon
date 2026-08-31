# DeadDrop backend (Express + MongoDB)

Implements the architecture in `deaddrop-architecture.md`: package lifecycle
(Active → Burned / Expired / Revoked / Locked), password + view-limit +
failed-attempt enforcement, encrypted-at-rest payloads, access-attempt
telemetry, and an audit log.

## Setup

```bash
npm install
cp .env.example .env
# generate a real encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste the output into ENCRYPTION_KEY in .env, and set MONGO_URI / JWT_SECRET
npm run dev
```

Requires a running MongoDB instance reachable at `MONGO_URI`.

## Key endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | create an account |
| POST | `/api/auth/login` | — | get a JWT |
| POST | `/api/packages` | user | create a package (multipart: `files`, plus `message`, `maxViews`, `expiresInMinutes`, `password`, `recipientEmail`) |
| GET | `/api/packages` | user | list your own packages, `?state=&page=&limit=` |
| POST | `/api/packages/:id/revoke` | owner/admin | revoke an active package |
| GET | `/api/access/:token` | — | check a link's status without consuming a view |
| POST | `/api/access/:token` | — | attempt access (body: `{ password }` if required) |
| GET | `/api/received-packages` | user | packages addressed to your account's email, `?state=&page=&limit=` |
| GET | `/api/received-packages/:id` | user | status of one, only if it's addressed to you |
| POST | `/api/received-packages/:id/access` | user | reveal it (same rules as the link flow: password, view limit, lockout) |
| GET | `/api/admin/packages` | admin | all packages, `?state=&search=&page=&limit=` |
| GET | `/api/admin/attempts` | admin | access attempts, `?outcome=&packageId=` |
| GET | `/api/admin/audit-logs` | admin | audit trail, `?action=&from=&to=` |

## Two ways to access a package

- **Anonymous link** (`/api/access/:token`) — works for anyone with the link, no account needed. The raw token is the only credential; it's hashed at rest.
- **Sent to my account** (`/api/received-packages`) — if the sender set `recipientEmail` to a registered user's email, that user can find and open the package after logging in, with no token required. Both paths enforce the exact same rules (expiry, password, view limit, failed-attempt lockout) via `src/services/packageAccessService.js`, and both write identical `AccessAttempt`/audit records.

## Notes on what's simplified for a starter

- File storage is local disk (`UPLOAD_DIR`); swap `packageController`/`accessController`'s
  `fs.readFile`/`writeFile` calls for S3 (or similar) in production.
- JWT is stateless (no refresh tokens / revocation list).
- `express-rate-limit` uses in-memory storage; use a Redis store for multi-instance deployments.
