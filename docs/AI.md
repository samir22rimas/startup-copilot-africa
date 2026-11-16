# AI layer

Every AI feature in Anza goes through one pipeline in `src/lib/ai/`. This document explains that pipeline, the rules that keep AI output honest, and how to add a new AI feature.

## 1. The pipeline

```text
server action
   │  runAi(...) or runAiStructured(...)            src/lib/ai/service.ts
   ▼
1. Plan feature gate        Is this feature in the caller's plan?         plans.ts
2. Burst limit              20 requests per 60 seconds per user           rate-limiter.ts
3. Monthly allowance        Free 150, Pro 1,500, Team 5,000 generations   plans.ts
4. Provider fallback        Gemini → Groq → DeepSeek → OpenAI             providers.ts
5. Structured output only   Extract JSON, validate with zod, one repair   json.ts
6. Usage recorded           Tokens, model, duration, outcome → ai_usage   service.ts
```

A call returns either a success (`ok: true` with `text` or validated `data`, the model, the provider and any web sources) or a failure with a code: `feature_locked`, `rate_limited`, `unavailable` or `invalid_output`. Server actions turn these into a message for the user; they never throw to the browser.

## 2. Files

| File | Responsibility |
| --- | --- |
| `service.ts` | `runAi` and `runAiStructured`: the only entry points new code should use |
| `providers.ts` | Talks to each provider. `callModel` tries them in order and returns the first non-empty answer |
| `guard.ts` | `baseSystemPrompt` (truthfulness, security and language rules for every prompt) and `fence()` for untrusted text |
| `context.ts` | Builds the business context for a prompt from one workspace, through the caller's own session |
| `json.ts` | Tolerant JSON extraction from model replies |
| `../ai-providers.ts` | `generateTextWithFallback`: the older entry point, still used by a few pre-2.0 modules (analytics, results, funding, legal) |
| `../rate-limiter.ts` | Burst limit and monthly quota, backed by the `usage_events` table |

## 3. Providers and models

Providers are tried in this order. A provider without an API key is skipped. If one fails or returns nothing, the next is tried; if all fail, the call returns `unavailable`.

| Order | Provider | Key | Default models | Override |
| --- | --- | --- | --- | --- |
| 1 | Google Gemini | `GEMINI_API_KEY` | `gemini-3.8-flash` | `GEMINI_MODEL` |
| 2 | Groq | `GROQ_API_KEY` | `openai/gpt-oss-120b`, then `qwen/qwen3.8-27b`, then `openai/gpt-oss-20b` | `GROQ_MODEL` |
| 3 | DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-chat` | `DEEPSEEK_MODEL`, `AI_BASE_URL` |
| 4 | OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` | `OPENAI_MODEL`, `OPENAI_BASE_URL` |

Only Gemini supports web search grounding (`webSearch: true`). When it is requested, Gemini is tried with search first and returns the real sources it used; every other attempt is ungrounded and returns no sources.

Model names change often. When a provider retires a model, update the default in `providers.ts` or set the override variable; no other code names a model.

## 4. Quotas

- One **generation** is one AI call, whatever its size. Each allowed call inserts a row in `usage_events`.
- The **monthly allowance** comes from the caller's own plan and resets on the 1st of the month (UTC).
- The **burst limit** (20 per minute) stops loops and abuse.
- **Platform admins** have no limits, but their calls are still counted.
- If the quota bookkeeping itself fails (database error), the check **fails open**: the request is allowed. A broken counter should not take the product down. The burst limit still applies.
- Users cannot insert or delete `usage_events` rows; only the service role can, so usage cannot be forged or erased.

Set spending limits in each provider's dashboard as well. The quota limits calls, not money.

## 5. Truthfulness rules

Founders may act on what Anza tells them, so the product must not present guesses as facts. These rules are enforced in code, not only in prompts:

- **Every prompt starts with `baseSystemPrompt`.** It forbids inventing statistics, market sizes, laws, funding programmes, quotes, sources and URLs, and tells the model to say "unknown" when it does not know.
- **Findings are labelled** `verified`, `estimate` or `assumption` (`src/lib/reports/schema.ts`). A report without retrieved web sources cannot contain `verified` findings; `actions/reports.ts` downgrades them.
- **Tracked numbers and projections are separate.** Numbers a founder enters are "Tracked"; AI forecasts are "AI projection" (`src/lib/data-truth.ts`). The fallback analytics projection starts from the tracked numbers and never invents a starting point.
- **Country profiles contain no fees, tax rates or processing times.** A test fails if one is added.
- **Opportunities are never AI-generated.** They are curated by admins with a source and a verification date.
- **Exchange rates come from a real service** or are reported as unavailable.
- **Health scores are sums of signals** computed from workspace data. A dimension without data shows "not enough information".
- **No template content pretending to be AI output.** When document generation fails, the user gets an error, not a generic template.

## 6. Security rules

- **Prompt injection.** Anything a user or a third party wrote (business data, uploaded documents, evidence, web pages) is wrapped with `fence(tag, text)`. The system prompt declares those tags as data only, and `fence` neutralises angle brackets so the text cannot close the tag.
- **One workspace per prompt.** `context.ts` reads through the caller's session, so RLS guarantees that a prompt can only contain data the caller may see.
- **The Copilot cannot change data.** A reply may carry *proposed* actions. An action runs only when a person with edit rights clicks it; the server then re-reads it from the stored message and checks permissions again.
- **Output is validated.** Structured output must pass a zod schema; malformed parts are dropped or the call fails with `invalid_output`.
- **Keys stay on the server.** No AI key has a `NEXT_PUBLIC_` prefix, and no AI call is made from the browser.

## 7. Adding an AI feature

1. Decide the plan feature it belongs to (`FEATURES` in `src/lib/plans.ts`) or add one.
2. In a server action, start with `requireWorkspace("edit")` (or `"view"` for read-only help). It returns `caller`, `locale` and the workspace.
3. Build the prompt:

   ```ts
   const system = baseSystemPrompt({ role: "a market analyst", locale: ws.locale, extra: "…task rules…" })
   const context = await buildBusinessContext(ws)          // src/lib/ai/context.ts
   const messages = [{ role: "user", content: `${context}\n\n${fence("founder_input", userText)}` }]
   ```

4. Call the service with a zod schema when you need structured data:

   ```ts
   const result = await runAiStructured({
     feature: "research.report",     // recorded in ai_usage
     caller: ws.caller,
     gate: "market_research",        // plan feature
     system,
     messages,
     schema: reportSchema,
     shape: REPORT_JSON_SHAPE,       // text description of the JSON, shown to the model
     webSearch: true,                // only if sources matter
   })
   if (!result.ok) return fail(result.error)
   ```

5. Label anything numeric as an estimate or assumption unless it came from the business data or a returned source.
6. Add unit tests for the schema and any post-processing in `tests/`.

Check the exact option names in `service.ts` before copying the snippets above; they illustrate the shape, not a frozen API.

## 8. Watching usage and cost

Admin → **AI Usage** shows calls, tokens, providers and failures from `ai_usage`. Admin → **Usage Events** shows the quota ledger. A sudden rise in `unavailable` outcomes usually means a provider key expired, a model was retired, or a provider spending limit was reached.
