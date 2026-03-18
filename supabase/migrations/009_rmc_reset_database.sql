-- Migration 009 — Database Reset RPC
-- This function allows for a hard reset of the application state
-- by truncating the parent tables. CASCADE ensures all child tables
-- (staging, claims, credentials, resume_skills) are also cleared.

CREATE OR REPLACE FUNCTION rmc_reset_database()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the creator (postgres)
AS $$
BEGIN
  -- Truncate parent tables
  TRUNCATE TABLE 
    rmc_source_resumes,
    rmc_companies,
    rmc_skills,
    rmc_education_credentials,
    rmc_summaries
  CASCADE;
END;
$$;
