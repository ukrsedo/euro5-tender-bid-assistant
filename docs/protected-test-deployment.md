# One assistant with authenticated access

The public site and the protected tester address now use the **same source interface**:
https://github.com/ukrsedo/euro5-tender-bid-assistant/tree/main.

`access-worker.js` is an authentication gateway. After verifying the session it fetches an explicit allowlist of frontend files directly from the main repository through raw.githubusercontent.com without browser cookies or credentials. There is no `protected-public` directory, `ASSETS` binding or separately edited HTML/JavaScript. Once a main-interface update reaches main, a reload through the tester address uses it too. If the shared source is unavailable, the gateway reports an error instead of serving an old private copy.

Only `/config.js` is supplied by the gateway: it selects the same-origin API and session authentication. The shared `memory.js` automatically connects authenticated users and preserves the explicit participation decision, optional comment, actor attribution, revisions and latest-decision lookup. The public site retains its existing key-based access to memory. Calculation, product selectors, ratings and reports use the same frontend files.

## Deployment

Existing Cloudflare Workers Builds is connected to `feature/access-email-login` for `euro5-tender-test`. Publish the unified source to that branch and deploy using the existing command:

```
node scripts/build-protected.mjs
npx wrangler deploy --config wrangler.protected.jsonc
```

The build command now checks the gateway source files; it does not create or upload a second UI. The gateway imports the common `worker.js` for authenticated memory and buyer history. Tender analysis continues to call the existing backend through `TENDER_AI`; the backend keeps its AI secrets.

Preserve all existing secrets: `SESSION_SECRET`, `TEST_PASSWORD_SHA256`, `ACCESS_USERS`. Do not rotate the tester password or recreate D1. The existing `EURO5_MEMORY_DB`, service binding and Access issuer/audience remain in the configuration. `0002_login_limits.sql` is already present in an established deployment; do not reinitialize the database. For a fresh installation apply the memory and login-limit migrations to the intended database first.

## Access

- Tester: https://euro5-tender-test.ukrsedo-e2e.workers.dev/login
- Administrator: https://euro5-tender-test.ukrsedo-e2e.workers.dev/admin-login
- Shared tester profile remains `test-team`, editor, company `euro5`.
- Personal profiles retain their IDs, role and company from `ACCESS_USERS`.
- Access email OTP protects only `/admin-login`; the whole hostname must not be placed behind the administrator-only policy.

Unauthenticated requests cannot fetch the assistant, shared JavaScript, config, memory or analysis. Server-side code and arbitrary upstream paths are never proxied. Login, signed cookies, administrator assertion verification, session expiry, same-origin POST checks and D1 rate limits remain active. No API credentials, browser cookies or Access assertions are forwarded to the shared frontend or analysis backend.

## Verification

Run `node scripts/test-protected-auth.mjs`, `node scripts/test-session-participation-ui.mjs`, `node scripts/test-participation-ui.mjs`, `node scripts/test-participation-memory.mjs`, and the existing fuel-quality/model/risk tests.

After the build succeeds, sign in with the existing tester password, load a tender and check “Марка та різновид пального”, “Рішення закупівельника”, automatic memory connection and logout. The gateway marks shared asset responses with `X-Euro5-Frontend: shared-main`. A loaded page must be reloaded to receive a later frontend release.

Keep the main repository source available while the gateway uses it. Public source code is not a confidential data store. This update does not alter the existing decision to keep the public entry available during testing.
