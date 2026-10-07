ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_education_history_array_check,
  ADD CONSTRAINT profiles_education_history_array_check
    CHECK (jsonb_typeof(education_history) = 'array'),
  DROP CONSTRAINT IF EXISTS profiles_experience_history_array_check,
  ADD CONSTRAINT profiles_experience_history_array_check
    CHECK (jsonb_typeof(experience_history) = 'array'),
  DROP CONSTRAINT IF EXISTS profiles_certifications_array_check,
  ADD CONSTRAINT profiles_certifications_array_check
    CHECK (jsonb_typeof(certifications) = 'array');

COMMENT ON COLUMN public.profiles.education_history IS 'Structured job-seeker education entries maintained by the profile owner.';
COMMENT ON COLUMN public.profiles.experience_history IS 'Structured job-seeker work experience entries maintained by the profile owner.';
COMMENT ON COLUMN public.profiles.certifications IS 'Structured job-seeker certification entries maintained by the profile owner.';
