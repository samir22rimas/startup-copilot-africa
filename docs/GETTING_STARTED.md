# Getting started

This guide takes a new engineer from an empty machine to a running copy of Anza.

## 1. What you need

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22 (see `.nvmrc`) | `node -v` to check |
| npm | comes with Node | The repository uses `package-lock.json`; use npm, not yarn or pnpm |
| Git | any recent | |
| A Supabase project | free tier is enough | Use a **separate** project for development and for production |
| An AI provider key | at least one | Gemini is the primary provider; Groq, DeepSeek and OpenAI are fallbacks |
| PostgreSQL client (`psql`) | optional | Only needed to run the database security tests |

## 2. Install

```bash
git clone https://github.com/samir22rimas/startup-copilot-africa.git
cd startup-copilot-africa
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`. It is ignored by Git; never commit real values.

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page → publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → `service_role` key. Server only |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local development |
| `ADMIN_EMAILS` | Your own email, so you can open `/admin` |
| `GEMINI_API_KEY` | Google AI Studio |
| `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` | Optional fallbacks |

A variable that starts with `NEXT_PUBLIC_` is sent to the browser. Never put a secret in one.

## 4. Create the database

The schema lives in `supabase/migrations/` and is applied with the Supabase CLI.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>   # the id in your Supabase project URL
npx supabase db push
```

`db push` applies every migration that the project does not have yet, in file-name order. All migrations are safe to run more than once.

If you cannot use the CLI, open Supabase → SQL Editor and run each file in `supabase/migrations/` in file-name order.

More detail: [DATABASE.md](DATABASE.md).

## 5. Configure Supabase Auth

In the Supabase dashboard, under **Authentication**:

1. **URL Configuration → Site URL**: `http://localhost:3000`.
2. **URL Configuration → Redirect URLs**: add `http://localhost:3000/**`.
3. **Sign In / Providers → Email**: keep **Confirm email** enabled. Team invitations and the admin allow-list rely on verified emails.
4. **Google sign-in (optional)**: enable the Google provider and paste a Google OAuth client id and secret. In Google Cloud, the authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.

Supabase's built-in email service only sends a few emails per hour. That is enough for development; production needs custom SMTP. See [AUTHENTICATION.md](AUTHENTICATION.md).

## 6. Run

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, confirm your email, and follow the onboarding to create your first business.

To open the admin portal, sign in with an email listed in `ADMIN_EMAILS` and go to `/admin`.

## 7. Check your setup

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # unit tests
npm run build       # production build
```

All four should pass on a clean checkout. `GET /api/health` returns `{"status":"ok"}` when the required variables are set.

## 8. Things that will surprise you

- **This is Next.js 16.** Several conventions differ from older versions: middleware is `src/proxy.ts`, error boundaries receive `unstable_retry`, and more. Read the matching guide in `node_modules/next/dist/docs/` before using an API from memory.
- **Builds use webpack** (`next build --webpack`), not Turbopack, because `pptxgenjs` needs a webpack-only workaround in `next.config.ts`.
- **A hidden TypeScript error can look like a build crash.** On machines where the native Next.js compiler cannot load and the WebAssembly fallback is used, a type error during `next build` appears as `Error: invalid type: unit value, expected usize`. Run `npm run typecheck` to see the real error.
- **Pages show a "setup required" notice** when the Anza 2.0 migrations are missing from the database. Apply the migrations.
- **The active business and project are stored in cookies.** Switching business in one tab changes it in the others after a reload.
- **React resets uncontrolled form fields after a server action.** Use controlled inputs when a form must keep its values after a failed submit (see the auth forms).

## 9. Where to go next

- How the code is organised: [ARCHITECTURE.md](ARCHITECTURE.md)
- How to add a feature and open a pull request: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- Every server action: [API_REFERENCE.md](API_REFERENCE.md)
