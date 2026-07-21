# Startup Copilot Africa

## Tagline
Your AI Co-Founder for Building Businesses in Africa.

## Overview
Startup Copilot Africa is an AI-powered platform that helps African entrepreneurs turn business ideas into validated business plans and actionable growth strategies. Many founders have promising ideas but lack access to business expertise, affordable mentorship, and tools adapted to local markets. Startup Copilot Africa closes that gap with an AI co-founder that guides users through idea validation, business planning, market analysis, financial estimation, marketing strategy, and growth roadmaps.

## Key Features

### AI Business Interview
An intelligent conversational assistant asks entrepreneurs targeted questions to understand their idea, market, budget, and goals.

### AI Business Plan Generator
The platform generates executive summaries, business models, SWOT analyses, market analysis, financial projections, and launch roadmaps.

### AI Copilot Assistant
A contextual AI advisor helps entrepreneurs make better decisions and improve their business strategy over time.

### Business Dashboard
The dashboard provides a business health score, recommendations, documents, and progress tracking in one place.

### African Market Focus
The product is designed for African currencies, local entrepreneurship challenges, and regional business environments.

## How It Works

1. User creates a business project.
2. User answers AI interview questions.
3. AI analyzes the information.
4. AI generates business documents.
5. Entrepreneur receives recommendations and action plans.

## Technology Stack

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- Next.js API Routes
- OpenAI API

Database:
- Supabase

Deployment:
- Vercel

AI:
- OpenAI GPT-5.6
- Structured Outputs
- AI-powered workflows

## Architecture

User
↓
Next.js Application
↓
OpenAI API
↓
AI Processing
↓
Supabase Database
↓
Business Dashboard

The architecture is modular and organized around:
- Authentication module
- Business module
- AI module
- Document generation module
- Dashboard module

## Installation

Clone the repository, install dependencies, configure environment variables, and run the app locally.

```bash
npm install
```

Create a .env.local file with:

```bash
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run the development server:

```bash
npm run dev
```

## Environment Variables

- OPENAI_API_KEY: API key for OpenAI-powered business intelligence features.
- NEXT_PUBLIC_SUPABASE_URL: Public URL for the Supabase project.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Public anonymous key for client-side Supabase access.

## Project Structure

```text
src/
  app/
  components/
  features/
  lib/
  services/
  hooks/
  types/
```

Each folder groups the application by responsibility so the product can scale cleanly.
