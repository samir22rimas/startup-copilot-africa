# Anza

**Your AI Co-Founder for Building Businesses in Africa**

Built with ❤️ using **Next.js**, **TypeScript**, **Supabase**, **OpenAI GPT-5.6**, **OpenAI Codex**, and **Vercel**.

---

## Overview

Anza is an AI-powered platform that helps African entrepreneurs transform innovative ideas into validated businesses.

Many founders across Africa have promising ideas but lack access to affordable mentorship, market research, and business expertise. Anza bridges this gap by acting as an AI co-founder that guides entrepreneurs through every stage of their startup journey—from idea validation to business planning, market analysis, financial estimation, funding preparation, and growth strategy.

Our mission is to democratize startup support and empower the next generation of African innovators.

---

# Key Features

### 🤖 AI Business Interview

An intelligent conversational assistant asks entrepreneurs targeted questions to understand their startup idea, target market, budget, and business goals.

### 📊 AI Business Plan Generator

Automatically generates:

- Executive Summary
- Business Model Canvas
- SWOT Analysis
- Market Analysis
- Competitor Analysis
- Financial Projections
- Marketing Strategy
- Launch Roadmap

### 💡 AI Startup Copilot

A contextual AI advisor that continuously provides personalized recommendations to help founders make better business decisions.

### 📈 Business Dashboard

A centralized dashboard that includes:

- Business Health Score
- AI Recommendations
- Generated Documents
- Startup Progress Tracking
- Funding Readiness

### 🌍 African Market Focus

Unlike generic AI assistants, Anza is designed specifically for African entrepreneurs by considering:

- African markets
- Local business environments
- Regional opportunities
- African currencies
- Startup ecosystems across the continent

---

# How It Works

1. Create a startup project.
2. Complete the AI business interview.
3. AI analyzes the startup idea.
4. Generate business documents and strategic insights.
5. Receive personalized recommendations and action plans.
6. Continuously improve the business using the AI Copilot.

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Next.js Server Actions
- Next.js API Routes
- OpenAI API

## Database

- Supabase
- PostgreSQL

## Authentication

- Supabase Authentication

## AI

- OpenAI GPT-5.6
- Structured Outputs
- Prompt Engineering
- AI-powered Workflows

## Deployment

- Vercel

---

# Architecture

```text
                User
                  │
                  ▼
        Next.js Web Application
                  │
                  ▼
          Authentication Layer
                  │
                  ▼
           AI Business Engine
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  OpenAI GPT-5.6      Supabase Database
        │                   │
        └─────────┬─────────┘
                  ▼
         Business Dashboard
```

The application follows a modular architecture composed of:

- Authentication Module
- Business Module
- AI Module
- Document Generation Module
- Dashboard Module
- Funding Module

---

# Installation

Clone the repository.

```bash
git clone https://github.com/YOUR_USERNAME/startup-copilot-africa.git
```

Navigate into the project.

```bash
cd anza
```

Install dependencies.

```bash
npm install
```

Create a `.env.local` file from the template and fill it in.

```bash
cp .env.example .env.local
```

Apply the database schema to your Supabase project (see `supabase/README.md`).

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Run the development server.

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Environment Variables

| Variable                             | Description                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL             | Supabase project URL                                                        |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase public (publishable / anon) key                                    |
| SUPABASE_SERVICE_ROLE_KEY            | Server-only Supabase key. Bypasses row-level security — never expose it     |
| NEXT_PUBLIC_SITE_URL                 | Public origin of the app, used in auth emails and invitation links          |
| ADMIN_EMAILS                         | Comma-separated emails allowed into `/admin`. Server-only                   |
| GEMINI_API_KEY                       | Primary AI provider                                                         |
| GROQ_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY | Optional fallback providers, tried in that order                |

---

# Anza 2.0

Anza 2.0 turns the original idea-to-plan tool into a workspace for the whole journey:

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
| **Overview** | Explainable business health, next actions, risks and activity |

English and French. Roles: Owner, Administrator, Editor, Advisor, Viewer. Plans: Free, Pro, Team.

Architecture and design decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```bash
npm test            # unit tests
npm run typecheck   # TypeScript
npm run test:db     # database isolation tests (DATABASE_URL = a disposable database)
```

---

# Team Collaboration

Founders rarely build alone. From **Dashboard → Team** the owner can:

