# ЄВРО5 — Пошук товарних категорій

Frontend: `https://ukrsedo.github.io/euro5-tender-bid-assistant/category-discovery/`.

Backend: existing `euro5-tender-bid-assistant` Worker, prefix `/category-discovery`.

Deploy `worker/index.js` to that existing Worker. This bundle retains the V10 `/tender-check` and `/health` handlers and adds `/category-discovery/api/bi`, `/category-discovery/api/ai/status`, `/category-discovery/api/ai/analyze`.

Existing environment bindings are reused verbatim: `AI_API_URL`, `AI_API_KEY` (secret), `AI_MODEL`. No key, endpoint or model is hardcoded. Chat Completions and Responses response formats are supported. Status is ready only when all three variables are configured. Do not create another Worker to reuse a worker-local secret.

The base fuel handler was sourced from the saved EURO5_Worker_V10_READY.zip. Verify it matches the currently deployed Worker before replacing the live script.

No source includes secret values. AI classifications require user confirmation; numeric metrics are calculated from source contracts. AI drafts and confirmed subgroups last for the current browser session. Recommendations use up to 30 highest-ranking categories.
