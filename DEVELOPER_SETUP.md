# Chatbot API — Developer Setup

This guide takes a new developer from a clean checkout to local development and deployment. `README.md` is the quick reference; this file is the complete handoff guide.

## 1. Prerequisites

Install:

- Node.js 20 or newer (Node.js 22 LTS is recommended)
- npm
- Git
- A Cloudflare account with permission to create Workers, D1, KV, R2, Vectorize, Workers AI, and AI Search resources
- An OpenAI API key

Confirm the tools:

```bash
node --version
npm --version
```

## 2. Install the project

From the repository root:

```bash
npm install
npx wrangler --version
npx wrangler login
npx wrangler whoami
```

Wrangler is installed as a project development dependency, so use `npx wrangler` or the npm scripts rather than requiring a global installation.

## 3. Create your Wrangler configuration

The handoff includes an empty sample rather than the owner's private configuration:

```bash
cp wrangler.example.toml wrangler.toml
```

The copied `wrangler.toml` is ignored by Git. Fill its empty values with resources from the new developer's Cloudflare account.

Create or obtain these resources in the new developer's Cloudflare account:

| Binding | Resource |
| --- | --- |
| `DB` | D1 database |
| `CONFIG` | KV namespace |
| `CACHE` | KV namespace |
| `apogee_public` | R2 bucket for public files |
| `apogee_private` | R2 bucket for private/source files |
| `VECTORIZE` | Vectorize index used by retrieval |
| `AI` | Workers AI binding (no resource ID needed) |

Useful creation commands:

```bash
npx wrangler d1 create chatbot-dev
npx wrangler kv namespace create CONFIG
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create chatbot-public-dev
npx wrangler r2 bucket create chatbot-private-dev
```

Create the Vectorize index with dimensions and metric that match the embedding model used by this application. If an existing index is being transferred, obtain its exact index name instead of creating an incompatible replacement.

Use the following sources for every empty value:

| Configuration value | Where to get it |
| --- | --- |
| `account_id` and `CF_ACCOUNT_ID` | Run `npx wrangler whoami`, then copy the account ID for the selected Cloudflare account. |
| D1 `database_name` and `database_id` | Copy both from the output of `npx wrangler d1 create ...`, or from Workers & Pages → D1 in the Cloudflare dashboard. |
| KV `id` | Copy the namespace ID returned by `npx wrangler kv namespace create ...`. |
| KV `preview_id` | Create a separate development/preview KV namespace and use its ID. It may be the same as `id` only when intentionally sharing data. |
| R2 `bucket_name` | Use the exact bucket name passed to `npx wrangler r2 bucket create ...` or shown in the R2 dashboard. |
| Vectorize `index_name` | Use the exact name of the compatible index created in the Vectorize dashboard/CLI. |
| `CF_AUTORAG_NAME`, `AUTORAG_NAME`, and `CF_AI_SEARCH_WEB_ID` | Copy the AI Search/AutoRAG instance name from the Cloudflare dashboard. |
| `CF_AI_SEARCH_PDFS_ID` | Copy the PDF search instance name if PDF search is enabled; otherwise leave it empty. |
| Production `route` | Use a hostname in a domain configured in the developer's Cloudflare account, for example `api.example.com/*`. |

The remaining non-secret values are documented defaults and feature switches. Adjust assistant text, allowed frontend origins, models, thresholds, and limits for the new environment.

Search for anything still unfinished:

```bash
rg '= ""' wrangler.toml
```

## 4. Configure secrets

Secrets must not be placed in `wrangler.toml`.

For local development, create an untracked `.dev.vars` file in the repository root:

```dotenv
OPENAI_API_KEY=replace-with-your-openai-key
CF_AI_SEARCH_TOKEN=replace-with-your-cloudflare-api-token
CF_SEARCH_AI_API_TOKEN=replace-with-your-cloudflare-api-token
ADMIN_API_KEY=replace-with-a-long-random-value
JWT_SECRET=replace-with-a-long-random-signing-secret
```

