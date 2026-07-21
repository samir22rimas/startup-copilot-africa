# Startup Copilot Africa

**Your AI Co-Founder for Building Businesses in Africa**

Built with ❤️ using **Next.js**, **TypeScript**, **Supabase**, **OpenAI GPT-5.6**, **OpenAI Codex**, and **Vercel**.

---

## Overview

Startup Copilot Africa is an AI-powered platform that helps African entrepreneurs transform innovative ideas into validated businesses.

Many founders across Africa have promising ideas but lack access to affordable mentorship, market research, and business expertise. Startup Copilot Africa bridges this gap by acting as an AI co-founder that guides entrepreneurs through every stage of their startup journey—from idea validation to business planning, market analysis, financial estimation, funding preparation, and growth strategy.

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

Unlike generic AI assistants, Startup Copilot Africa is designed specifically for African entrepreneurs by considering:

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
cd startup-copilot-africa
```

Install dependencies.

```bash
npm install
```

Create a `.env.local` file.

```env
OPENAI_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
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

| Variable | Description |
|-----------|-------------|
| OPENAI_API_KEY | OpenAI API key |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase public anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Server-side Supabase access (if applicable) |

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

Startup Copilot Africa was developed with extensive support from **OpenAI Codex** and **GPT-5.6**, both during development and as core components of the application.

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

### Inside Startup Copilot Africa

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

Startup Copilot Africa aims to democratize entrepreneurship across Africa by making high-quality startup guidance accessible to anyone with an idea.

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

This project was developed as part of the **OpenAI Startup in Africa Hackathon 2026**.