# Anza

**Your AI co-founder for building businesses in Africa.**

Anza guides an entrepreneur through the whole journey of a business: finding an idea, researching the market, validating it with real evidence, writing the business model and plan, planning the finances, running projects with a team, and preparing for funding. It is built for African markets: local currencies, mobile money, OHADA company forms, and English and French.

- Live demo: <https://startup-copilot-africa.vercel.app/>
- Demo video: <https://youtu.be/zLvNpmTIBJM>

---

## Documentation

| Document | What it covers |
| --- | --- |
| [Getting started](docs/GETTING_STARTED.md) | Install, configure and run the app on your machine |
| [Architecture](docs/ARCHITECTURE.md) | How the system is put together and why |
| [Database](docs/DATABASE.md) | Tables, roles, security rules and how to change the schema |
| [Authentication](docs/AUTHENTICATION.md) | Sign-up, sign-in, Google, password reset, and the Supabase settings they need |
| [AI layer](docs/AI.md) | Providers, quotas, truthfulness rules and how to add an AI feature |
| [Server actions and routes](docs/API_REFERENCE.md) | Every server action and HTTP route, by module |
| [Testing](docs/TESTING.md) | What is tested, how to run it, how to add tests |
| [Deployment](docs/DEPLOYMENT.md) | Going to production on Vercel and Supabase |
| [Operations](docs/OPERATIONS.md) | Monitoring, backups, the admin portal, and what to do when something breaks |
| [User guide](docs/USER_GUIDE.md) | What each part of the product does, roles and plans |
| [Launch checklist](docs/LAUNCH_CHECKLIST.md) | What is done and what is still open before a public launch |
| [Contributing](CONTRIBUTING.md) | Branches, commits, code style, pull requests |
| [Security policy](SECURITY.md) | How to report a vulnerability, and the security model |
| [Changelog](CHANGELOG.md) | What changed in each version |

---

## What Anza does

| Area | What it does |
| --- | --- |
| **Idea Lab** | Ideas from your skills, studies or local problems, scored on six visible criteria; save, compare, convert to a business |
| **Market Research** | Ten research topics, with web sources and dates when available and explicit limits when not |
| **Business Validation** | Twelve analyses, an assumptions list, and a log of real interviews, surveys and experiments |
| **Business Model** | Business Model Canvas and Lean Canvas with autosave, versions, AI suggestions and review |
| **Business Plan** | 17 sections you can write, edit and improve one by one; versions, PDF/Word export, share link |
| **Financial Planning** | Start-up costs, projections, break-even, CAC/LTV, runway, seven calculators, live currency conversion |
| **Marketing Studio** | Eleven strategy analyses and a content writer for six formats |
| **Projects & Tasks** | Board, list, milestones, calendar, comments; turn an objective into a plan |
| **AI Copilot** | Six specialists that read your workspace, with memory and click-to-confirm actions |
| **Opportunities** | A curated, verified catalogue with bookmarks and application tracking |
| **Funding, Analytics, Legal** | Funding readiness and pitch deck, tracked numbers with AI projections, legal and compliance orientation |
| **Team** | Invitations, five roles, real-time chat with replies, reactions, mentions and `@copilot` |
| **Overview** | Explainable business health, next actions, risks and activity |
| **Admin portal** | Users, plans, startups, feedback, opportunities catalogue, AI usage, feature switches, audit trail |

English and French. Roles: Owner, Administrator, Editor, Advisor, Viewer. Plans: Free, Pro, Team (no payment provider is connected yet; plans are assigned from the admin portal).

---

## Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, server components, server actions, `proxy.ts`), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui components on Base UI, Framer Motion |
| Database, auth, storage, realtime | Supabase (PostgreSQL with row-level security) |
| AI | Google Gemini first, then Groq, DeepSeek and OpenAI as fallbacks |
| Documents | PDF, Word and PowerPoint export (jsPDF, docx, pptxgenjs); PDF/Word/Excel text extraction |
| Validation and forms | zod, react-hook-form |
| Tests | Vitest (unit), a SQL suite for database security |
| Hosting | Vercel |

