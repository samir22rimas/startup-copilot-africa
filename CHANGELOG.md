# Changelog

All notable changes to Anza are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Error pages for unexpected errors (`error.tsx`, `dashboard/error.tsx`, `global-error.tsx`) with a reference code that matches the server logs, and a 404 page.
- `robots.txt` and `sitemap.xml`, excluding private areas.
- `GET /api/health` for uptime monitoring.
- `/auth/confirm` route for email links that work on any device.
- "Resend confirmation email" on the sign-in page; show/hide password toggles.
- Full documentation set in `docs/`, plus `CONTRIBUTING.md`, `SECURITY.md` and a CI workflow.

### Changed
- The analytics fallback projection now starts from the founder's tracked numbers with a stated 5% monthly growth, and asks for data instead of inventing figures when none are tracked.
- Changing a password signs out the account's other devices.

### Fixed
- A password-reset link could log the user into the dashboard without asking for a new password when Supabase fell back to the Site URL.
- Expired or already-used email links now explain what happened and offer a new link, instead of a generic error.
- Clear messages for unconfirmed emails, same-as-old and weak passwords, and rate limits.
- Sign-up when email confirmation is disabled now signs the user in instead of asking them to check their email.
- The sign-in form no longer clears what the user typed after a failed attempt.
- Removed a lint error in the brand-colour provider and all unused code reported by the linter.

## [0.1.0] - 2026-11-16

First complete version, built from July to November 2026.

### Added
- Anza 2.0 workspace: Idea Lab, Market Research, Business Validation, Business Model and Lean Canvas, Business Plan (17 sections, versions, PDF/Word export, share links), Financial Planning, Marketing Studio, Projects and Tasks, AI Copilot with specialists and memory, Opportunities catalogue, Overview with explainable health score.
- Funding readiness and pitch deck, analytics with tracked numbers and AI projections, legal and compliance orientation.
- Teams: invitations by verified email, five roles (Owner, Administrator, Editor, Advisor, Viewer), real-time chat with replies, reactions, mentions, unread badges and `@copilot`.
- Plans (Free, Pro, Team) with feature gates, seat and business limits, and monthly AI allowances; unlimited platform administrators.
- Admin portal: users and plans, startups, feedback, opportunities, AI usage, feature switches, usage events, audit trail.
- Company brand colour.
- English and French.
- Document upload with text extraction (PDF, Word, Excel, CSV, text) for AI context.
- AI provider chain: Gemini, Groq, DeepSeek, OpenAI.
- Row-level security on every table and a SQL test suite for it; hardened HTTP headers.

[Unreleased]: https://github.com/samir22rimas/startup-copilot-africa/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/samir22rimas/startup-copilot-africa/releases/tag/v0.1.0
