-- Migration 008 — Link skills to job titles per resume
CREATE TABLE IF NOT EXISTS rmc_resume_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES rmc_source_resumes(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES rmc_skills(id) ON DELETE CASCADE,
  job_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rmc_resume_skills_resume_id ON rmc_resume_skills(resume_id);
CREATE INDEX IF NOT EXISTS idx_rmc_resume_skills_skill_id ON rmc_resume_skills(skill_id);
