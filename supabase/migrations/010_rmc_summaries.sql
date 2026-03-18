-- Migration 010 — Summaries
CREATE TABLE IF NOT EXISTS rmc_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_resume_id UUID NOT NULL REFERENCES rmc_source_resumes(id) ON DELETE CASCADE,
  company_id UUID REFERENCES rmc_companies(id) ON DELETE SET NULL,
  job_title TEXT,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rmc_summaries_resume_id ON rmc_summaries(source_resume_id);
CREATE INDEX IF NOT EXISTS idx_rmc_summaries_company_id ON rmc_summaries(company_id);
