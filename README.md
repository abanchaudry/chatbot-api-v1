# Chatbot API

A production-oriented retrieval-augmented generation (RAG) API built on Cloudflare Workers. The service combines document ingestion, hybrid retrieval, conversational question answering, authentication, analytics, and request tracing in a single edge-native backend.

## Technology stack

- **Runtime:** Cloudflare Workers
- **API framework:** Hono
- **Data:** Cloudflare D1 and KV
- **File storage:** Cloudflare R2
- **Search:** Cloudflare Vectorize and AI Search
- **AI:** OpenAI, Workers AI, and LangChain
- **Testing:** Vitest with the Cloudflare Workers pool

## Core capabilities

- Retrieval-augmented, streaming chatbot responses
- File ingestion, chunking, enrichment, and indexing
- Vector and AI Search retrieval pipelines
- JWT-based authentication and rate limiting
- Conversation threads and message history
- QA workflows, analytics, and message tracing
- Separate development and production configuration

## Prerequisites

Before starting, install or obtain:

- Node.js 20 or later (Node.js 22 LTS recommended)
- npm
- A Cloudflare account with access to Workers, D1, KV, R2, Vectorize, Workers AI, and AI Search
- An OpenAI API key

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/abanchaudry/chatbot-api-v1.git
cd chatbot-api-v1
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
npx wrangler whoami
```

### 3. Configure Cloudflare resources

Create your local Wrangler configuration from the provided template:

```bash
cp wrangler.example.toml wrangler.toml
```

Update `wrangler.toml` with the identifiers for your D1 database, KV namespaces, R2 buckets, Vectorize index, and AI Search resources. This file is ignored by Git and must not be committed.

### 4. Configure local secrets

Create `.dev.vars` in the project root:

```dotenv
OPENAI_API_KEY=your-openai-api-key
CF_AI_SEARCH_TOKEN=your-cloudflare-api-token
CF_SEARCH_AI_API_TOKEN=your-cloudflare-api-token
ADMIN_API_KEY=your-admin-api-key
JWT_SECRET=your-jwt-signing-secret
```

Never commit `.dev.vars` or place secret values in `wrangler.toml`.

### 5. Initialize the database

Apply the SQL files in `migrations/` to your local D1 database. The complete migration order and resource provisioning instructions are documented in [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md).

### 6. Start the development server

```bash
npm run dev
```

The API is available by default at `http://localhost:8787`. Confirm it is running:

```bash
curl http://localhost:8787/healthz
```

## API overview

| Route group | Purpose |
| --- | --- |
| `GET /healthz` | Service health check |
| `/auth` | Authentication and access management |
| `/thread` | Conversation threads and messages |
| `/data` | File ingestion and data operations |
| `/ask` | RAG question-answering pipeline |
| `/qa` | Quality-assurance operations |
| `/analytics` | Chat and usage analytics |
| `/message-traces` | Request and pipeline diagnostics |

## Project structure

```text
.
├── migrations/             # D1 database schema files
├── src/
│   ├── index.ts            # Worker entry point and Hono application
│   └── v1/
│       ├── controllers/    # HTTP request handlers
│       ├── middleware/     # Authentication and rate limiting
│       ├── pipeline/       # RAG preparation, retrieval, and execution
│       ├── prompts/        # Model prompt templates
│       ├── routes/         # API route definitions
│       ├── services/       # AI, search, storage, and database services
│       ├── types/          # Worker environment types
│       └── utils/          # Retrieval and processing utilities
├── test/                   # Worker integration tests
└── wrangler.example.toml   # Shareable Cloudflare configuration template
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Worker development server |
| `npm test` | Run tests in watch mode |
| `npm test -- --run` | Run the test suite once |
| `npm run cf-typegen` | Generate Cloudflare binding types |
| `npm run deploy` | Deploy the default environment |
| `npx wrangler deploy --env production` | Deploy the production environment |

## Validation

Run the following checks before opening a pull request or deploying:

```bash
npm test -- --run
npx tsc --noEmit
npx wrangler deploy --dry-run
```

## Deployment

Configure deployed secrets interactively so their values are never stored in source control:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CF_AI_SEARCH_TOKEN
npx wrangler secret put CF_SEARCH_AI_API_TOKEN
npx wrangler secret put ADMIN_API_KEY
npx wrangler secret put JWT_SECRET
npm run deploy
```

Append `--env production` to Wrangler commands when configuring or deploying the production environment.

## Security

- Keep `.dev.vars`, `wrangler.toml`, credentials, and resource tokens out of source control.
- Use separate Cloudflare resources for development and production.
- Grant service tokens and team members only the permissions they require.
- Review allowed CORS origins before deployment.
- Rotate secrets immediately if they are exposed.

## Documentation

See [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) for complete Cloudflare resource provisioning, D1 migration order, environment configuration, troubleshooting, and deployment instructions.
