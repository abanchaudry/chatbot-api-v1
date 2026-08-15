# Chatbot Admin v1

Angular admin panel for managing RAG assistant knowledge, conversations, and analytics.

## Technology

- Angular 15
- TypeScript 4.9
- Angular Material 15
- RxJS 7

## Prerequisites

- Node.js 18
- npm 10 or later
- Chatbot API running at `http://localhost:8787`

Confirm your installed versions:

```bash
node --version
npm --version
```

## Installation

Clone and enter the repository:

```bash
git clone https://github.com/abanchaudry/chatbot-admin-v1.git
cd chatbot-admin-v1
```

Install dependencies:

```bash
npm install
```

## Local configuration

The default configuration is located at `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  tenant: "chatbot-admin",
  appName: "Chatbot Admin",
  api_url: "http://localhost:8787/",
  admin_api_key: "replace-with-local-api-key",
  token_label: "__chatbot_admin_auth",
};
```

Replace the placeholder API key with a valid local development value when required. Do not commit real credentials. Values compiled into an Angular application are visible to browser users and must never be treated as secure secrets.

The backend must allow requests from `http://localhost:4200` in its CORS configuration.

## Run locally

1. Start the API on `http://localhost:8787`.
2. Start the admin panel:

   ```bash
   npm start
   ```

3. Open `http://localhost:4200`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Angular development server |
| `npm run build` | Create a build in `dist/` |
| `npm test` | Run unit tests |
| `npm run lint` | Run lint checks |
| `npm run e2e` | Run end-to-end tests |

## Production build

Create the build:

```bash
npm run build
```

Deploy the generated `dist/` directory. The included `src/_redirects` file provides SPA fallback routing for compatible static hosts.

Configure the correct production API URL as part of the deployment process. Never commit production credentials to this repository.

## Publish to GitHub

For the initial repository push:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/abanchaudry/chatbot-admin-v1.git
git push -u origin main
```

The `.gitignore` excludes dependencies, Angular build output, caches, logs, local environment overrides, and editor files.

## Troubleshooting

- **API requests fail:** confirm the API is available at `http://localhost:8787/` and check its CORS configuration.
- **Unauthorized response:** provide a valid local `admin_api_key`.
- **Port 4200 is occupied:** use `npm start -- --port 4201` and allow that origin in the backend.
- **Installation or build errors:** use Node.js 18, remove `node_modules`, and run `npm install` again.
