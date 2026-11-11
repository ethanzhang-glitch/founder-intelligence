# Founder Intelligence — public edition

Public catalog browsing with independent username/password accounts and account-scoped preferences, bookmarks, notes, watchlists and deterministic briefings. Reuses the existing product interface.

## Data and accounts

- The bundled catalog is a sanitized snapshot: 2,562 investors, 6,399 companies, 502 articles and 11 sources. Source links are retained.
- The original local database, project profile, research notes, AI cache and secrets are not included.
- Durable account documents use Sites D1. A hashed, revocable session token determines ownership; anonymous visitors can browse but cannot write.
- Prepared SQL, same-origin writes, revision checks and size limits protect account updates.
- Usernames are case-insensitive (3–32 ASCII letters, digits or underscores). Passwords are salted scrypt hashes (N=16384, r=8, p=5), 12–128 characters. Sessions use HttpOnly, Secure, SameSite=Lax cookies in production; only token hashes are stored.
- A one-time recovery code is shown at registration. Recovery rotates the code and revokes previous sessions. Password changes also revoke other sessions. No email provider or AI is involved.
- Persistent per-account/IP/global rate limits protect authentication. Registration is capped at 8 per IP/hour and 100 globally/day. Expired sessions/limits are cleaned on authentication.
- Legacy ChatGPT-owned documents remain in D1; new independent accounts are separate and are not silently linked to legacy identities.
- Live collection runs in the maintained local application. This release does not send email/push alerts or run paid AI calls. Watchlists save research targets only.

## Development

Run npm run dev for the official Sites local preview. Apply drizzle migrations to the local D1 database before testing persistence.

Checks: node tests/independent-auth.mjs; node --experimental-strip-types tests/account-isolation.mts; node tests/hosted-smoke.mjs (local preview on port 5173).

Build and publish with the official Sites build-site and site-workflow helpers. Keep .openai/hosting.json project identity, migrations and pushed source synchronized. Never upload .env, .wrangler local data or the original founder.db.
