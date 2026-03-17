# ResumeMuncher
AI-powered resume parsing and experience enrichment tool. Upload your tailored resumes in PDF, DOCX, or CSV format — Gemini 3 Flash extracts and classifies every experience entry, skill, education record, and credential into a structured Supabase database.
An interactive AI agent then works through your experience entries one at a time, helping you produce strong, properly sized resume bullets with quantified metrics, tech stack, and scope — following STAR order (Situation, Task, Action, Result). The agent asks focused questions rather than open-ended ones, never invents information, and targets a one-line output sized for a standard resume.
The resulting dataset of atomic experience claims can be used to generate highly accurate, tailored resumes on demand.

## Features

Gemini-powered parsing — no rule-based section detection. Gemini 3 Flash reads the raw resume and returns structured JSON with four categories: Experience, Skills, Education, and Credentials
Normalized data model — companies, experience entries, skills, education, and credentials stored in separate deduplicated tables with full provenance back to source resumes
Interactive enrichment agent — STAR-ordered conversation, opens with an example rewrite, asks one question at a time, enforces 110–125 character output for one-line resume fit
Context-aware suggestions — agent uses your existing skills list and job titles as silent context when making suggestions
Library view — browse and edit all extracted experience claims, skills tag cloud, and education/credentials grouped by type
Modular — core parsing and staging logic exposed as a standalone module importable into other Next.js applications

## Stack

Next.js 14 App Router
Supabase (shared project — safe alongside other apps via rmc_ table prefix)
Gemini 3 Flash
Tailwind CSS, lucide-react
Docker-first, runs locally or on AWS

## Prerequisites

- Docker and Docker Compose
- Supabase project
- Gemini API key

## Setup

1. **Clone the repository**

2. **Copy environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Fill in your credentials** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
   - `GEMINI_API_KEY` — Google Gemini API key

4. **Run database migrations**
   
   Option A - Supabase CLI:
   ```bash
   npx supabase db push
   ```
   
   Option B - SQL Editor:
   1. Go to your Supabase project's SQL Editor
   2. Run the SQL files in `supabase/migrations/` in order:
      - `001_rm_source_resumes.sql`
      - `002_rm_bullets_staging.sql`
      - `003_rm_claims.sql`
      - `004_rm_skills_intros.sql`

5. **Start the development server**
   ```bash
   make dev
   ```

   The app will be available at `http://localhost:3000`

## Docker Commands

- `make dev` — Start with hot reload (development)
- `make build` — Build production container
- `make test` — Run unit tests
- `make down` — Stop containers
- `docker compose up --build` — Build and start production container

## Project Structure

```
resumemuncher/
├── app/                     # Next.js 14 App Router
│   ├── api/
│   │   ├── ingest/          # File upload + parse endpoints
│   │   └── enrich/          # AI enrichment endpoints
│   ├── upload/              # Upload UI page
│   └── enrich/              # Enrichment agent UI page
├── lib/
│   ├── parsers/             # PDF, DOCX, CSV parsers
│   ├── normalizer/          # Bullet → structured record logic
│   ├── dedup/               # Hash-based dedup logic
│   ├── supabase/            # Supabase client
│   ├── ai/                  # Swappable AI provider
│   └── config.ts            # Environment validation
├── supabase/
│   └── migrations/           # SQL migration files
└── Makefile
```

## Usage

1. **Upload resumes** — Go to `/upload` and drag & drop PDF, DOCX, or CSV files
2. **Enrich bullets** — Go to `/enrich` to review and enrich extracted bullet points with AI
3. **Export claims** — Enriched atomic claims are stored in the `rm_claims` table