---

## Quick start

Requirements: Node.js 22, npm, a Supabase project, and at least one AI provider key.

```bash
git clone https://github.com/samir22rimas/startup-copilot-africa.git
cd startup-copilot-africa
npm install
cp .env.example .env.local      # then fill in the values
npx supabase link --project-ref <project-ref>
npx supabase db push            # applies supabase/migrations
npm run dev                     # http://localhost:3000
```

The full walkthrough, including the Supabase dashboard settings, is in [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md).

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (webpack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output files |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Database security tests. `DATABASE_URL` must point at a **disposable** database |

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase public (publishable / anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only Supabase key. Bypasses row-level security. Never expose it |
| `NEXT_PUBLIC_SITE_URL` | yes in production | Public origin of the app, used in auth emails, invitation links, robots.txt and the sitemap |
| `ADMIN_EMAILS` | for `/admin` | Comma-separated emails allowed into the admin portal. Server-only |
| `GEMINI_API_KEY` | at least one AI key | Primary AI provider |
| `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` | optional | Fallback providers, tried in that order |
| `GEMINI_MODEL`, `GROQ_MODEL`, `DEEPSEEK_MODEL`, `OPENAI_MODEL` | optional | Model overrides |
| `EXCHANGE_RATES_API_URL` | optional | Alternative exchange-rate source |

---

## Project structure

```text
src/
├── app/                  Routes (App Router)
│   ├── actions/          Server actions: the only write path, one file per module
│   ├── admin/            Admin portal pages
│   ├── api/health/       Health check for uptime monitors
│   ├── auth/             Email-link and OAuth handlers (callback, confirm)
│   ├── dashboard/        The signed-in workspace, one folder per module
│   ├── sign-in, sign-up, forgot-password, update-password
│   ├── invite/[id]       Team invitation page
│   ├── share/[token]     Public read-only business plan link
│   └── error.tsx, not-found.tsx, robots.ts, sitemap.ts
├── components/           UI: admin, auth, dashboard (per module), landing, shared, ui
├── features/             Older service modules still used by the interview flow
├── lib/                  Domain logic and infrastructure
│   ├── ai/               The single AI pipeline
│   ├── workspace/        Who is asking, for which business, with which role and plan
│   ├── supabase/         Browser, server and service-role clients
│   ├── finance, health, ideas, reports, export, i18n
│   └── plans.ts, permissions.ts, entitlements.ts, validation.ts ...
├── providers/            Theme and brand-colour providers
└── proxy.ts              Session refresh and route protection (Next.js 16 "proxy")
supabase/
├── migrations/           The database schema, in order
└── tests/                Row-level-security test suite
tests/                    Unit tests
docs/                     Documentation
```

---

## Security in brief

- **Row-level security on every table.** Access to a business's data comes only from team membership, enforced in Postgres.
- **No privilege escalation.** Membership is gained only by accepting an invitation sent to a verified email; ownership cannot be taken through the API.
- **Server-controlled plans and quotas.** The plan lives in Supabase `app_metadata`; every AI call passes a burst limit and a monthly allowance.
- **Hardened HTTP headers** (Content-Security-Policy, HSTS, no framing) on every response.
- **Validated input.** Ids, lengths and formats are checked in server actions; uploads are verified by file signature; post-login redirects only go to known paths.

Details: [SECURITY.md](SECURITY.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Status

Anza is at version 0.1.0 and has not been launched publicly. What is finished and what is still open is tracked in [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).

## Acknowledgements

Anza began as a hackathon project and was built with help from AI coding assistants, including OpenAI Codex and GPT models, for code generation, debugging, architecture and documentation. Inside the product, AI requests go through a provider chain (Gemini, Groq, DeepSeek, OpenAI) described in [docs/AI.md](docs/AI.md).

## Licence

No licence file has been added yet. Until one is, all rights are reserved by the authors. See the note in [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).