- **Invite co-founders, team members and advisors** by email. Each invitation is a private link (copy it, or share by WhatsApp or email) that only the person signed in with the invited, verified email address can accept.
- **Manage roles** — Owner, Administrator, Editor, Advisor (read and comment), Viewer (read only) — and remove people.
- **Chat with the team in real time**, in a General channel and one channel per project: replies, emoji reactions, @mentions, unread badges, who is online and typing, search across channels, and turning any message into a task. Viewers can read but not post.
- **Bring the AI Copilot into the conversation** by starting a message with `@copilot`; its answer is posted for the whole team.

Everyone on the team shares the same workspace: plans, documents, marketing, analytics, funding and legal.

---

# Security

- **Row-level security on every table.** Access to a startup's data comes only from team membership, enforced in Postgres — not just in application code.
- **No privilege escalation.** Membership can only be gained by accepting an invitation; ownership cannot be transferred or taken through the API; co-founder admins cannot promote themselves or remove the owner.
- **Server-controlled plans.** The plan tier lives in Supabase `app_metadata` (writable only with the service role) and every AI call is checked against a per-minute limit and the plan's monthly allowance.
- **Hardened HTTP headers.** Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a locked-down permissions policy on every response.
- **Validated input everywhere.** Server actions validate ids, lengths and formats; uploads are verified by file signature, not by name or browser-reported type; redirects after sign-in only go to known in-app paths.
- **Admin portal** restricted to verified emails in the server-only `ADMIN_EMAILS` variable.

---

# Deployment Checklist

1. Create a **separate Supabase project for production** and run `supabase db push`.
2. In Supabase → Authentication: keep **Confirm email** enabled, set the **Site URL** to your domain, and add `https://<your-domain>/auth/callback**` to the redirect URLs.
3. In Supabase → Database → Replication, confirm `team_messages` is in the `supabase_realtime` publication (the migration adds it) so team chat updates live.
4. Set every variable from `.env.example` in your host (Vercel → Settings → Environment Variables), including `ADMIN_EMAILS` and `NEXT_PUBLIC_SITE_URL`.
5. Set spending limits in each AI provider's dashboard.
6. Deploy, then sign up, create a startup, invite a second account and exchange a message in Team chat.

---

# Project Structure

```text
src/
│
├── app/
├── actions/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── types/
├── utils/
└── styles/
```

Each module has a clear responsibility, making the project scalable and maintainable.

---

# How We Used OpenAI Codex & GPT-5.6

Anza was developed with extensive support from **OpenAI Codex** and **GPT-5.6**, both during development and as core components of the application.

## OpenAI Codex

Codex accelerated development by helping us:

- Generate reusable Next.js and React components.
- Develop Server Actions and API routes.
- Debug TypeScript and Supabase integration issues.
- Refactor backend logic.
- Improve project architecture.
- Resolve deployment issues on Vercel.
- Speed up implementation while maintaining code quality.

## GPT-5.6

GPT-5.6 contributed in two ways.

### During Development

We used GPT-5.6 to:

- Brainstorm product features.
- Improve application architecture.
- Design AI prompts.
- Write technical documentation.
- Prepare the hackathon presentation.
- Improve user experience.
- Assist with debugging and technical decisions.

### Inside Anza

GPT-5.6 powers the AI assistant that enables entrepreneurs to:

- Validate startup ideas.
- Generate complete business plans.
- Analyze market opportunities.
- Build Business Model Canvases.
- Identify startup risks.
- Recommend revenue models.
- Generate financial projections.
- Create personalized growth roadmaps.
- Prepare funding strategies.
- Receive contextual AI business advice tailored for African startups.

---

# Future Roadmap

Upcoming features include:

- AI Pitch Deck Generator
- Investor Matching
- Grant Recommendation Engine
- Team Collaboration
- Startup KPI Dashboard
- Financial Forecasting
- Business Document Export
- Offline Support
- Mobile Application
- Integration with African payment providers
- Multi-language support (English, French, Portuguese, Swahili)

---

# Demo

Live Demo:

```
https://startup-copilot-africa.vercel.app/
```

Demo Video:

```
https://youtu.be/zLvNpmTIBJM
```

---

# Impact

Anza aims to democratize entrepreneurship across Africa by making high-quality startup guidance accessible to anyone with an idea.

By combining artificial intelligence with localized business knowledge, we help founders move from inspiration to execution faster and more confidently.

---

# Built With

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- OpenAI API
- OpenAI GPT-5.6
- OpenAI Codex
- Supabase
- PostgreSQL
- Vercel

---

# License

This project was developed as part of the **OpenAI Hackathon 2026**.
