# Protected EURO5 test deployment

Status: prepared implementation. This branch alone does not protect the existing GitHub Pages site or its Worker. Do not merge it into the Pages publishing branch before the protected deployment is verified.

## Two profiles

- Administrator: persistent ID `sergii`, name Sergii Dovgalenko, company `euro5`, role `admin`. Set the approved email in the private `ACCESS_USERS` configuration. Individual users authenticate through Cloudflare Access email OTP on `/admin-login`.
- Shared tester: persistent ID `test-team`, company `euro5`, role `editor`. Several browsers may sign in concurrently with the same test password. Shared records cannot identify the individual author.

Profiles are server configuration, not a client-side selector. Passwords and profile configuration must never be added to Git, static assets or the public build log. `ACCESS_USERS` is a JSON string containing an array of `{id,name,email,company,role}` objects. The delivered private settings contain the administrator profile, a generated high-entropy test password hash and a separate random session secret. The password itself is only in the separate tester instruction file.

## Deploy without changing the public site first

1. Check out this branch locally. Install/use Cloudflare Wrangler and authenticate to the correct Cloudflare account. No OpenAI credential changes are required by this feature.
2. Copy the existing D1 database ID for `euro5-project-memory` into `wrangler.protected.jsonc`. Keep the existing database and memory table; no history is reset.
3. Apply only the new login-limit table to that database:
   ```sh
   npx wrangler d1 execute euro5-project-memory --remote --file migrations/0002_login_limits.sql --config wrangler.protected.jsonc
   ```
   The existing `0001_project_memory.sql` is already applied. Do not replay it blindly.
4. Build the protected frontend:
   ```sh
   node scripts/build-protected.mjs
   ```
   `protected-public` contains only an explicit list of frontend files and a same-origin API configuration. `assets.run_worker_first=true` ensures authentication happens before serving any asset. `access-worker.js` is the deployment entry point, not `worker.js`.
5. Deploy the separate test Worker:
   ```sh
   npx wrangler deploy --config wrangler.protected.jsonc
   ```
   Until its session secret is configured the Worker returns 503. Its URL is printed by Wrangler; use that actual URL below.
6. Import the delivered private settings JSON as Worker secrets:
   ```sh
   npx wrangler secret bulk /absolute/path/to/euro5-private-secrets.json --config wrangler.protected.jsonc
   ```
   The `TENDER_AI` service binding calls the existing `euro5-tender-bid-assistant` Worker internally. Its existing AI URL, model and encrypted API key stay there; do not copy, reveal, replace or recreate them. No `AI_API_KEY`, `AI_API_URL` or `AI_MODEL` is needed on the new gateway for tender analysis. This internal binding is declared in `wrangler.protected.jsonc` and is created by deployment. Authentication and same-origin POST checks run before every forwarded request. Memory remains local to the protected gateway and retains its authenticated author ID. No browser cookies or Access assertions are forwarded to the analysis backend.
7. Run the admin-email setup below. The shared test login can operate independently; the administrator's email login fails closed until Access is configured.

## Administrator's email OTP

In Cloudflare Zero Trust, create a **Self-hosted Access application** for the actual new Worker's hostname and **only the `/admin-login` path**. Do not put the whole Worker behind that policy: shared password users use the application session rather than Access.

- Enable **One-time PIN** as the login method.
- Add an **Allow** policy with **Include → Emails → the administrator's exact email** from the private settings. Do not use Everyone, Bypass, an entire public email domain or a service token.
- Set the Access application session to one hour for testing.
- Copy the team's issuer (`https://<team>.cloudflareaccess.com`, no trailing slash) to Worker variable `ACCESS_TEAM_DOMAIN`.
- Copy this application's audience tag to Worker variable `ACCESS_AUD`.
- Protect `/admin-login` on every exposed hostname; remove unnecessary alternate hostnames/previews. The gateway independently verifies the assertion, so an unprotected alias cannot mint an administrator session without a valid signed assertion for this application.

Users visit `/login`. Shared testers enter the provided password. The administrator clicks the individual email-login link and receives a code via Cloudflare. The application does not send email itself or store Microsoft passwords.

## Verification and public shutdown

Before inviting testers, verify in separate browser profiles:

- An unauthenticated visitor cannot fetch the tool, JavaScript assets, `/session`, `/tender-check`, `/buyer-history` or `/memory/*` data.
- Two testers can sign in concurrently. `/session` reports `test-team`, role `editor`. Both see the shared company memory; neither can change the company profile.
- The administrator signs in via the approved mailbox and `/session` reports `sergii`, role `admin`. An unapproved email is denied.
- Analysis automatically reads hints and saves its current snapshot without a key, connection button or manual note.
- Logout clears the browser's application cookie. The shared session expires after eight hours; individual application sessions expire after one hour. Individual login may reuse the remaining Cloudflare Access session.
- A signed-out or expired session cannot call the API even when the endpoint URL is known.

Only after these tests pass:

1. Disable the existing GitHub Pages publication and distribute only the protected test URL.
2. Disable all of the original `euro5-tender-bid-assistant` Worker's public domains/routes and preview/version URLs while keeping the Worker itself, its existing AI settings and service bindings intact. `TENDER_AI` continues to invoke it internally. **Do not set `MEMORY_AUTH_MODE=session` on that backend**: its default HTTP fetch handler is now called by the service binding without a browser actor. Doing so would block internal analysis as well. If an old version of this guide was followed and that variable was set, remove it from the backend. The protected gateway remains in session mode. Before disabling the original URL, check for other tools that still rely on it and move those calls to authenticated/internal paths. Keep its current manual deployment approach, or persist `workers_dev:false` and disabled previews in its own deployment configuration if it later becomes managed by Wrangler. Do not deploy `wrangler.protected.jsonc` to the old backend or delete the Worker.
3. Remove the legacy `MEMORY_USERS` secret from the retired public deployment after verifying it is no longer needed.

The public Git repository still exposes the published source code and any data previously committed to it. Login protects runtime access and D1, not repository contents. Review/remove confidential repository content separately; no credentials should be committed at any stage.

## Add individual users and retire the shared profile

For each approved email, add an Access Allow email entry and a new `ACCESS_USERS` object with a stable internal ID and the required `reader` or `editor` role. Use the same `company: euro5` for the shared department memory. No self-registration is enabled.

To transition from OTP to Microsoft, add the Microsoft identity provider in Access, retain the email-to-profile mapping where the verified email remains the same, and keep each internal ID. If the verified email changes, update the mapping explicitly before switching. Existing actor IDs and company memory remain unchanged. Shared historical records remain attributed to `test-team`; their original individual authors cannot be reconstructed.

Set `TEST_LOGIN_ENABLED=0` to disable both new shared logins and existing shared sessions. Rotating `TEST_PASSWORD_SHA256` also invalidates every shared session. Removing/changing an individual profile invalidates its application sessions; remove its Access policy as well. Rotating `SESSION_SECRET` invalidates all application sessions. Logout clears the current browser cookie; it is not a per-session server-side revocation list.

## Checks completed locally

`test-protected-auth.mjs` verifies signed RSA Access assertions, shared sessions in parallel, role isolation, cookie forgery, origin/CSRF checks, password attempts limited atomically in shared SQLite/D1, revocation and actual Worker route integration. `test-memory-ui.mjs` verifies automatic connection, capture, escaped reports and stale-response cancellation. Existing project-memory, automatic-memory, buyer-history recovery, competition and model-version checks pass. Live Cloudflare configuration and real email delivery require the deployment verification above.

References:
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- https://developers.cloudflare.com/workers/static-assets/binding/
