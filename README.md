# 📄 Backgrndy

> An AI-powered resume parser and enrichment pipeline that extracts, deduplicates, and structures data into atomic claims using Next.js, Supabase, and Google Gemini.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?logo=google)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

Backgrndy ingests documents, extracts bullet points, normalizes the data, deduplicates entries using hash-based logic, and leverages AI to enrich and classify atomic claims into a structured dataset.

## ✨ Features
- **Gemini-Powered Parsing:** No rule-based section detection. Gemini 3 Flash reads raw resumes and extracts structured JSON for Experience, Skills, Education, and Credentials.
- **Normalized Data Model:** Companies, entries, and skills are stored in deduplicated tables with full provenance back to source documents.
- **Interactive Enrichment Agent:** STAR-ordered conversation (Situation, Task, Action, Result) helps produce high-impact resume bullets with quantified metrics.
- **Context-Aware Suggestions:** The agent uses your existing skills and job titles as silent context for precise rewrites.
- **Modular Architecture:** Core parsing and staging logic is exposed as a standalone module for integration into other Next.js apps.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Supabase Project (safe alongside other apps via `rmc_` table prefix)
- Google Gemini API Key

### Setup

1. **Clone & Configure**
   ```bash
   cp .env.local.example .env.local
   ```
   Add your credentials to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
   - `GEMINI_API_KEY` — Google Gemini API key

2. **Database Migrations**
   Initialize your Supabase tables. You can use the CLI or run the files in `supabase/migrations/` in order via your Supabase SQL Editor:
   ```bash
   npx supabase db push
   ```

3. **Start Development Server**
   ```bash
   make dev
   ```
   The application will be available at `http://localhost:3000`.

## 🛠️ Docker Commands

We use a `Makefile` to simplify Docker operations:
- `make dev` — Start with hot reload for development
- `make build` — Build production container
- `make test` — Run unit tests
- `make down` — Stop and remove containers
- `docker compose up --build` — Standard Docker command to build and start

## 💻 Usage

1. **Upload:** Navigate to `/upload` and drop your PDF, DOCX, or CSV files.
2. **Enrich:** Go to `/enrich` to review the extracted bullet points and trigger AI enrichment via the interactive agent.
3. **Library:** Browse your full dataset of atomic experience claims and skills in the Library view.

## 📁 Project Structure

```text
backgrndy/
├── app/                     # Next.js 14 App Router
│   ├── (shell)/             # Main UI pages (Upload, Enrich, Library)
│   └── api/                 # Ingestion & Enrichment endpoints
├── lib/
│   ├── parsers/             # PDF, DOCX, CSV parsers
│   ├── gemini-parse/        # Gemini-specific parsing logic
│   ├── dedup/               # Hash-based dedup logic
│   └── ai/                  # AI provider abstraction
├── components/              # UI components (Shell, Enrich, Upload)
├── supabase/
│   └── migrations/          # SQL database schemas
└── Makefile
```