The two Cloudflare token variables can contain the same token when the current compatibility alias is needed. Give that token only the permissions required to query the configured AI Search resource.

For the deployed default environment, set each value interactively:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CF_AI_SEARCH_TOKEN
npx wrangler secret put CF_SEARCH_AI_API_TOKEN
npx wrangler secret put ADMIN_API_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret list
```

For production, append `--env production` to every secret command:

```bash
npx wrangler secret put OPENAI_API_KEY --env production
```

Never paste real values into commands, documentation, source files, tickets, or chat messages. Wrangler will prompt securely for the value.

## 5. Initialize D1

The SQL files in `migrations/` define the application tables. Apply them to the local D1 database in a controlled order:

```bash
npx wrangler d1 execute chatbot-dev --local --file=migrations/auth.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/files.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/chunks.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/threads.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/messages.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/message_traces.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/logs.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/ingest_jobs.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/ingest_events.sql
npx wrangler d1 execute chatbot-dev --local --file=migrations/upload_progress.sql
```

Replace `chatbot-dev` if a different `database_name` was chosen. Inspect the SQL and resolve any ordering or existing-table conflicts before applying it to a shared remote database. To target the real Cloudflare D1 database, change `--local` to `--remote` only after confirming the account and database.

## 6. Run locally

```bash
npm run dev
```

The default URL is `http://localhost:8787`. Verify:

```bash
curl http://localhost:8787/healthz
```

A successful response contains `"ok": true`. Some chatbot and ingestion routes need real remote AI/Search resources even when the Worker is running locally.

If the frontend runs on another origin, update `ALLOWED_ORIGINS` in `wrangler.toml` with a comma-separated list. Do not use `*` in production unless public cross-origin access is intentional.

## 7. Validate changes

```bash
npm test -- --run
npm run cf-typegen
npx tsc --noEmit
npx wrangler deploy --dry-run
```

After type generation, review the generated files before committing them. Do not commit `.dev.vars` or any file containing secrets.

## 8. Deploy

Validate identity and configuration first:

```bash
npx wrangler whoami
npx wrangler deploy --dry-run
```

Deploy the default environment:

```bash
npm run deploy
```

Deploy production only after separate production bindings and secrets have been added under `env.production`:

```bash
npx wrangler deploy --env production
```

View deployed logs:

```bash
npx wrangler tail
npx wrangler tail --env production
```

## 9. Project map

- `src/index.ts` — Hono app, CORS, middleware, health check, and top-level error handling
- `src/v1/routes/` — API route registration
- `src/v1/controllers/` — request handlers
- `src/v1/services/` — OpenAI, search, storage, database, and retrieval services
- `src/v1/pipeline/` — ask pipeline stages
- `src/v1/prompts/` — model prompts
- `src/v1/types/env.ts` — expected Worker bindings and environment values
- `migrations/` — D1 table SQL
- `wrangler.example.toml` — shareable configuration template with empty account/resource values
- `wrangler.toml` — private local configuration created from the example; excluded from the handoff and Git

## 10. Common problems

- **Invalid binding or resource not found:** an empty/incorrect value remains in `wrangler.toml`, or Wrangler is logged into the wrong account.
- **Missing secret:** create `.dev.vars` locally or run `wrangler secret put` for the deployed environment.
- **D1 table not found:** apply the SQL files to the same local/remote database the Worker uses.
- **CORS failure:** add the exact frontend origin to `ALLOWED_ORIGINS`.
- **AI Search failure:** verify the account ID, instance name, token permissions, and token secret.
- **Vector search mismatch:** confirm the index dimensions and distance metric match the embedding model.

## Handoff security checklist

- Share `wrangler.example.toml`, not the owner's `wrangler.toml`.
- Confirm the new developer's `wrangler.toml` contains no secret values.
- Confirm `.dev.vars` is excluded from the shared archive/commit.
- Give the developer least-privilege Cloudflare access.
- Use separate development and production resources.
- Run the health check, tests, type check, and deployment dry run before the first deployment.
