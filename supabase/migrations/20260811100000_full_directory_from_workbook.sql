-- Auto-generated from Nepal_Engineering_Colleges_FINAL_Directory_Snapshot_2026.xlsx
-- Generated: 2026-08-11T15:11:38.227Z
-- Total institutions: 210
-- Updates existing records with complete multi-course JSON arrays and inserts new ones.

BEGIN;

UPDATE public.institutes SET
  description = $mt$Imperial College of Engineering is a leading engineering and technology institution located in Tathali, Bhaktapur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tathali, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Imperial%2BCollege%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$imperial-college-of-engineering$mt$) OR lower(name) = lower($mt$Imperial College of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Imperial College of Engineering$mt$, $mt$imperial-college-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Tathali, Bhaktapur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Imperial College of Engineering is a leading engineering and technology institution located in Tathali, Bhaktapur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Imperial%2BCollege%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$imperial-college-of-engineering$mt$) OR lower(name) = lower($mt$Imperial College of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Khwopa College of Engineering is a leading engineering and technology institution located in Libali, Bhaktapur, Bagmati. Affiliated with Purbanchal University; also listed under Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Libali, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University; also listed under Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Khwopa%2BCollege%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$khwopa-college-of-engineering$mt$) OR lower(name) = lower($mt$Khwopa College of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Khwopa College of Engineering$mt$, $mt$khwopa-college-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Libali, Bhaktapur, Bagmati$mt$, $mt$Purbanchal University; also listed under Tribhuvan University$mt$,
  NULL,
  $mt$Khwopa College of Engineering is a leading engineering and technology institution located in Libali, Bhaktapur, Bagmati. Affiliated with Purbanchal University; also listed under Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Khwopa%2BCollege%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$khwopa-college-of-engineering$mt$) OR lower(name) = lower($mt$Khwopa College of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Community-based engineering college operated by Bhaktapur Municipality and affiliated with Purbanchal University. It is a different institution from Khwopa College of Engineering, which is affiliated with Tribhuvan University.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electronics & Communication Engineering"},{"name":"Bachelor of Architecture"},{"name":"other current programs subject to university approval"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Community-based institution$mt$, $mt$practical engineering education$mt$, $mt$engineering and architecture programs$mt$, $mt$Bhaktapur Municipality undertaking$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Libali, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/college/khwopa-engineering-college/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$khwopa-engineering-college$mt$) OR lower(name) = lower($mt$Khwopa Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Khwopa Engineering College$mt$, $mt$khwopa-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Libali, Bhaktapur, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Community-based engineering college operated by Bhaktapur Municipality and affiliated with Purbanchal University. It is a different institution from Khwopa College of Engineering, which is affiliated with Tribhuvan University.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electronics & Communication Engineering"},{"name":"Bachelor of Architecture"},{"name":"other current programs subject to university approval"}]$mt$::jsonb,
  ARRAY[$mt$Community-based institution$mt$, $mt$practical engineering education$mt$, $mt$engineering and architecture programs$mt$, $mt$Bhaktapur Municipality undertaking$mt$]::text[],
  NULL,
  NULL,
  2001,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / Local Government","rawContact":null,"sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/khwopa-engineering-college/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$khwopa-engineering-college$mt$) OR lower(name) = lower($mt$Khwopa Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Khwopa Polytechnic Institute is a leading engineering and technology institution located in Chyamhasingh, Bhaktapur, Bagmati. Affiliated with CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chyamhasingh, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Khwopa%2BPolytechnic%2BInstitute$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$khwopa-polytechnic-institute$mt$) OR lower(name) = lower($mt$Khwopa Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Khwopa Polytechnic Institute$mt$, $mt$khwopa-polytechnic-institute$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Chyamhasingh, Bhaktapur, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$Khwopa Polytechnic Institute is a leading engineering and technology institution located in Chyamhasingh, Bhaktapur, Bagmati. Affiliated with CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Khwopa%2BPolytechnic%2BInstitute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$khwopa-polytechnic-institute$mt$) OR lower(name) = lower($mt$Khwopa Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$Not-for-profit engineering institution established in 1994 at Changunarayan, Bhaktapur; offers undergraduate and postgraduate engineering/technology programs.$mt$,
  courses_offered = $mt$[{"name":"BE Civil (144)"},{"name":"BE Computer (96)"},{"name":"BE Electrical & Electronics (48)"},{"name":"B.Arch (48)"},{"name":"BE Civil & Rural (48)"},{"name":"BE Information & Communication (96)"},{"name":"BE Civil for Diploma Holders (48)"},{"name":"MSc Construction Management"},{"name":"MSc NRM & Rural Development"},{"name":"MSc iWRM"},{"name":"MSc Transportation Engineering & Management"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$120+ faculty$mt$, $mt$35,000+ books$mt$, $mt$DELNET$mt$, $mt$laboratories$mt$, $mt$girls' hostel$mt$, $mt$transport$mt$, $mt$student health insurance$mt$, $mt$research management cell$mt$, $mt$international linkages$mt$, $mt$student clubs$mt$, $mt$scholarships.$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Changunarayan, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Nepal%2BEngineering%2BCollege%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepal-engineering-college-nec$mt$) OR lower(name) = lower($mt$Nepal Engineering College (NEC)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepal Engineering College (NEC)$mt$, $mt$nepal-engineering-college-nec$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Changunarayan, Bhaktapur, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Not-for-profit engineering institution established in 1994 at Changunarayan, Bhaktapur; offers undergraduate and postgraduate engineering/technology programs.$mt$,
  $mt$[{"name":"BE Civil (144)"},{"name":"BE Computer (96)"},{"name":"BE Electrical & Electronics (48)"},{"name":"B.Arch (48)"},{"name":"BE Civil & Rural (48)"},{"name":"BE Information & Communication (96)"},{"name":"BE Civil for Diploma Holders (48)"},{"name":"MSc Construction Management"},{"name":"MSc NRM & Rural Development"},{"name":"MSc iWRM"},{"name":"MSc Transportation Engineering & Management"}]$mt$::jsonb,
  ARRAY[$mt$120+ faculty$mt$, $mt$35,000+ books$mt$, $mt$DELNET$mt$, $mt$laboratories$mt$, $mt$girls' hostel$mt$, $mt$transport$mt$, $mt$student health insurance$mt$, $mt$research management cell$mt$, $mt$international linkages$mt$, $mt$student clubs$mt$, $mt$scholarships.$mt$]::text[],
  $mt$Scholarship opportunities available; see 2026 prospectus$mt$,
  NULL,
  1994,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / not-for-profit","rawContact":"01-5221006 | info@nec.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Nepal%2BEngineering%2BCollege%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-engineering-college-nec$mt$) OR lower(name) = lower($mt$Nepal Engineering College (NEC)$mt$)
);

UPDATE public.institutes SET
  description = $mt$Chitwan Engineering Campus is a leading engineering and technology institution located in Rampur, Bharatpur, Chitwan, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Rampur, Bharatpur, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Chitwan%2BEngineering%2BCampus$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$chitwan-engineering-campus$mt$) OR lower(name) = lower($mt$Chitwan Engineering Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Chitwan Engineering Campus$mt$, $mt$chitwan-engineering-campus$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Rampur, Bharatpur, Chitwan, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Chitwan Engineering Campus is a leading engineering and technology institution located in Rampur, Bharatpur, Chitwan, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Chitwan%2BEngineering%2BCampus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$chitwan-engineering-campus$mt$) OR lower(name) = lower($mt$Chitwan Engineering Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Nepal Polytechnic Institute is a leading engineering and technology institution located in Bharatpur, Chitwan, Bagmati. Affiliated with Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bharatpur, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Nepal%2BPolytechnic%2BInstitute$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepal-polytechnic-institute$mt$) OR lower(name) = lower($mt$Nepal Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepal Polytechnic Institute$mt$, $mt$nepal-polytechnic-institute$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Bharatpur, Chitwan, Bagmati$mt$, $mt$Purbanchal University; CTEVT$mt$,
  NULL,
  $mt$Nepal Polytechnic Institute is a leading engineering and technology institution located in Bharatpur, Chitwan, Bagmati. Affiliated with Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Nepal%2BPolytechnic%2BInstitute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-polytechnic-institute$mt$) OR lower(name) = lower($mt$Nepal Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$United Technical College is a leading engineering and technology institution located in Bharatpur, Chitwan, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bharatpur, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=United%2BTechnical%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$united-technical-college$mt$) OR lower(name) = lower($mt$United Technical College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$United Technical College$mt$, $mt$united-technical-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Bharatpur, Chitwan, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$United Technical College is a leading engineering and technology institution located in Bharatpur, Chitwan, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=United%2BTechnical%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$united-technical-college$mt$) OR lower(name) = lower($mt$United Technical College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Engineering institution in Kathmandu affiliated with Purbanchal University, emphasizing theoretical foundations, practical learning, innovation and skill development.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Smart air-conditioned classrooms$mt$, $mt$alumni network$mt$, $mt$cafeteria$mt$, $mt$futsal/basketball/table tennis$mt$, $mt$student-friendly environment.$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Basundhara, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Acme%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$acme-engineering-college$mt$) OR lower(name) = lower($mt$Acme Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Acme Engineering College$mt$, $mt$acme-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Basundhara, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Engineering institution in Kathmandu affiliated with Purbanchal University, emphasizing theoretical foundations, practical learning, innovation and skill development.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[$mt$Smart air-conditioned classrooms$mt$, $mt$alumni network$mt$, $mt$cafeteria$mt$, $mt$futsal/basketball/table tennis$mt$, $mt$student-friendly environment.$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  2000,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"01-5382962; 01-5380445; 01-5670924; 01-5670925; 9841470160 | acme@acme.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Acme%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$acme-engineering-college$mt$) OR lower(name) = lower($mt$Acme Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$TU-affiliated engineering institution in Kalanki, Kathmandu established in 2000, with engineering programs and technical events focused on innovation and professional development.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Electrical"},{"name":"BE Computer"},{"name":"BE Electronics"},{"name":"Communication & Information Engineering"},{"name":"BCA"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Qualified faculty$mt$, $mt$technical events$mt$, $mt$robotics/innovation activities$mt$, $mt$annual newsletter$mt$, $mt$prospectus and academic support.$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bhuwaneshwori Marg-14, Kalanki, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Advanced%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$advanced-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Advanced College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Advanced College of Engineering and Management$mt$, $mt$advanced-college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Bhuwaneshwori Marg-14, Kalanki, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$TU-affiliated engineering institution in Kalanki, Kathmandu established in 2000, with engineering programs and technical events focused on innovation and professional development.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Electrical"},{"name":"BE Computer"},{"name":"BE Electronics"},{"name":"Communication & Information Engineering"},{"name":"BCA"}]$mt$::jsonb,
  ARRAY[$mt$Qualified faculty$mt$, $mt$technical events$mt$, $mt$robotics/innovation activities$mt$, $mt$annual newsletter$mt$, $mt$prospectus and academic support.$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  2000,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Advanced%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$advanced-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Advanced College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Aryan School of Engineering and Management is a leading engineering and technology institution located in Devkota Sadak, Mid Baneshwor, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Devkota Sadak, Mid Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Aryan%2BSchool%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$aryan-school-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Aryan School of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Aryan School of Engineering and Management$mt$, $mt$aryan-school-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Devkota Sadak, Mid Baneshwor, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Aryan School of Engineering and Management is a leading engineering and technology institution located in Devkota Sadak, Mid Baneshwor, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Aryan%2BSchool%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$aryan-school-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Aryan School of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$College of Information Technology and Engineering is a leading engineering and technology institution located in Tinkune, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tinkune, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=College%2Bof%2BInformation%2BTechnology%2Band%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$college-of-information-technology-and-engineering$mt$) OR lower(name) = lower($mt$College of Information Technology and Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$College of Information Technology and Engineering$mt$, $mt$college-of-information-technology-and-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Tinkune, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$College of Information Technology and Engineering is a leading engineering and technology institution located in Tinkune, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=College%2Bof%2BInformation%2BTechnology%2Band%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$college-of-information-technology-and-engineering$mt$) OR lower(name) = lower($mt$College of Information Technology and Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Cosmos College of Management and Technology is a leading engineering and technology institution located in Sitapaila, Kathmandu, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Sitapaila, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Cosmos%2BCollege%2Bof%2BManagement%2Band%2BTechnology$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$cosmos-college-of-management-and-technology$mt$) OR lower(name) = lower($mt$Cosmos College of Management and Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Cosmos College of Management and Technology$mt$, $mt$cosmos-college-of-management-and-technology$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Sitapaila, Kathmandu, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Cosmos College of Management and Technology is a leading engineering and technology institution located in Sitapaila, Kathmandu, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Cosmos%2BCollege%2Bof%2BManagement%2Band%2BTechnology$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$cosmos-college-of-management-and-technology$mt$) OR lower(name) = lower($mt$Cosmos College of Management and Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$Geomatics Institute of Technology is a leading engineering and technology institution located in Thapathali, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Thapathali, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Geomatics%2BInstitute%2Bof%2BTechnology$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$geomatics-institute-of-technology$mt$) OR lower(name) = lower($mt$Geomatics Institute of Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Geomatics Institute of Technology$mt$, $mt$geomatics-institute-of-technology$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Thapathali, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Geomatics Institute of Technology is a leading engineering and technology institution located in Thapathali, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Geomatics%2BInstitute%2Bof%2BTechnology$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$geomatics-institute-of-technology$mt$) OR lower(name) = lower($mt$Geomatics Institute of Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$Hillside College of Engineering is a leading engineering and technology institution located in Koteshwar, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Koteshwar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Hillside%2BCollege%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$hillside-college-of-engineering$mt$) OR lower(name) = lower($mt$Hillside College of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Hillside College of Engineering$mt$, $mt$hillside-college-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Koteshwar, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Hillside College of Engineering is a leading engineering and technology institution located in Koteshwar, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Hillside%2BCollege%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$hillside-college-of-engineering$mt$) OR lower(name) = lower($mt$Hillside College of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Himalayan College of Geomatic Engineering and Land Resource Management is a leading engineering and technology institution located in Minbhawan, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Minbhawan, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Himalayan%2BCollege%2Bof%2BGeomatic%2BEngineering%2Band%2BLand%2BResource%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$himalayan-college-of-geomatic-engineering-and-land-resource-management$mt$) OR lower(name) = lower($mt$Himalayan College of Geomatic Engineering and Land Resource Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Himalayan College of Geomatic Engineering and Land Resource Management$mt$, $mt$himalayan-college-of-geomatic-engineering-and-land-resource-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Minbhawan, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Himalayan College of Geomatic Engineering and Land Resource Management is a leading engineering and technology institution located in Minbhawan, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Himalayan%2BCollege%2Bof%2BGeomatic%2BEngineering%2Band%2BLand%2BResource%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalayan-college-of-geomatic-engineering-and-land-resource-management$mt$) OR lower(name) = lower($mt$Himalayan College of Geomatic Engineering and Land Resource Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Himalayan WhiteHouse International College is a leading engineering and technology institution located in Ramshahpath, Putalisadak, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ramshahpath, Putalisadak, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Himalayan%2BWhiteHouse%2BInternational%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$himalayan-whitehouse-international-college$mt$) OR lower(name) = lower($mt$Himalayan WhiteHouse International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Himalayan WhiteHouse International College$mt$, $mt$himalayan-whitehouse-international-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Ramshahpath, Putalisadak, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Himalayan WhiteHouse International College is a leading engineering and technology institution located in Ramshahpath, Putalisadak, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Himalayan%2BWhiteHouse%2BInternational%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalayan-whitehouse-international-college$mt$) OR lower(name) = lower($mt$Himalayan WhiteHouse International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kantipur City College is a leading engineering and technology institution located in Putalisadak, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BSc CSIT, BIT, IT/computing programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"IT/computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Putalisadak, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kantipur%2BCity%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kantipur-city-college$mt$) OR lower(name) = lower($mt$Kantipur City College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kantipur City College$mt$, $mt$kantipur-city-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Putalisadak, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Kantipur City College is a leading engineering and technology institution located in Putalisadak, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BSc CSIT, BIT, IT/computing programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"IT/computing programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kantipur%2BCity%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-city-college$mt$) OR lower(name) = lower($mt$Kantipur City College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kantipur International College is a leading engineering and technology institution located in Buddhanagar, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Buddhanagar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kantipur%2BInternational%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kantipur-international-college$mt$) OR lower(name) = lower($mt$Kantipur International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kantipur International College$mt$, $mt$kantipur-international-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Buddhanagar, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Kantipur International College is a leading engineering and technology institution located in Buddhanagar, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kantipur%2BInternational%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-international-college$mt$) OR lower(name) = lower($mt$Kantipur International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kapan Campus is a leading engineering and technology institution located in Kapan, Kathmandu, Bagmati. Affiliated with Bagmati University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kapan, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Bagmati University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kapan%2BCampus$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kapan-campus$mt$) OR lower(name) = lower($mt$Kapan Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kapan Campus$mt$, $mt$kapan-campus$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Kapan, Kathmandu, Bagmati$mt$, $mt$Bagmati University$mt$,
  NULL,
  $mt$Kapan Campus is a leading engineering and technology institution located in Kapan, Kathmandu, Bagmati. Affiliated with Bagmati University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Community","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kapan%2BCampus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kapan-campus$mt$) OR lower(name) = lower($mt$Kapan Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kapan Multiple Campus is a leading engineering and technology institution located in Kapan, Budhanilakantha, Kathmandu, Bagmati. Affiliated with Tribhuvan University; Bagmati University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kapan, Budhanilakantha, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University; Bagmati University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kapan%2BMultiple%2BCampus$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kapan-multiple-campus$mt$) OR lower(name) = lower($mt$Kapan Multiple Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kapan Multiple Campus$mt$, $mt$kapan-multiple-campus$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Kapan, Budhanilakantha, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University; Bagmati University$mt$,
  NULL,
  $mt$Kapan Multiple Campus is a leading engineering and technology institution located in Kapan, Budhanilakantha, Kathmandu, Bagmati. Affiliated with Tribhuvan University; Bagmati University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Community","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kapan%2BMultiple%2BCampus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kapan-multiple-campus$mt$) OR lower(name) = lower($mt$Kapan Multiple Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kathmandu Engineering College is a leading engineering and technology institution located in Kalimati, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kalimati, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kathmandu%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathmandu-engineering-college$mt$) OR lower(name) = lower($mt$Kathmandu Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathmandu Engineering College$mt$, $mt$kathmandu-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Kalimati, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Kathmandu Engineering College is a leading engineering and technology institution located in Kalimati, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kathmandu%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-engineering-college$mt$) OR lower(name) = lower($mt$Kathmandu Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Morgan Engineering and Management College is a leading engineering and technology institution located in Basundhara, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Basundhara, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Morgan%2BEngineering%2Band%2BManagement%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$morgan-engineering-and-management-college$mt$) OR lower(name) = lower($mt$Morgan Engineering and Management College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Morgan Engineering and Management College$mt$, $mt$morgan-engineering-and-management-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Basundhara, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Morgan Engineering and Management College is a leading engineering and technology institution located in Basundhara, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Morgan%2BEngineering%2Band%2BManagement%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$morgan-engineering-and-management-college$mt$) OR lower(name) = lower($mt$Morgan Engineering and Management College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Oxford Advanced Engineering College is a leading engineering and technology institution located in Bafal, Kathmandu, Bagmati. Affiliated with CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bafal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Oxford%2BAdvanced%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$oxford-advanced-engineering-college$mt$) OR lower(name) = lower($mt$Oxford Advanced Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Oxford Advanced Engineering College$mt$, $mt$oxford-advanced-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Bafal, Kathmandu, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$Oxford Advanced Engineering College is a leading engineering and technology institution located in Bafal, Kathmandu, Bagmati. Affiliated with CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Oxford%2BAdvanced%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$oxford-advanced-engineering-college$mt$) OR lower(name) = lower($mt$Oxford Advanced Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$School of Environmental Management and Sustainable Development (SchEMS) is a leading engineering and technology institution located in Koteshwor, Kathmandu, Bagmati. Affiliated with Not verified, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Koteshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Not verified$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=School%2Bof%2BEnvironmental%2BManagement%2Band%2BSustainable%2BDevelopment%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$school-of-environmental-management-and-sustainable-development-schems$mt$) OR lower(name) = lower($mt$School of Environmental Management and Sustainable Development (SchEMS)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$School of Environmental Management and Sustainable Development (SchEMS)$mt$, $mt$school-of-environmental-management-and-sustainable-development-schems$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Koteshwor, Kathmandu, Bagmati$mt$, $mt$Not verified$mt$,
  NULL,
  $mt$School of Environmental Management and Sustainable Development (SchEMS) is a leading engineering and technology institution located in Koteshwor, Kathmandu, Bagmati. Affiliated with Not verified, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=School%2Bof%2BEnvironmental%2BManagement%2Band%2BSustainable%2BDevelopment%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-environmental-management-and-sustainable-development-schems$mt$) OR lower(name) = lower($mt$School of Environmental Management and Sustainable Development (SchEMS)$mt$)
);

UPDATE public.institutes SET
  description = $mt$Softwarica College of IT and E-commerce is a leading engineering and technology institution located in Dillibazar, Kathmandu, Bagmati. Affiliated with Coventry University, UK, the institution adheres to competitive academic standards. Key offered programs include BSc (Hons) Software Engineering, BSc (Hons) Ethical Hacking & Cybersecurity / computing-related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Software Engineering"},{"name":"BSc (Hons) Ethical Hacking & Cybersecurity / computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dillibazar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Coventry University, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Softwarica%2BCollege%2Bof%2BIT%2Band%2BE%2Bcommerce$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$softwarica-college-of-it-and-e-commerce$mt$) OR lower(name) = lower($mt$Softwarica College of IT and E-commerce$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Softwarica College of IT and E-commerce$mt$, $mt$softwarica-college-of-it-and-e-commerce$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Dillibazar, Kathmandu, Bagmati$mt$, $mt$Coventry University, UK$mt$,
  NULL,
  $mt$Softwarica College of IT and E-commerce is a leading engineering and technology institution located in Dillibazar, Kathmandu, Bagmati. Affiliated with Coventry University, UK, the institution adheres to competitive academic standards. Key offered programs include BSc (Hons) Software Engineering, BSc (Hons) Ethical Hacking & Cybersecurity / computing-related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Software Engineering"},{"name":"BSc (Hons) Ethical Hacking & Cybersecurity / computing-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/International","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Softwarica%2BCollege%2Bof%2BIT%2Band%2BE%2Bcommerce$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$softwarica-college-of-it-and-e-commerce$mt$) OR lower(name) = lower($mt$Softwarica College of IT and E-commerce$mt$)
);

UPDATE public.institutes SET
  description = $mt$Constituent IOE campus in central Kathmandu and a long-established engineering education institution offering undergraduate and graduate technical education.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Electronics"},{"name":"Communication & Information"},{"name":"BE Mechanical"},{"name":"BE Automobile"},{"name":"BE Industrial"},{"name":"BE Computer"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Thapathali, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Thapathali%2BCampus%2BInstitute%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$thapathali-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Thapathali Campus | Institute of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Thapathali Campus | Institute of Engineering$mt$, $mt$thapathali-campus-institute-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Thapathali, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Constituent IOE campus in central Kathmandu and a long-established engineering education institution offering undergraduate and graduate technical education.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Electronics"},{"name":"Communication & Information"},{"name":"BE Mechanical"},{"name":"BE Automobile"},{"name":"BE Industrial"},{"name":"BE Computer"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  1930,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Thapathali%2BCampus%2BInstitute%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$thapathali-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Thapathali Campus | Institute of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Yeti International College is a leading engineering and technology institution located in Buddhanagar, Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University; Sripatum University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Buddhanagar, Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University; Sripatum University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Yeti%2BInternational%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$yeti-international-college$mt$) OR lower(name) = lower($mt$Yeti International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Yeti International College$mt$, $mt$yeti-international-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Buddhanagar, Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University; Sripatum University$mt$,
  NULL,
  $mt$Yeti International College is a leading engineering and technology institution located in Buddhanagar, Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University; Sripatum University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Yeti%2BInternational%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$yeti-international-college$mt$) OR lower(name) = lower($mt$Yeti International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kathmandu University's autonomous, not-for-profit, self-funding public School of Engineering, offering undergraduate, graduate and research education.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Mechanical and specialist tracks"},{"name":"BE Geomatics"},{"name":"BE Chemical"},{"name":"BE Mining"},{"name":"B.Arch"},{"name":"B.Tech AI"},{"name":"BIT"},{"name":"Health Informatics"},{"name":"Environmental Engineering"},{"name":"graduate and PhD engineering programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Research laboratories$mt$, $mt$specialist departments$mt$, $mt$university admission system$mt$, $mt$industry/research collaboration$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhulikhel, Kavre, Kavrepalanchok, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Kathmandu University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/college/discipline/engineering/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathmandu-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Kathmandu University School of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathmandu University School of Engineering$mt$, $mt$kathmandu-university-school-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Dhulikhel, Kavre, Kavrepalanchok, Bagmati$mt$, $mt$Kathmandu University$mt$,
  NULL,
  $mt$Kathmandu University's autonomous, not-for-profit, self-funding public School of Engineering, offering undergraduate, graduate and research education.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Mechanical and specialist tracks"},{"name":"BE Geomatics"},{"name":"BE Chemical"},{"name":"BE Mining"},{"name":"B.Arch"},{"name":"B.Tech AI"},{"name":"BIT"},{"name":"Health Informatics"},{"name":"Environmental Engineering"},{"name":"graduate and PhD engineering programs"}]$mt$::jsonb,
  ARRAY[$mt$Research laboratories$mt$, $mt$specialist departments$mt$, $mt$university admission system$mt$, $mt$industry/research collaboration$mt$]::text[],
  NULL,
  NULL,
  1994,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"+977-11-415100 | soe_office@ku.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/discipline/engineering/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Kathmandu University School of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Nepal Banepa Polytechnic Institute is a leading engineering and technology institution located in Banepa, Kavrepalanchok, Bagmati. Affiliated with CTEVT, the institution adheres to competitive academic standards. Key offered programs include Engineering, Electrical/Electronics, Computer, Hospitality.$mt$,
  courses_offered = $mt$[{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Computer"},{"name":"Hospitality"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Banepa, Kavrepalanchok, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Nepal%2BBanepa%2BPolytechnic%2BInstitute$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepal-banepa-polytechnic-institute$mt$) OR lower(name) = lower($mt$Nepal Banepa Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepal Banepa Polytechnic Institute$mt$, $mt$nepal-banepa-polytechnic-institute$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Banepa, Kavrepalanchok, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$Nepal Banepa Polytechnic Institute is a leading engineering and technology institution located in Banepa, Kavrepalanchok, Bagmati. Affiliated with CTEVT, the institution adheres to competitive academic standards. Key offered programs include Engineering, Electrical/Electronics, Computer, Hospitality.$mt$,
  $mt$[{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Computer"},{"name":"Hospitality"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Nepal%2BBanepa%2BPolytechnic%2BInstitute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-banepa-polytechnic-institute$mt$) OR lower(name) = lower($mt$Nepal Banepa Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$Asian Institute of Technology and Management (AITM) is a leading engineering and technology institution located in Khumaltar Heights, Lalitpur, Bagmati. Affiliated with Far-Western University / UHI, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Khumaltar Heights, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Far-Western University / UHI$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Asian%2BInstitute%2Bof%2BTechnology%2Band%2BManagement%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$asian-institute-of-technology-and-management-aitm$mt$) OR lower(name) = lower($mt$Asian Institute of Technology and Management (AITM)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Asian Institute of Technology and Management (AITM)$mt$, $mt$asian-institute-of-technology-and-management-aitm$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Khumaltar Heights, Lalitpur, Bagmati$mt$, $mt$Far-Western University / UHI$mt$,
  NULL,
  $mt$Asian Institute of Technology and Management (AITM) is a leading engineering and technology institution located in Khumaltar Heights, Lalitpur, Bagmati. Affiliated with Far-Western University / UHI, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Asian%2BInstitute%2Bof%2BTechnology%2Band%2BManagement%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-institute-of-technology-and-management-aitm$mt$) OR lower(name) = lower($mt$Asian Institute of Technology and Management (AITM)$mt$)
);

UPDATE public.institutes SET
  description = $mt$Pokhara University-affiliated engineering college in Sanepa, Lalitpur, established in 2001, emphasizing research, innovation, practical learning and project-based education.$mt$,
  courses_offered = $mt$[{"name":"BE IT and other engineering programs under Pokhara University"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Research and innovation$mt$, $mt$practical opportunities$mt$, $mt$counseling$mt$, $mt$project-based learning$mt$, $mt$experienced academic team.$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Sanepa, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Everest%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$everest-engineering-college$mt$) OR lower(name) = lower($mt$Everest Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Everest Engineering College$mt$, $mt$everest-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Sanepa, Lalitpur, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Pokhara University-affiliated engineering college in Sanepa, Lalitpur, established in 2001, emphasizing research, innovation, practical learning and project-based education.$mt$,
  $mt$[{"name":"BE IT and other engineering programs under Pokhara University"}]$mt$::jsonb,
  ARRAY[$mt$Research and innovation$mt$, $mt$practical opportunities$mt$, $mt$counseling$mt$, $mt$project-based learning$mt$, $mt$experienced academic team.$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  2001,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"01-5520742; 01-5916922 | admission@eemc.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Everest%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$everest-engineering-college$mt$) OR lower(name) = lower($mt$Everest Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Himalaya College of Engineering is a leading engineering and technology institution located in Chyasal-9, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chyasal-9, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Himalaya%2BCollege%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$himalaya-college-of-engineering$mt$) OR lower(name) = lower($mt$Himalaya College of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Himalaya College of Engineering$mt$, $mt$himalaya-college-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Chyasal-9, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Himalaya College of Engineering is a leading engineering and technology institution located in Chyasal-9, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Himalaya%2BCollege%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalaya-college-of-engineering$mt$) OR lower(name) = lower($mt$Himalaya College of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Himalayan Institute of Science and Technology (HIST) is a leading engineering and technology institution located in Gwarko, Lalitpur, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gwarko, Lalitpur, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Himalayan%2BInstitute%2Bof%2BScience%2Band%2BTechnology%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$himalayan-institute-of-science-and-technology-hist$mt$) OR lower(name) = lower($mt$Himalayan Institute of Science and Technology (HIST)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Himalayan Institute of Science and Technology (HIST)$mt$, $mt$himalayan-institute-of-science-and-technology-hist$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Gwarko, Lalitpur, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Himalayan Institute of Science and Technology (HIST) is a leading engineering and technology institution located in Gwarko, Lalitpur, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Himalayan%2BInstitute%2Bof%2BScience%2Band%2BTechnology%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalayan-institute-of-science-and-technology-hist$mt$) OR lower(name) = lower($mt$Himalayan Institute of Science and Technology (HIST)$mt$)
);

UPDATE public.institutes SET
  description = $mt$TU-affiliated engineering college in Dhapakhel, Lalitpur, founded in 1998.$mt$,
  courses_offered = $mt$[{"name":"BE Civil (96 seats)"},{"name":"additional programs listed on current Edusanjal profile"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Well-equipped campus$mt$, $mt$experienced faculty$mt$, $mt$research and innovation focus$mt$, $mt$collaborations with universities/industry$mt$, $mt$alumni network$mt$, $mt$student-centric teaching.$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhapakhel, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kantipur%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kantipur-engineering-college$mt$) OR lower(name) = lower($mt$Kantipur Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kantipur Engineering College$mt$, $mt$kantipur-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Dhapakhel, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$TU-affiliated engineering college in Dhapakhel, Lalitpur, founded in 1998.$mt$,
  $mt$[{"name":"BE Civil (96 seats)"},{"name":"additional programs listed on current Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$Well-equipped campus$mt$, $mt$experienced faculty$mt$, $mt$research and innovation focus$mt$, $mt$collaborations with universities/industry$mt$, $mt$alumni network$mt$, $mt$student-centric teaching.$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  1998,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kantipur%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-engineering-college$mt$) OR lower(name) = lower($mt$Kantipur Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kathford International College of Engineering and Management is a leading engineering and technology institution located in Balkumari, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BSc CSIT, BE Computer, Computer/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BE Computer"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Balkumari, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Kathford%2BInternational%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathford-international-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Kathford International College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathford International College of Engineering and Management$mt$, $mt$kathford-international-college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Balkumari, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Kathford International College of Engineering and Management is a leading engineering and technology institution located in Balkumari, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BSc CSIT, BE Computer, Computer/IT programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BE Computer"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Kathford%2BInternational%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathford-international-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Kathford International College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Lalitpur Engineering College is a leading engineering and technology institution located in Chakupat, Patan Dhoka, Lalitpur, Bagmati. Affiliated with Tribhuvan University; Rajarshi Janak University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chakupat, Patan Dhoka, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University; Rajarshi Janak University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Lalitpur%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$lalitpur-engineering-college$mt$) OR lower(name) = lower($mt$Lalitpur Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Lalitpur Engineering College$mt$, $mt$lalitpur-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Chakupat, Patan Dhoka, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University; Rajarshi Janak University$mt$,
  NULL,
  $mt$Lalitpur Engineering College is a leading engineering and technology institution located in Chakupat, Patan Dhoka, Lalitpur, Bagmati. Affiliated with Tribhuvan University; Rajarshi Janak University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Lalitpur%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lalitpur-engineering-college$mt$) OR lower(name) = lower($mt$Lalitpur Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Lumbini International Academy of Science and Technology is a leading engineering and technology institution located in Mahalaxmisthan, Lalitpur, Bagmati. Affiliated with Lumbini Buddhist University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mahalaxmisthan, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Lumbini Buddhist University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Lumbini%2BInternational%2BAcademy%2Bof%2BScience%2Band%2BTechnology$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$lumbini-international-academy-of-science-and-technology$mt$) OR lower(name) = lower($mt$Lumbini International Academy of Science and Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Lumbini International Academy of Science and Technology$mt$, $mt$lumbini-international-academy-of-science-and-technology$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Mahalaxmisthan, Lalitpur, Bagmati$mt$, $mt$Lumbini Buddhist University$mt$,
  NULL,
  $mt$Lumbini International Academy of Science and Technology is a leading engineering and technology institution located in Mahalaxmisthan, Lalitpur, Bagmati. Affiliated with Lumbini Buddhist University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Lumbini%2BInternational%2BAcademy%2Bof%2BScience%2Band%2BTechnology$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lumbini-international-academy-of-science-and-technology$mt$) OR lower(name) = lower($mt$Lumbini International Academy of Science and Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$Mega College of Engineering is a leading engineering and technology institution located in Kumaripati, Lalitpur, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kumaripati, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Mega%2BCollege%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$mega-college-of-engineering$mt$) OR lower(name) = lower($mt$Mega College of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mega College of Engineering$mt$, $mt$mega-college-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Kumaripati, Lalitpur, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Mega College of Engineering is a leading engineering and technology institution located in Kumaripati, Lalitpur, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Mega%2BCollege%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mega-college-of-engineering$mt$) OR lower(name) = lower($mt$Mega College of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Private engineering institution in Talchhikhel, Lalitpur, established in 2001; focuses on practical, research-driven engineering education.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Electrical"},{"name":"BE Computer"},{"name":"BE Electronics"},{"name":"Communication & Information Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Applied engineering laboratories$mt$, $mt$smart learning rooms$mt$, $mt$digital library$mt$, $mt$R&D division$mt$, $mt$internship/job placement division$mt$, $mt$student support services$mt$, $mt$student clubs and technical events.$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Satdobato, Talchhikhel, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=National%2BCollege%2Bof%2BEngineering%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$national-college-of-engineering-nce$mt$) OR lower(name) = lower($mt$National College of Engineering (NCE)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$National College of Engineering (NCE)$mt$, $mt$national-college-of-engineering-nce$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Satdobato, Talchhikhel, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Private engineering institution in Talchhikhel, Lalitpur, established in 2001; focuses on practical, research-driven engineering education.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Electrical"},{"name":"BE Computer"},{"name":"BE Electronics"},{"name":"Communication & Information Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Applied engineering laboratories$mt$, $mt$smart learning rooms$mt$, $mt$digital library$mt$, $mt$R&D division$mt$, $mt$internship/job placement division$mt$, $mt$student support services$mt$, $mt$student clubs and technical events.$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  2001,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=National%2BCollege%2Bof%2BEngineering%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-college-of-engineering-nce$mt$) OR lower(name) = lower($mt$National College of Engineering (NCE)$mt$)
);

UPDATE public.institutes SET
  description = $mt$National Institute of Engineering and Technology (NIET) is a leading engineering and technology institution located in Kupondole, Lalitpur, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kupondole, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=National%2BInstitute%2Bof%2BEngineering%2Band%2BTechnology%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$national-institute-of-engineering-and-technology-niet$mt$) OR lower(name) = lower($mt$National Institute of Engineering and Technology (NIET)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$National Institute of Engineering and Technology (NIET)$mt$, $mt$national-institute-of-engineering-and-technology-niet$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Kupondole, Lalitpur, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$National Institute of Engineering and Technology (NIET) is a leading engineering and technology institution located in Kupondole, Lalitpur, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=National%2BInstitute%2Bof%2BEngineering%2Band%2BTechnology%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-institute-of-engineering-and-technology-niet$mt$) OR lower(name) = lower($mt$National Institute of Engineering and Technology (NIET)$mt$)
);

UPDATE public.institutes SET
  description = $mt$Nepal College of Information Technology (NCIT) is a leading engineering and technology institution located in Balkumari, Lalitpur, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards. Key offered programs include BE Computer, BE Software, BCA/IT-related programs.$mt$,
  courses_offered = $mt$[{"name":"BE Computer"},{"name":"BE Software"},{"name":"BCA/IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Balkumari, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Nepal%2BCollege%2Bof%2BInformation%2BTechnology%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepal-college-of-information-technology-ncit$mt$) OR lower(name) = lower($mt$Nepal College of Information Technology (NCIT)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepal College of Information Technology (NCIT)$mt$, $mt$nepal-college-of-information-technology-ncit$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Balkumari, Lalitpur, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Nepal College of Information Technology (NCIT) is a leading engineering and technology institution located in Balkumari, Lalitpur, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards. Key offered programs include BE Computer, BE Software, BCA/IT-related programs.$mt$,
  $mt$[{"name":"BE Computer"},{"name":"BE Software"},{"name":"BCA/IT-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Nepal%2BCollege%2Bof%2BInformation%2BTechnology%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-college-of-information-technology-ncit$mt$) OR lower(name) = lower($mt$Nepal College of Information Technology (NCIT)$mt$)
);

UPDATE public.institutes SET
  description = $mt$Nepal Open University is a leading engineering and technology institution located in Man Bhawan, Lalitpur, Bagmati. Affiliated with Nepal Open University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Man Bhawan, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Nepal Open University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Nepal%2BOpen%2BUniversity$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepal-open-university$mt$) OR lower(name) = lower($mt$Nepal Open University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepal Open University$mt$, $mt$nepal-open-university$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Man Bhawan, Lalitpur, Bagmati$mt$, $mt$Nepal Open University$mt$,
  NULL,
  $mt$Nepal Open University is a leading engineering and technology institution located in Man Bhawan, Lalitpur, Bagmati. Affiliated with Nepal Open University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Nepal%2BOpen%2BUniversity$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-open-university$mt$) OR lower(name) = lower($mt$Nepal Open University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Pulchowk Campus | Institute of Engineering is a leading engineering and technology institution located in Pulchowk, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pulchowk, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Pulchowk%2BCampus%2BInstitute%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pulchowk-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Pulchowk Campus | Institute of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pulchowk Campus | Institute of Engineering$mt$, $mt$pulchowk-campus-institute-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Pulchowk, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Pulchowk Campus | Institute of Engineering is a leading engineering and technology institution located in Pulchowk, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Pulchowk%2BCampus%2BInstitute%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pulchowk-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Pulchowk Campus | Institute of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Ritz College of Engineering and Management is a leading engineering and technology institution located in Balkumari, Lalitpur, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Balkumari, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Ritz%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$ritz-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Ritz College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Ritz College of Engineering and Management$mt$, $mt$ritz-college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Balkumari, Lalitpur, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Ritz College of Engineering and Management is a leading engineering and technology institution located in Balkumari, Lalitpur, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Ritz%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ritz-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Ritz College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Sagarmatha Engineering College is a leading engineering and technology institution located in Sanepa, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Sanepa, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Sagarmatha%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$sagarmatha-engineering-college$mt$) OR lower(name) = lower($mt$Sagarmatha Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Sagarmatha Engineering College$mt$, $mt$sagarmatha-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Sanepa, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Sagarmatha Engineering College is a leading engineering and technology institution located in Sanepa, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Sagarmatha%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sagarmatha-engineering-college$mt$) OR lower(name) = lower($mt$Sagarmatha Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Universal Engineering and Science College is a leading engineering and technology institution located in Chakupat, Lalitpur, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chakupat, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Universal%2BEngineering%2Band%2BScience%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$universal-engineering-and-science-college$mt$) OR lower(name) = lower($mt$Universal Engineering and Science College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Universal Engineering and Science College$mt$, $mt$universal-engineering-and-science-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Chakupat, Lalitpur, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Universal Engineering and Science College is a leading engineering and technology institution located in Chakupat, Lalitpur, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Universal%2BEngineering%2Band%2BScience%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$universal-engineering-and-science-college$mt$) OR lower(name) = lower($mt$Universal Engineering and Science College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Gandaki College of Engineering and Science is a leading engineering and technology institution located in Lamachaur, Pokhara, Kaski, Gandaki. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lamachaur, Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Gandaki%2BCollege%2Bof%2BEngineering%2Band%2BScience$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$gandaki-college-of-engineering-and-science$mt$) OR lower(name) = lower($mt$Gandaki College of Engineering and Science$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Gandaki College of Engineering and Science$mt$, $mt$gandaki-college-of-engineering-and-science$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Lamachaur, Pokhara, Kaski, Gandaki$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Gandaki College of Engineering and Science is a leading engineering and technology institution located in Lamachaur, Pokhara, Kaski, Gandaki. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Gandaki%2BCollege%2Bof%2BEngineering%2Band%2BScience$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-college-of-engineering-and-science$mt$) OR lower(name) = lower($mt$Gandaki College of Engineering and Science$mt$)
);

UPDATE public.institutes SET
  description = $mt$Pashchimanchal Campus | Institute of Engineering is a leading engineering and technology institution located in Lamachaur, Pokhara, Kaski, Gandaki. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lamachaur, Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Pashchimanchal%2BCampus%2BInstitute%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pashchimanchal-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Pashchimanchal Campus | Institute of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pashchimanchal Campus | Institute of Engineering$mt$, $mt$pashchimanchal-campus-institute-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Lamachaur, Pokhara, Kaski, Gandaki$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Pashchimanchal Campus | Institute of Engineering is a leading engineering and technology institution located in Lamachaur, Pokhara, Kaski, Gandaki. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Pashchimanchal%2BCampus%2BInstitute%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pashchimanchal-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Pashchimanchal Campus | Institute of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Engineering institution in Phirke, Pokhara offering bachelor engineering programs along with technical programs; emphasizes practical and extracurricular development.$mt$,
  courses_offered = $mt$[{"name":"BE Computer"},{"name":"BE Civil"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"plus diploma/pre-diploma engineering programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Phirke, Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Pokhara%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pokhara-engineering-college$mt$) OR lower(name) = lower($mt$Pokhara Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pokhara Engineering College$mt$, $mt$pokhara-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Phirke, Pokhara, Kaski, Gandaki$mt$, $mt$Pokhara University; CTEVT$mt$,
  NULL,
  $mt$Engineering institution in Phirke, Pokhara offering bachelor engineering programs along with technical programs; emphasizes practical and extracurricular development.$mt$,
  $mt$[{"name":"BE Computer"},{"name":"BE Civil"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"plus diploma/pre-diploma engineering programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  1999,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Pokhara%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-engineering-college$mt$) OR lower(name) = lower($mt$Pokhara Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Constituent School of Engineering of Pokhara University.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Civil & Rural"},{"name":"BE Computer"},{"name":"BE Software"},{"name":"BE Electrical & Electronics"},{"name":"BE IT"},{"name":"graduate engineering programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Laboratories$mt$, $mt$research$mt$, $mt$industry collaboration$mt$, $mt$constituent university school$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/college/discipline/engineering/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$school-of-engineering-pokhara-university$mt$) OR lower(name) = lower($mt$School of Engineering | Pokhara University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$School of Engineering | Pokhara University$mt$, $mt$school-of-engineering-pokhara-university$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Constituent School of Engineering of Pokhara University.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Civil & Rural"},{"name":"BE Computer"},{"name":"BE Software"},{"name":"BE Electrical & Electronics"},{"name":"BE IT"},{"name":"graduate engineering programs"}]$mt$::jsonb,
  ARRAY[$mt$Laboratories$mt$, $mt$research$mt$, $mt$industry collaboration$mt$, $mt$constituent university school$mt$]::text[],
  NULL,
  NULL,
  2009,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"+977-61-504141 | director.soe@pu.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/discipline/engineering/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-engineering-pokhara-university$mt$) OR lower(name) = lower($mt$School of Engineering | Pokhara University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Oxford College of Engineering and Management is a leading engineering and technology institution located in Gaindakot, Nawalpur, Gandaki. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gaindakot, Nawalpur, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Oxford%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$oxford-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Oxford College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Oxford College of Engineering and Management$mt$, $mt$oxford-college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Gaindakot, Nawalpur, Gandaki$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Oxford College of Engineering and Management is a leading engineering and technology institution located in Gaindakot, Nawalpur, Gandaki. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Oxford%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$oxford-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Oxford College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Western Advance College of Engineering and Management is a leading engineering and technology institution located in Gaindakot, Nawalpur, Gandaki. Affiliated with Far-Western University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gaindakot, Nawalpur, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Far-Western University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Western%2BAdvance%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$western-advance-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Western Advance College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Western Advance College of Engineering and Management$mt$, $mt$western-advance-college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Gaindakot, Nawalpur, Gandaki$mt$, $mt$Far-Western University$mt$,
  NULL,
  $mt$Western Advance College of Engineering and Management is a leading engineering and technology institution located in Gaindakot, Nawalpur, Gandaki. Affiliated with Far-Western University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Western%2BAdvance%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$western-advance-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Western Advance College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Karnali Technical School is a leading engineering and technology institution located in Jumla, Karnali. Affiliated with CTEVT, the institution adheres to competitive academic standards. Key offered programs include Engineering, Electrical, Agriculture, Animal Science.$mt$,
  courses_offered = $mt$[{"name":"Engineering"},{"name":"Electrical"},{"name":"Agriculture"},{"name":"Animal Science"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Jumla, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Karnali%2BTechnical%2BSchool$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$karnali-technical-school$mt$) OR lower(name) = lower($mt$Karnali Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Karnali Technical School$mt$, $mt$karnali-technical-school$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Jumla, Karnali$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$Karnali Technical School is a leading engineering and technology institution located in Jumla, Karnali. Affiliated with CTEVT, the institution adheres to competitive academic standards. Key offered programs include Engineering, Electrical, Agriculture, Animal Science.$mt$,
  $mt$[{"name":"Engineering"},{"name":"Electrical"},{"name":"Agriculture"},{"name":"Animal Science"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Karnali%2BTechnical%2BSchool$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$karnali-technical-school$mt$) OR lower(name) = lower($mt$Karnali Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$Graduate School of Engineering | Mid-West University is a leading engineering and technology institution located in Birendranagar, Surkhet, Karnali. Affiliated with Mid-West University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Birendranagar, Surkhet, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$Mid-West University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Graduate%2BSchool%2Bof%2BEngineering%2BMid%2BWest%2BUniversity$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$graduate-school-of-engineering-mid-west-university$mt$) OR lower(name) = lower($mt$Graduate School of Engineering | Mid-West University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Graduate School of Engineering | Mid-West University$mt$, $mt$graduate-school-of-engineering-mid-west-university$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Birendranagar, Surkhet, Karnali$mt$, $mt$Mid-West University$mt$,
  NULL,
  $mt$Graduate School of Engineering | Mid-West University is a leading engineering and technology institution located in Birendranagar, Surkhet, Karnali. Affiliated with Mid-West University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Graduate%2BSchool%2Bof%2BEngineering%2BMid%2BWest%2BUniversity$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$graduate-school-of-engineering-mid-west-university$mt$) OR lower(name) = lower($mt$Graduate School of Engineering | Mid-West University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Dhulabari Campus is a leading engineering and technology institution located in Dhulabari, Mechinagar, Jhapa, Koshi. Affiliated with Tribhuvan University; CTEVT; Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhulabari, Mechinagar, Jhapa, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University; CTEVT; Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Dhulabari%2BCampus$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$dhulabari-campus$mt$) OR lower(name) = lower($mt$Dhulabari Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Dhulabari Campus$mt$, $mt$dhulabari-campus$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Dhulabari, Mechinagar, Jhapa, Koshi$mt$, $mt$Tribhuvan University; CTEVT; Purbanchal University$mt$,
  NULL,
  $mt$Dhulabari Campus is a leading engineering and technology institution located in Dhulabari, Mechinagar, Jhapa, Koshi. Affiliated with Tribhuvan University; CTEVT; Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Community","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Dhulabari%2BCampus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dhulabari-campus$mt$) OR lower(name) = lower($mt$Dhulabari Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Pathivara Engineering College is a leading engineering and technology institution located in Arjundhara Municipality-11, Birtamode, Jhapa, Koshi. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Arjundhara Municipality-11, Birtamode, Jhapa, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Pathivara%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pathivara-engineering-college$mt$) OR lower(name) = lower($mt$Pathivara Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pathivara Engineering College$mt$, $mt$pathivara-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Arjundhara Municipality-11, Birtamode, Jhapa, Koshi$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Pathivara Engineering College is a leading engineering and technology institution located in Arjundhara Municipality-11, Birtamode, Jhapa, Koshi. Affiliated with Purbanchal University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics & Communication"},{"name":"B.Arch"},{"name":"BIT"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Pathivara%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pathivara-engineering-college$mt$) OR lower(name) = lower($mt$Pathivara Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Eastern College of Engineering is a leading engineering and technology institution located in Tinpaini Chowk, Biratnagar, Morang, Koshi. Affiliated with Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tinpaini Chowk, Biratnagar, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Eastern%2BCollege%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$eastern-college-of-engineering$mt$) OR lower(name) = lower($mt$Eastern College of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Eastern College of Engineering$mt$, $mt$eastern-college-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Tinpaini Chowk, Biratnagar, Morang, Koshi$mt$, $mt$Purbanchal University; CTEVT$mt$,
  NULL,
  $mt$Eastern College of Engineering is a leading engineering and technology institution located in Tinpaini Chowk, Biratnagar, Morang, Koshi. Affiliated with Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Eastern%2BCollege%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$eastern-college-of-engineering$mt$) OR lower(name) = lower($mt$Eastern College of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Madan Bhandari Memorial Academy is a leading engineering and technology institution located in Mangalbare, Urlabari, Morang, Koshi. Affiliated with Pokhara University; Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mangalbare, Urlabari, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University; Purbanchal University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Madan%2BBhandari%2BMemorial%2BAcademy$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$madan-bhandari-memorial-academy$mt$) OR lower(name) = lower($mt$Madan Bhandari Memorial Academy$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Madan Bhandari Memorial Academy$mt$, $mt$madan-bhandari-memorial-academy$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Mangalbare, Urlabari, Morang, Koshi$mt$, $mt$Pokhara University; Purbanchal University; CTEVT$mt$,
  NULL,
  $mt$Madan Bhandari Memorial Academy is a leading engineering and technology institution located in Mangalbare, Urlabari, Morang, Koshi. Affiliated with Pokhara University; Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Madan%2BBhandari%2BMemorial%2BAcademy$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$madan-bhandari-memorial-academy$mt$) OR lower(name) = lower($mt$Madan Bhandari Memorial Academy$mt$)
);

UPDATE public.institutes SET
  description = $mt$Madan Bhandari Memorial Academy Nepal is a leading engineering and technology institution located in Urlabari, Morang, Koshi. Affiliated with Pokhara University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Urlabari, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Madan%2BBhandari%2BMemorial%2BAcademy%2BNepal$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$madan-bhandari-memorial-academy-nepal$mt$) OR lower(name) = lower($mt$Madan Bhandari Memorial Academy Nepal$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Madan Bhandari Memorial Academy Nepal$mt$, $mt$madan-bhandari-memorial-academy-nepal$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Urlabari, Morang, Koshi$mt$, $mt$Pokhara University; CTEVT$mt$,
  NULL,
  $mt$Madan Bhandari Memorial Academy Nepal is a leading engineering and technology institution located in Urlabari, Morang, Koshi. Affiliated with Pokhara University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Madan%2BBhandari%2BMemorial%2BAcademy%2BNepal$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$madan-bhandari-memorial-academy-nepal$mt$) OR lower(name) = lower($mt$Madan Bhandari Memorial Academy Nepal$mt$)
);

UPDATE public.institutes SET
  description = $mt$Manmohan Memorial Polytechnic is a leading engineering and technology institution located in Biratnagar, Morang, Koshi. Affiliated with CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Biratnagar, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Manmohan%2BMemorial%2BPolytechnic$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$manmohan-memorial-polytechnic$mt$) OR lower(name) = lower($mt$Manmohan Memorial Polytechnic$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Manmohan Memorial Polytechnic$mt$, $mt$manmohan-memorial-polytechnic$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Biratnagar, Morang, Koshi$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$Manmohan Memorial Polytechnic is a leading engineering and technology institution located in Biratnagar, Morang, Koshi. Affiliated with CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Manmohan%2BMemorial%2BPolytechnic$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$manmohan-memorial-polytechnic$mt$) OR lower(name) = lower($mt$Manmohan Memorial Polytechnic$mt$)
);

UPDATE public.institutes SET
  description = $mt$Constituent engineering school of Purbanchal University.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical"},{"name":"BE Electronics"},{"name":"Communication & Automation"},{"name":"MSc Information System Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Constituent university school$mt$, $mt$engineering laboratories$mt$, $mt$practical learning$mt$, $mt$research$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Biratnagar, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/college/discipline/engineering/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$purbanchal-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Purbanchal University School of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Purbanchal University School of Engineering$mt$, $mt$purbanchal-university-school-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Biratnagar, Morang, Koshi$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Constituent engineering school of Purbanchal University.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical"},{"name":"BE Electronics"},{"name":"Communication & Automation"},{"name":"MSc Information System Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Constituent university school$mt$, $mt$engineering laboratories$mt$, $mt$practical learning$mt$, $mt$research$mt$]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"+977-021-426033 | info@pufoe.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/discipline/engineering/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$purbanchal-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Purbanchal University School of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$School of Engineering - Manmohan Technical University is a leading engineering and technology institution located in Biratnagar, Budhiganga, Morang, Koshi. Affiliated with Manmohan Technical University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Biratnagar, Budhiganga, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Manmohan Technical University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=School%2Bof%2BEngineering%2BManmohan%2BTechnical%2BUniversity$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$school-of-engineering-manmohan-technical-university$mt$) OR lower(name) = lower($mt$School of Engineering - Manmohan Technical University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$School of Engineering - Manmohan Technical University$mt$, $mt$school-of-engineering-manmohan-technical-university$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Biratnagar, Budhiganga, Morang, Koshi$mt$, $mt$Manmohan Technical University$mt$,
  NULL,
  $mt$School of Engineering - Manmohan Technical University is a leading engineering and technology institution located in Biratnagar, Budhiganga, Morang, Koshi. Affiliated with Manmohan Technical University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=School%2Bof%2BEngineering%2BManmohan%2BTechnical%2BUniversity$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-engineering-manmohan-technical-university$mt$) OR lower(name) = lower($mt$School of Engineering - Manmohan Technical University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Purwanchal Campus | Institute of Engineering is a leading engineering and technology institution located in Dharan, Sunsari, Koshi. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dharan, Sunsari, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Purwanchal%2BCampus%2BInstitute%2Bof%2BEngineering$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$purwanchal-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Purwanchal Campus | Institute of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Purwanchal Campus | Institute of Engineering$mt$, $mt$purwanchal-campus-institute-of-engineering$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Dharan, Sunsari, Koshi$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Purwanchal Campus | Institute of Engineering is a leading engineering and technology institution located in Dharan, Sunsari, Koshi. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Purwanchal%2BCampus%2BInstitute%2Bof%2BEngineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$purwanchal-campus-institute-of-engineering$mt$) OR lower(name) = lower($mt$Purwanchal Campus | Institute of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$Bheri College of Engineering and Management is a leading engineering and technology institution located in Nepalgunj, Banke, Lumbini. Affiliated with Far-Western University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Nepalgunj, Banke, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Far-Western University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Bheri%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$bheri-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Bheri College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Bheri College of Engineering and Management$mt$, $mt$bheri-college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Nepalgunj, Banke, Lumbini$mt$, $mt$Far-Western University$mt$,
  NULL,
  $mt$Bheri College of Engineering and Management is a leading engineering and technology institution located in Nepalgunj, Banke, Lumbini. Affiliated with Far-Western University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Bheri%2BCollege%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bheri-college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$Bheri College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$College of Engineering and Management is a leading engineering and technology institution located in Shitalnagar, Nepalgunj, Banke, Lumbini. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Shitalnagar, Nepalgunj, Banke, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=College%2Bof%2BEngineering%2Band%2BManagement$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$College of Engineering and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$College of Engineering and Management$mt$, $mt$college-of-engineering-and-management$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Shitalnagar, Nepalgunj, Banke, Lumbini$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$College of Engineering and Management is a leading engineering and technology institution located in Shitalnagar, Nepalgunj, Banke, Lumbini. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=College%2Bof%2BEngineering%2Band%2BManagement$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$college-of-engineering-and-management$mt$) OR lower(name) = lower($mt$College of Engineering and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Institute of Engineering and Information Technology | Lumbini Technological University is a leading engineering and technology institution located in Nepalgunj, Banke, Lumbini. Affiliated with Lumbini Technological University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Nepalgunj, Banke, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Lumbini Technological University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Institute%2Bof%2BEngineering%2Band%2BInformation%2BTechnology%2BLumbini%2BTechnological%2BUniversity$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$institute-of-engineering-and-information-technology-lumbini-technological-university$mt$) OR lower(name) = lower($mt$Institute of Engineering and Information Technology | Lumbini Technological University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Institute of Engineering and Information Technology | Lumbini Technological University$mt$, $mt$institute-of-engineering-and-information-technology-lumbini-technological-university$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Nepalgunj, Banke, Lumbini$mt$, $mt$Lumbini Technological University$mt$,
  NULL,
  $mt$Institute of Engineering and Information Technology | Lumbini Technological University is a leading engineering and technology institution located in Nepalgunj, Banke, Lumbini. Affiliated with Lumbini Technological University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Institute%2Bof%2BEngineering%2Band%2BInformation%2BTechnology%2BLumbini%2BTechnological%2BUniversity$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$institute-of-engineering-and-information-technology-lumbini-technological-university$mt$) OR lower(name) = lower($mt$Institute of Engineering and Information Technology | Lumbini Technological University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Engineering institution in Ghorahi, Dang offering engineering and technology programs under Pokhara University and CTEVT.$mt$,
  courses_offered = $mt$[{"name":"BE Computer"},{"name":"BE Civil"},{"name":"BE Electronics & Communication"},{"name":"BCA"},{"name":"Diploma/Pre-Diploma engineering programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ghorahi, Dang, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Rapti%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$rapti-engineering-college$mt$) OR lower(name) = lower($mt$Rapti Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Rapti Engineering College$mt$, $mt$rapti-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Ghorahi, Dang, Lumbini$mt$, $mt$Pokhara University; CTEVT$mt$,
  NULL,
  $mt$Engineering institution in Ghorahi, Dang offering engineering and technology programs under Pokhara University and CTEVT.$mt$,
  $mt$[{"name":"BE Computer"},{"name":"BE Civil"},{"name":"BE Electronics & Communication"},{"name":"BCA"},{"name":"Diploma/Pre-Diploma engineering programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Rapti%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$rapti-engineering-college$mt$) OR lower(name) = lower($mt$Rapti Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Lumbini Engineering College is a leading engineering and technology institution located in Bhalwari, Rupandehi, Lumbini. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bhalwari, Rupandehi, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Lumbini%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$lumbini-engineering-college$mt$) OR lower(name) = lower($mt$Lumbini Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Lumbini Engineering College$mt$, $mt$lumbini-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Bhalwari, Rupandehi, Lumbini$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Lumbini Engineering College is a leading engineering and technology institution located in Bhalwari, Rupandehi, Lumbini. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Lumbini%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lumbini-engineering-college$mt$) OR lower(name) = lower($mt$Lumbini Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Central Engineering College is a leading engineering and technology institution located in Ramanand Chowk 8, Janakpur, Dhanusha, Madhesh. Affiliated with Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ramanand Chowk 8, Janakpur, Dhanusha, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University; CTEVT$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Central%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$central-engineering-college$mt$) OR lower(name) = lower($mt$Central Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Central Engineering College$mt$, $mt$central-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Ramanand Chowk 8, Janakpur, Dhanusha, Madhesh$mt$, $mt$Purbanchal University; CTEVT$mt$,
  NULL,
  $mt$Central Engineering College is a leading engineering and technology institution located in Ramanand Chowk 8, Janakpur, Dhanusha, Madhesh. Affiliated with Purbanchal University; CTEVT, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Central%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$central-engineering-college$mt$) OR lower(name) = lower($mt$Central Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Janakpur Engineering College is a leading engineering and technology institution located in Janakpur / Dhanusha, Madhesh. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Janakpur / Dhanusha, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Janakpur%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$janakpur-engineering-college$mt$) OR lower(name) = lower($mt$Janakpur Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Janakpur Engineering College$mt$, $mt$janakpur-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Janakpur / Dhanusha, Madhesh$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Janakpur Engineering College is a leading engineering and technology institution located in Janakpur / Dhanusha, Madhesh. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electronics Communication & Information"},{"name":"BE Electrical"},{"name":"B.Arch"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Janakpur%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janakpur-engineering-college$mt$) OR lower(name) = lower($mt$Janakpur Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Gaushala Engineering Campus is a leading engineering and technology institution located in Mahottari, Madhesh. Affiliated with Rajarshi Janak University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mahottari, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$Rajarshi Janak University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Gaushala%2BEngineering%2BCampus$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$gaushala-engineering-campus$mt$) OR lower(name) = lower($mt$Gaushala Engineering Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Gaushala Engineering Campus$mt$, $mt$gaushala-engineering-campus$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Mahottari, Madhesh$mt$, $mt$Rajarshi Janak University$mt$,
  NULL,
  $mt$Gaushala Engineering Campus is a leading engineering and technology institution located in Mahottari, Madhesh. Affiliated with Rajarshi Janak University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Gaushala%2BEngineering%2BCampus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gaushala-engineering-campus$mt$) OR lower(name) = lower($mt$Gaushala Engineering Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Dhangadhi Engineering College is a leading engineering and technology institution located in Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Dhangadhi%2BEngineering%2BCollege$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$dhangadhi-engineering-college$mt$) OR lower(name) = lower($mt$Dhangadhi Engineering College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Dhangadhi Engineering College$mt$, $mt$dhangadhi-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Dhangadhi Engineering College is a leading engineering and technology institution located in Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Dhangadhi%2BEngineering%2BCollege$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dhangadhi-engineering-college$mt$) OR lower(name) = lower($mt$Dhangadhi Engineering College$mt$)
);

UPDATE public.institutes SET
  description = $mt$National Academy of Science and Technology (Dhangadi Engineering College) is a leading engineering and technology institution located in Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=National%2BAcademy%2Bof%2BScience%2Band%2BTechnology%2B$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$national-academy-of-science-and-technology-dhangadi-engineering-college$mt$) OR lower(name) = lower($mt$National Academy of Science and Technology (Dhangadi Engineering College)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$National Academy of Science and Technology (Dhangadi Engineering College)$mt$, $mt$national-academy-of-science-and-technology-dhangadi-engineering-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$National Academy of Science and Technology (Dhangadi Engineering College) is a leading engineering and technology institution located in Uttar Behadi, Dhangadhi, Kailali, Sudurpashchim. Affiliated with Pokhara University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"BE Electrical & Electronics"},{"name":"BE Software"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=National%2BAcademy%2Bof%2BScience%2Band%2BTechnology%2B$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-academy-of-science-and-technology-dhangadi-engineering-college$mt$) OR lower(name) = lower($mt$National Academy of Science and Technology (Dhangadi Engineering College)$mt$)
);

UPDATE public.institutes SET
  description = $mt$School of Engineering | Far Western University is a leading engineering and technology institution located in Mahendranagar, Kanchanpur, Sudurpashchim. Affiliated with Far-Western University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mahendranagar, Kanchanpur, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$Far-Western University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=School%2Bof%2BEngineering%2BFar%2BWestern%2BUniversity$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$school-of-engineering-far-western-university$mt$) OR lower(name) = lower($mt$School of Engineering | Far Western University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$School of Engineering | Far Western University$mt$, $mt$school-of-engineering-far-western-university$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Mahendranagar, Kanchanpur, Sudurpashchim$mt$, $mt$Far-Western University$mt$,
  NULL,
  $mt$School of Engineering | Far Western University is a leading engineering and technology institution located in Mahendranagar, Kanchanpur, Sudurpashchim. Affiliated with Far-Western University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"BE Civil Engineering"},{"name":"BE Computer Engineering"},{"name":"BE Electrical Engineering"},{"name":"BE Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=School%2Bof%2BEngineering%2BFar%2BWestern%2BUniversity$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-engineering-far-western-university$mt$) OR lower(name) = lower($mt$School of Engineering | Far Western University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Sindhuli Community Technical Institute is a leading engineering and technology institution located in Kamalamai, Sindhuli, To verify. Affiliated with CTEVT / Kathmandu University, the institution adheres to competitive academic standards.$mt$,
  courses_offered = $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kamalamai, Sindhuli, To verify$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT / Kathmandu University$mt$),
  source_url = COALESCE(source_url, $mt$https://edusanjal.com/search/?q=Sindhuli%2BCommunity%2BTechnical%2BInstitute$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$sindhuli-community-technical-institute$mt$) OR lower(name) = lower($mt$Sindhuli Community Technical Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Sindhuli Community Technical Institute$mt$, $mt$sindhuli-community-technical-institute$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Kamalamai, Sindhuli, To verify$mt$, $mt$CTEVT / Kathmandu University$mt$,
  NULL,
  $mt$Sindhuli Community Technical Institute is a leading engineering and technology institution located in Kamalamai, Sindhuli, To verify. Affiliated with CTEVT / Kathmandu University, the institution adheres to competitive academic standards.$mt$,
  $mt$[{"name":"Diploma in Civil Engineering"},{"name":"Diploma in Computer Engineering"},{"name":"Diploma in Electrical Engineering"},{"name":"Diploma in Mechanical Engineering"},{"name":"Diploma in Information Technology"}]$mt$::jsonb,
  ARRAY[]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/search/?q=Sindhuli%2BCommunity%2BTechnical%2BInstitute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sindhuli-community-technical-institute$mt$) OR lower(name) = lower($mt$Sindhuli Community Technical Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Mechanical"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Balaju, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$balaju-school-of-engineering-and-technology$mt$) OR lower(name) = lower($mt$Balaju School of Engineering and Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Balaju School of Engineering and Technology$mt$, $mt$balaju-school-of-engineering-and-technology$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Balaju, Kathmandu, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Mechanical"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Constituent","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$balaju-school-of-engineering-and-technology$mt$) OR lower(name) = lower($mt$Balaju School of Engineering and Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Mechanical"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Shankharapur, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$shankharapur-polytechnic-institute$mt$) OR lower(name) = lower($mt$Shankharapur Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Shankharapur Polytechnic Institute$mt$, $mt$shankharapur-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Shankharapur, Kathmandu, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Mechanical"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Constituent","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$shankharapur-polytechnic-institute$mt$) OR lower(name) = lower($mt$Shankharapur Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Engineering"},{"name":"Mechanical"},{"name":"Electrical"},{"name":"Agriculture"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Panauti, Kavre, Kavrepalanchok, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$panauti-technical-school$mt$) OR lower(name) = lower($mt$Panauti Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Panauti Technical School$mt$, $mt$panauti-technical-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Panauti, Kavre, Kavrepalanchok, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Engineering"},{"name":"Mechanical"},{"name":"Electrical"},{"name":"Agriculture"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Constituent/Technical School","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$panauti-technical-school$mt$) OR lower(name) = lower($mt$Panauti Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil"},{"name":"Electrical"},{"name":"Plumbing"},{"name":"Mechanical"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chitlang, Makwanpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$thaha-polytechnic-institute$mt$) OR lower(name) = lower($mt$Thaha Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Thaha Polytechnic Institute$mt$, $mt$thaha-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Chitlang, Makwanpur, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil"},{"name":"Electrical"},{"name":"Plumbing"},{"name":"Mechanical"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$thaha-polytechnic-institute$mt$) OR lower(name) = lower($mt$Thaha Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Animal Science"},{"name":"Technical trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Nuwakot, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$posta-bahadur-bogati-polytechnic-institute$mt$) OR lower(name) = lower($mt$Posta Bahadur Bogati Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Posta Bahadur Bogati Polytechnic Institute$mt$, $mt$posta-bahadur-bogati-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Nuwakot, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Animal Science"},{"name":"Technical trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$posta-bahadur-bogati-polytechnic-institute$mt$) OR lower(name) = lower($mt$Posta Bahadur Bogati Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Beauty"},{"name":"Agriculture"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chandragiri, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$ganesh-man-memorial-polytechnic-institute$mt$) OR lower(name) = lower($mt$Ganesh Man Memorial Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Ganesh Man Memorial Polytechnic Institute$mt$, $mt$ganesh-man-memorial-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Chandragiri, Kathmandu, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Beauty"},{"name":"Agriculture"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ganesh-man-memorial-polytechnic-institute$mt$) OR lower(name) = lower($mt$Ganesh Man Memorial Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Water Supply & Sanitation"},{"name":"Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Biratnagar, Morang, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$mahanagar-polytechnic-institute$mt$) OR lower(name) = lower($mt$Mahanagar Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mahanagar Polytechnic Institute$mt$, $mt$mahanagar-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Biratnagar, Morang, Koshi$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Water Supply & Sanitation"},{"name":"Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Partnership","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mahanagar-polytechnic-institute$mt$) OR lower(name) = lower($mt$Mahanagar Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Electrical"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chaurjahari, Rukum West, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$shahid-yagyashwor-memorial-polytechnic-institute$mt$) OR lower(name) = lower($mt$Shahid Yagyashwor Memorial Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Shahid Yagyashwor Memorial Polytechnic Institute$mt$, $mt$shahid-yagyashwor-memorial-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Chaurjahari, Rukum West, Karnali$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Electrical"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$shahid-yagyashwor-memorial-polytechnic-institute$mt$) OR lower(name) = lower($mt$Shahid Yagyashwor Memorial Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey"},{"name":"Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lalmatiya, Dang, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$rapti-technical-school$mt$) OR lower(name) = lower($mt$Rapti Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Rapti Technical School$mt$, $mt$rapti-technical-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Lalmatiya, Dang, Lumbini$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey"},{"name":"Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Constituent","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$rapti-technical-school$mt$) OR lower(name) = lower($mt$Rapti Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Health"},{"name":"Construction"},{"name":"Hotel Management"},{"name":"Technical trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bardibas, Mahottari, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$nirmal-lama-polytechnic-institute$mt$) OR lower(name) = lower($mt$Nirmal Lama Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nirmal Lama Polytechnic Institute$mt$, $mt$nirmal-lama-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Bardibas, Mahottari, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Health"},{"name":"Construction"},{"name":"Hotel Management"},{"name":"Technical trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Constituent","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nirmal-lama-polytechnic-institute$mt$) OR lower(name) = lower($mt$Nirmal Lama Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Engineering"},{"name":"Mechanical"},{"name":"Electrical"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lahan, Siraha, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$lahan-technical-school$mt$) OR lower(name) = lower($mt$Lahan Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Lahan Technical School$mt$, $mt$lahan-technical-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Lahan, Siraha, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Engineering"},{"name":"Mechanical"},{"name":"Electrical"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Constituent","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lahan-technical-school$mt$) OR lower(name) = lower($mt$Lahan Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Civil"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhanusha, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$bp-memorial-polytechnic-institute$mt$) OR lower(name) = lower($mt$BP Memorial Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$BP Memorial Polytechnic Institute$mt$, $mt$bp-memorial-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Dhanusha, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Civil"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bp-memorial-polytechnic-institute$mt$) OR lower(name) = lower($mt$BP Memorial Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Hotel Management"},{"name":"Hospitality"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$pokhara-technical-school$mt$) OR lower(name) = lower($mt$Pokhara Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pokhara Technical School$mt$, $mt$pokhara-technical-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Hotel Management"},{"name":"Hospitality"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-technical-school$mt$) OR lower(name) = lower($mt$Pokhara Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electrical"},{"name":"Civil"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$gandaki-polytechnic-institute-pvt-ltd$mt$) OR lower(name) = lower($mt$Gandaki Polytechnic Institute Pvt. Ltd.$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Gandaki Polytechnic Institute Pvt. Ltd.$mt$, $mt$gandaki-polytechnic-institute-pvt-ltd$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electrical"},{"name":"Civil"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-polytechnic-institute-pvt-ltd$mt$) OR lower(name) = lower($mt$Gandaki Polytechnic Institute Pvt. Ltd.$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Computer"},{"name":"Electronics"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$asia-technical-training-institute$mt$) OR lower(name) = lower($mt$Asia Technical Training Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Asia Technical Training Institute$mt$, $mt$asia-technical-training-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Kaski, Gandaki$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Computer"},{"name":"Electronics"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asia-technical-training-institute$mt$) OR lower(name) = lower($mt$Asia Technical Training Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Electrical"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$annapurna-polytechnic-institute$mt$) OR lower(name) = lower($mt$Annapurna Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Annapurna Polytechnic Institute$mt$, $mt$annapurna-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Kaski, Gandaki$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Electrical"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$annapurna-polytechnic-institute$mt$) OR lower(name) = lower($mt$Annapurna Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Hotel Management"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Baglung, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$dhaulagiri-technical-school$mt$) OR lower(name) = lower($mt$Dhaulagiri Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Dhaulagiri Technical School$mt$, $mt$dhaulagiri-technical-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Baglung, Gandaki$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Hotel Management"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dhaulagiri-technical-school$mt$) OR lower(name) = lower($mt$Dhaulagiri Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electrical"},{"name":"Technical trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Rupandehi, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$gandaki-polytechnic-institute$mt$) OR lower(name) = lower($mt$Gandaki Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Gandaki Polytechnic Institute$mt$, $mt$gandaki-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Rupandehi, Lumbini$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electrical"},{"name":"Technical trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-polytechnic-institute$mt$) OR lower(name) = lower($mt$Gandaki Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Plumbing"},{"name":"Electrical"},{"name":"Beauty"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tikapur, Kailali, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$tikapur-polytechnic-institute$mt$) OR lower(name) = lower($mt$Tikapur Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Tikapur Polytechnic Institute$mt$, $mt$tikapur-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Tikapur, Kailali, Sudurpashchim$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Plumbing"},{"name":"Electrical"},{"name":"Beauty"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT Provider","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$tikapur-polytechnic-institute$mt$) OR lower(name) = lower($mt$Tikapur Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil"},{"name":"Computer"},{"name":"Geomatics"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Birtamode, Jhapa, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$sahid-smriti-pratishthan$mt$) OR lower(name) = lower($mt$Sahid Smriti Pratishthan$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Sahid Smriti Pratishthan$mt$, $mt$sahid-smriti-pratishthan$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Birtamode, Jhapa, Koshi$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil"},{"name":"Computer"},{"name":"Geomatics"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sahid-smriti-pratishthan$mt$) OR lower(name) = lower($mt$Sahid Smriti Pratishthan$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kolti, Bajura, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$jana-prakash-secondary-school$mt$) OR lower(name) = lower($mt$Jana Prakash Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Jana Prakash Secondary School$mt$, $mt$jana-prakash-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Kolti, Bajura, Sudurpashchim$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$jana-prakash-secondary-school$mt$) OR lower(name) = lower($mt$Jana Prakash Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil"},{"name":"Agriculture"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Jacha, Jumla, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$malika-secondary-school$mt$) OR lower(name) = lower($mt$Malika Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Malika Secondary School$mt$, $mt$malika-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Jacha, Jumla, Karnali$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil"},{"name":"Agriculture"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$malika-secondary-school$mt$) OR lower(name) = lower($mt$Malika Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kharipati, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$shree-krishna-secondary-school$mt$) OR lower(name) = lower($mt$Shree Krishna Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Shree Krishna Secondary School$mt$, $mt$shree-krishna-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Kharipati, Bhaktapur, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$shree-krishna-secondary-school$mt$) OR lower(name) = lower($mt$Shree Krishna Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ratnanagar, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$janajagriti-secondary-school$mt$) OR lower(name) = lower($mt$Janajagriti Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Janajagriti Secondary School$mt$, $mt$janajagriti-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Ratnanagar, Chitwan, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janajagriti-secondary-school$mt$) OR lower(name) = lower($mt$Janajagriti Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Agriculture"},{"name":"Animal Science"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ratnanagar, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$bairiya-secondary-school$mt$) OR lower(name) = lower($mt$Bairiya Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Bairiya Secondary School$mt$, $mt$bairiya-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Ratnanagar, Chitwan, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Agriculture"},{"name":"Animal Science"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bairiya-secondary-school$mt$) OR lower(name) = lower($mt$Bairiya Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electrical"},{"name":"Civil"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ratnanagar, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$panchakanya-secondary-school$mt$) OR lower(name) = lower($mt$Panchakanya Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Panchakanya Secondary School$mt$, $mt$panchakanya-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Ratnanagar, Chitwan, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electrical"},{"name":"Civil"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$panchakanya-secondary-school$mt$) OR lower(name) = lower($mt$Panchakanya Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Hotel Management"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ratnanagar, Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$bachhauli-secondary-school$mt$) OR lower(name) = lower($mt$Bachhauli Secondary School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Bachhauli Secondary School$mt$, $mt$bachhauli-secondary-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Ratnanagar, Chitwan, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Hotel Management"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bachhauli-secondary-school$mt$) OR lower(name) = lower($mt$Bachhauli Secondary School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Computer Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lalbandi, Sarlahi, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$janjyoti-technical-school$mt$) OR lower(name) = lower($mt$Janjyoti Technical School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Janjyoti Technical School$mt$, $mt$janjyoti-technical-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Lalbandi, Sarlahi, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Computer Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janjyoti-technical-school$mt$) OR lower(name) = lower($mt$Janjyoti Technical School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Civil Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Rainadevi Chhahara, Palpa, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kalika-community-school$mt$) OR lower(name) = lower($mt$Kalika Community School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kalika Community School$mt$, $mt$kalika-community-school$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Rainadevi Chhahara, Palpa, Lumbini$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Civil Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community / TECS","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kalika-community-school$mt$) OR lower(name) = lower($mt$Kalika Community School$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gaur, Rautahat, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$institute-of-community-technical-education$mt$) OR lower(name) = lower($mt$Institute of Community Technical Education$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Institute of Community Technical Education$mt$, $mt$institute-of-community-technical-education$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Gaur, Rautahat, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$institute-of-community-technical-education$mt$) OR lower(name) = lower($mt$Institute of Community Technical Education$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Rajbiraj, Saptari, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$chhinnamasta-institute-of-technology$mt$) OR lower(name) = lower($mt$Chhinnamasta Institute of Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Chhinnamasta Institute of Technology$mt$, $mt$chhinnamasta-institute-of-technology$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Rajbiraj, Saptari, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$chhinnamasta-institute-of-technology$mt$) OR lower(name) = lower($mt$Chhinnamasta Institute of Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Rajbiraj, Saptari, Madhesh$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$everest-technical-institute$mt$) OR lower(name) = lower($mt$Everest Technical Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Everest Technical Institute$mt$, $mt$everest-technical-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Rajbiraj, Saptari, Madhesh$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$everest-technical-institute$mt$) OR lower(name) = lower($mt$Everest Technical Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Amargadhi, Dadeldhura, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$white-park-college$mt$) OR lower(name) = lower($mt$White Park College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$White Park College$mt$, $mt$white-park-college$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Amargadhi, Dadeldhura, Sudurpashchim$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$white-park-college$mt$) OR lower(name) = lower($mt$White Park College$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhangadhi, Kailali, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kailali-polytechnic-institute$mt$) OR lower(name) = lower($mt$Kailali Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kailali Polytechnic Institute$mt$, $mt$kailali-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Dhangadhi, Kailali, Sudurpashchim$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kailali-polytechnic-institute$mt$) OR lower(name) = lower($mt$Kailali Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bhimdatta, Kanchanpur, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$sk-institute-of-technology$mt$) OR lower(name) = lower($mt$SK Institute of Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$SK Institute of Technology$mt$, $mt$sk-institute-of-technology$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Bhimdatta, Kanchanpur, Sudurpashchim$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sk-institute-of-technology$mt$) OR lower(name) = lower($mt$SK Institute of Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Surkhet, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$surkhet-technical-school-pvt$mt$) OR lower(name) = lower($mt$Surkhet Technical School Pvt$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Surkhet Technical School Pvt$mt$, $mt$surkhet-technical-school-pvt$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Surkhet, Karnali$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Survey Engineering"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$surkhet-technical-school-pvt$mt$) OR lower(name) = lower($mt$Surkhet Technical School Pvt$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electrical"},{"name":"Electronics"},{"name":"Computer"},{"name":"Mechanical"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$lb-modern-electronic-institute-pvt-ltd$mt$) OR lower(name) = lower($mt$LB Modern Electronic Institute Pvt. Ltd.$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$LB Modern Electronic Institute Pvt. Ltd.$mt$, $mt$lb-modern-electronic-institute-pvt-ltd$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Kathmandu, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electrical"},{"name":"Electronics"},{"name":"Computer"},{"name":"Mechanical"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lb-modern-electronic-institute-pvt-ltd$mt$) OR lower(name) = lower($mt$LB Modern Electronic Institute Pvt. Ltd.$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electrical"},{"name":"Refrigeration & AC"},{"name":"Fabrication"},{"name":"Tailoring"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gwarko, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$peace-technical-training-center-pvt-ltd$mt$) OR lower(name) = lower($mt$Peace Technical Training Center Pvt. Ltd.$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Peace Technical Training Center Pvt. Ltd.$mt$, $mt$peace-technical-training-center-pvt-ltd$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Gwarko, Lalitpur, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electrical"},{"name":"Refrigeration & AC"},{"name":"Fabrication"},{"name":"Tailoring"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$peace-technical-training-center-pvt-ltd$mt$) OR lower(name) = lower($mt$Peace Technical Training Center Pvt. Ltd.$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Mobile Phone Repair"},{"name":"Education"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$world-link-technical-training-institute-private-limited$mt$) OR lower(name) = lower($mt$World Link Technical Training Institute Private Limited$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$World Link Technical Training Institute Private Limited$mt$, $mt$world-link-technical-training-institute-private-limited$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Lalitpur, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Mobile Phone Repair"},{"name":"Education"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$world-link-technical-training-institute-private-limited$mt$) OR lower(name) = lower($mt$World Link Technical Training Institute Private Limited$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Plumbing"},{"name":"Electrical"},{"name":"Technical trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Chitwan, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$narayani-polytechnic-institute-pvt-ltd$mt$) OR lower(name) = lower($mt$Narayani Polytechnic Institute Pvt. Ltd.$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Narayani Polytechnic Institute Pvt. Ltd.$mt$, $mt$narayani-polytechnic-institute-pvt-ltd$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Chitwan, Bagmati$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Plumbing"},{"name":"Electrical"},{"name":"Technical trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$narayani-polytechnic-institute-pvt-ltd$mt$) OR lower(name) = lower($mt$Narayani Polytechnic Institute Pvt. Ltd.$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electronics"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Durgapur, Jhapa, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kankai-polytechnic-institute$mt$) OR lower(name) = lower($mt$Kankai Polytechnic Institute$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kankai Polytechnic Institute$mt$, $mt$kankai-polytechnic-institute$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Durgapur, Jhapa, Koshi$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electronics"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT-affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kankai-polytechnic-institute$mt$) OR lower(name) = lower($mt$Kankai Polytechnic Institute$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Electronics/Electrical"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Jhapa, Koshi$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$trade-link-training-institute-pvt$mt$) OR lower(name) = lower($mt$Trade Link Training Institute Pvt.$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Trade Link Training Institute Pvt.$mt$, $mt$trade-link-training-institute-pvt$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Jhapa, Koshi$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Electronics/Electrical"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$trade-link-training-institute-pvt$mt$) OR lower(name) = lower($mt$Trade Link Training Institute Pvt.$mt$)
);

UPDATE public.institutes SET
  description = $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  courses_offered = $mt$[{"name":"Hospitality"},{"name":"Vocational trades"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dang, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$CTEVT$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kumakh-college-of-management-and-technical-science$mt$) OR lower(name) = lower($mt$Kumakh College of Management and Technical Science$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kumakh College of Management and Technical Science$mt$, $mt$kumakh-college-of-management-and-technical-science$mt$, $mt$technical$mt$,
  $mt$college$mt$, $mt$Dang, Lumbini$mt$, $mt$CTEVT$mt$,
  NULL,
  $mt$CTEVT-affiliated/managed technical and vocational education provider; detailed current program status should be checked against CTEVT's live institutional mapping.$mt$,
  $mt$[{"name":"Hospitality"},{"name":"Vocational trades"}]$mt$::jsonb,
  ARRAY[$mt$Practical TVET delivery$mt$, $mt$CTEVT curriculum/assessment framework$mt$, $mt$program-specific facilities$mt$]::text[],
  $mt$CTEVT classified/merit/special scholarships where applicable$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"CTEVT-affiliated","rawContact":null,"sourceSheet":"CTEVT Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kumakh-college-of-management-and-technical-science$mt$) OR lower(name) = lower($mt$Kumakh College of Management and Technical Science$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCSIT"},{"name":"IT/business computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Business and computing education$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University / national affiliation$mt$),
  source_url = COALESCE(source_url, $mt$https://ace.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$ace-institute-of-management$mt$) OR lower(name) = lower($mt$Ace Institute of Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Ace Institute of Management$mt$, $mt$ace-institute-of-management$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Pokhara University / national affiliation$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCSIT"},{"name":"IT/business computing programs"}]$mt$::jsonb,
  ARRAY[$mt$Business and computing education$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://ace.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ace-institute-of-management$mt$) OR lower(name) = lower($mt$Ace Institute of Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Public science campus$mt$, $mt$strong computing/science orientation$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lainchaur, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://ascol.tu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$amrit-science-campus-ascol$mt$) OR lower(name) = lower($mt$Amrit Science Campus (ASCOL)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Amrit Science Campus (ASCOL)$mt$, $mt$amrit-science-campus-ascol$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Lainchaur, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$Public science campus$mt$, $mt$strong computing/science orientation$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://ascol.tu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$amrit-science-campus-ascol$mt$) OR lower(name) = lower($mt$Amrit Science Campus (ASCOL)$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"computing/technology programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Technology-oriented institution$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Sifal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University / national affiliation$mt$),
  source_url = COALESCE(source_url, $mt$https://deerwalk.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$deerwalk-institute-of-technology$mt$) OR lower(name) = lower($mt$Deerwalk Institute of Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Deerwalk Institute of Technology$mt$, $mt$deerwalk-institute-of-technology$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Sifal, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University / national affiliation$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"computing/technology programs"}]$mt$::jsonb,
  ARRAY[$mt$Technology-oriented institution$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://deerwalk.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$deerwalk-institute-of-technology$mt$) OR lower(name) = lower($mt$Deerwalk Institute of Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"computing specializations"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Foreign-affiliated computing degree$mt$, $mt$industry-oriented model$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Naxal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Wolverhampton, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://heraldcollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$herald-college-kathmandu$mt$) OR lower(name) = lower($mt$Herald College Kathmandu$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Herald College Kathmandu$mt$, $mt$herald-college-kathmandu$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Naxal, Kathmandu, Bagmati$mt$, $mt$University of Wolverhampton, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"computing specializations"}]$mt$::jsonb,
  ARRAY[$mt$Foreign-affiliated computing degree$mt$, $mt$industry-oriented model$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://heraldcollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$herald-college-kathmandu$mt$) OR lower(name) = lower($mt$Herald College Kathmandu$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computer Science"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Same institution as Herald College Kathmandu$mt$, $mt$retained once in final identity logic$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Naxal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Wolverhampton, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://heraldcollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$herald-college-kathmandu-international-computing$mt$) OR lower(name) = lower($mt$Herald College Kathmandu - international computing$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Herald College Kathmandu - international computing$mt$, $mt$herald-college-kathmandu-international-computing$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Naxal, Kathmandu, Bagmati$mt$, $mt$University of Wolverhampton, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computer Science"}]$mt$::jsonb,
  ARRAY[$mt$Same institution as Herald College Kathmandu$mt$, $mt$retained once in final identity logic$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://heraldcollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$herald-college-kathmandu-international-computing$mt$) OR lower(name) = lower($mt$Herald College Kathmandu - international computing$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"computing/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$International university pathway$mt$, $mt$IT-focused programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Putalisadak, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Taylor's University, Malaysia$mt$),
  source_url = COALESCE(source_url, $mt$https://iimscollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$iims-college$mt$) OR lower(name) = lower($mt$IIMS College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$IIMS College$mt$, $mt$iims-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Putalisadak, Kathmandu, Bagmati$mt$, $mt$Taylor's University, Malaysia$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"computing/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$International university pathway$mt$, $mt$IT-focused programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://iimscollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$iims-college$mt$) OR lower(name) = lower($mt$IIMS College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computer Systems Engineering"},{"name":"BSc (Hons) Computer Science"},{"name":"BSc (Hons) Cyber Security"},{"name":"computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Foreign-affiliated computing/IT degrees$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tinkune, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Sunderland, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://ismt.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$ismt-college$mt$) OR lower(name) = lower($mt$ISMT College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$ISMT College$mt$, $mt$ismt-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Tinkune, Kathmandu, Bagmati$mt$, $mt$University of Sunderland, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computer Systems Engineering"},{"name":"BSc (Hons) Computer Science"},{"name":"BSc (Hons) Cyber Security"},{"name":"computing programs"}]$mt$::jsonb,
  ARRAY[$mt$Foreign-affiliated computing/IT degrees$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://ismt.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ismt-college$mt$) OR lower(name) = lower($mt$ISMT College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"BSc (Hons) Computing / IT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$International IT degree pathway$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maitidevi, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$London Metropolitan University, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://informatics.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$informatics-college-kathmandu$mt$) OR lower(name) = lower($mt$Informatics College Kathmandu$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Informatics College Kathmandu$mt$, $mt$informatics-college-kathmandu$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Maitidevi, Kathmandu, Bagmati$mt$, $mt$London Metropolitan University, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"BSc (Hons) Computing / IT"}]$mt$::jsonb,
  ARRAY[$mt$International IT degree pathway$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://informatics.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$informatics-college-kathmandu$mt$) OR lower(name) = lower($mt$Informatics College Kathmandu$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computing"},{"name":"BSc (Hons) Computer Networking & IT Security"},{"name":"BSc (Hons) Multimedia Technologies"},{"name":"BSc (Hons) Computing with Artificial Intelligence"},{"name":"postgraduate IT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$International IT/business college$mt$, $mt$industry-oriented curriculum$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kamalpokhari, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$London Metropolitan University, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://islington.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$islington-college$mt$) OR lower(name) = lower($mt$Islington College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Islington College$mt$, $mt$islington-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Kamalpokhari, Kathmandu, Bagmati$mt$, $mt$London Metropolitan University, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computing"},{"name":"BSc (Hons) Computer Networking & IT Security"},{"name":"BSc (Hons) Multimedia Technologies"},{"name":"BSc (Hons) Computing with Artificial Intelligence"},{"name":"postgraduate IT"}]$mt$::jsonb,
  ARRAY[$mt$International IT/business college$mt$, $mt$industry-oriented curriculum$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://islington.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$islington-college$mt$) OR lower(name) = lower($mt$Islington College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCA"},{"name":"BIT"},{"name":"IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Business and IT-focused college$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Subidhanagar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kantipur-college-of-business-management-and-it$mt$) OR lower(name) = lower($mt$Kantipur College of Business Management and IT$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kantipur College of Business Management and IT$mt$, $mt$kantipur-college-of-business-management-and-it$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Subidhanagar, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCA"},{"name":"BIT"},{"name":"IT programs"}]$mt$::jsonb,
  ARRAY[$mt$Business and IT-focused college$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-college-of-business-management-and-it$mt$) OR lower(name) = lower($mt$Kantipur College of Business Management and IT$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSIT"},{"name":"BS Computer Science"},{"name":"MSc Artificial Intelligence"},{"name":"other technology/business programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$US-affiliated degree programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Babarmahal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Westcliff University, USA$mt$),
  source_url = COALESCE(source_url, $mt$https://kingscollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kings-college$mt$) OR lower(name) = lower($mt$King's College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$King's College$mt$, $mt$kings-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Babarmahal, Kathmandu, Bagmati$mt$, $mt$Westcliff University, USA$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSIT"},{"name":"BS Computer Science"},{"name":"MSc Artificial Intelligence"},{"name":"other technology/business programs"}]$mt$::jsonb,
  ARRAY[$mt$US-affiliated degree programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://kingscollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kings-college$mt$) OR lower(name) = lower($mt$King's College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Information Technology"},{"name":"BSc (Hons) Computer Science"},{"name":"MSc IT Management"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Long-running foreign-affiliated IT institution$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maitidevi, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Asia Pacific University of Technology & Innovation, Malaysia$mt$),
  source_url = COALESCE(source_url, $mt$https://www.lbef.org/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$lord-buddha-education-foundation-lbef$mt$) OR lower(name) = lower($mt$Lord Buddha Education Foundation (LBEF)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Lord Buddha Education Foundation (LBEF)$mt$, $mt$lord-buddha-education-foundation-lbef$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Maitidevi, Kathmandu, Bagmati$mt$, $mt$Asia Pacific University of Technology & Innovation, Malaysia$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Information Technology"},{"name":"BSc (Hons) Computer Science"},{"name":"MSc IT Management"}]$mt$::jsonb,
  ARRAY[$mt$Long-running foreign-affiliated IT institution$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://www.lbef.org/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lord-buddha-education-foundation-lbef$mt$) OR lower(name) = lower($mt$Lord Buddha Education Foundation (LBEF)$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCA"},{"name":"IT/computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Public TU constituent campus$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tahachal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$mahendra-ratna-campus$mt$) OR lower(name) = lower($mt$Mahendra Ratna Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mahendra Ratna Campus$mt$, $mt$mahendra-ratna-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Tahachal, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCA"},{"name":"IT/computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Public TU constituent campus$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mahendra-ratna-campus$mt$) OR lower(name) = lower($mt$Mahendra Ratna Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computing"},{"name":"BSc (Hons) Computing with AI / related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$UK-affiliated computing education$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Jorpati, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Northampton, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://nami.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$nami-college$mt$) OR lower(name) = lower($mt$NAMI College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$NAMI College$mt$, $mt$nami-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Jorpati, Kathmandu, Bagmati$mt$, $mt$University of Northampton, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computing"},{"name":"BSc (Hons) Computing with AI / related programs"}]$mt$::jsonb,
  ARRAY[$mt$UK-affiliated computing education$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://nami.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nami-college$mt$) OR lower(name) = lower($mt$NAMI College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCA"},{"name":"BSc CSIT / IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Public women's campus with IT programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bagbazar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://pkmc.tu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$padma-kanya-multiple-campus$mt$) OR lower(name) = lower($mt$Padma Kanya Multiple Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Padma Kanya Multiple Campus$mt$, $mt$padma-kanya-multiple-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Bagbazar, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCA"},{"name":"BSc CSIT / IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Public women's campus with IT programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://pkmc.tu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$padma-kanya-multiple-campus$mt$) OR lower(name) = lower($mt$Padma Kanya Multiple Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"BCA"},{"name":"IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$IT/business/science programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Naya Bazar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$prime-college$mt$) OR lower(name) = lower($mt$Prime College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Prime College$mt$, $mt$prime-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Naya Bazar, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"BCA"},{"name":"IT programs"}]$mt$::jsonb,
  ARRAY[$mt$IT/business/science programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$prime-college$mt$) OR lower(name) = lower($mt$Prime College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCSIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Business and IT programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gwarko, Lalitpur, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://quest.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$quest-international-college$mt$) OR lower(name) = lower($mt$Quest International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Quest International College$mt$, $mt$quest-international-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Gwarko, Lalitpur, Kathmandu, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCSIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  ARRAY[$mt$Business and IT programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://quest.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$quest-international-college$mt$) OR lower(name) = lower($mt$Quest International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCSIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Management and computing programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Old Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://saim.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$saim-college$mt$) OR lower(name) = lower($mt$SAIM College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$SAIM College$mt$, $mt$saim-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Old Baneshwor, Kathmandu, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCSIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  ARRAY[$mt$Management and computing programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://saim.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$saim-college$mt$) OR lower(name) = lower($mt$SAIM College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BCA / computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Established academic institution with science and IT programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maitighar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://sxc.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$st-xaviers-college$mt$) OR lower(name) = lower($mt$St. Xavier's College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$St. Xavier's College$mt$, $mt$st-xaviers-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Maitighar, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BCA / computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Established academic institution with science and IT programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://sxc.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$st-xaviers-college$mt$) OR lower(name) = lower($mt$St. Xavier's College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"AI/data/IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Emerging foreign-affiliated IT institution$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Subidhanagar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$International / foreign-affiliated$mt$),
  source_url = COALESCE(source_url, $mt$https://techspire.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$techspire-college$mt$) OR lower(name) = lower($mt$Techspire College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Techspire College$mt$, $mt$techspire-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Subidhanagar, Kathmandu, Bagmati$mt$, $mt$International / foreign-affiliated$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computer Science"},{"name":"AI/data/IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Emerging foreign-affiliated IT institution$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://techspire.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$techspire-college$mt$) OR lower(name) = lower($mt$Techspire College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BCA"},{"name":"BIT/IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Large private college with IT programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mitrapark, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://texasintl.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$texas-international-college$mt$) OR lower(name) = lower($mt$Texas International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Texas International College$mt$, $mt$texas-international-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Mitrapark, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BCA"},{"name":"BIT/IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Large private college with IT programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://texasintl.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$texas-international-college$mt$) OR lower(name) = lower($mt$Texas International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computing"},{"name":"BSc (Hons) Cyber Security and Networking"},{"name":"BSc (Hons) Artificial Intelligence"},{"name":"MSc IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$British university degrees$mt$, $mt$international academic pathway$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Thapathali, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of the West of England / University of the West of Scotland, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://www.thebritishcollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$the-british-college$mt$) OR lower(name) = lower($mt$The British College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$The British College$mt$, $mt$the-british-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Thapathali, Kathmandu, Bagmati$mt$, $mt$University of the West of England / University of the West of Scotland, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computing"},{"name":"BSc (Hons) Cyber Security and Networking"},{"name":"BSc (Hons) Artificial Intelligence"},{"name":"MSc IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$British university degrees$mt$, $mt$international academic pathway$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://www.thebritishcollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$the-british-college$mt$) OR lower(name) = lower($mt$The British College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"Computing"},{"name":"Cyber Security"},{"name":"AI and IT postgraduate programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$International degree pathway$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Thapathali, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$UK universities$mt$),
  source_url = COALESCE(source_url, $mt$https://www.thebritishcollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$the-british-college-kathmandu$mt$) OR lower(name) = lower($mt$The British College - Kathmandu$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$The British College - Kathmandu$mt$, $mt$the-british-college-kathmandu$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Thapathali, Kathmandu, Bagmati$mt$, $mt$UK universities$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"Computing"},{"name":"Cyber Security"},{"name":"AI and IT postgraduate programs"}]$mt$::jsonb,
  ARRAY[$mt$International degree pathway$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://www.thebritishcollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$the-british-college-kathmandu$mt$) OR lower(name) = lower($mt$The British College - Kathmandu$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"MSc CSIT"},{"name":"MIT / postgraduate computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Central university department$mt$, $mt$postgraduate/research focus$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kirtipur, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://cdcsit.tu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$tribhuvan-university-central-department-of-computer-science-and-information-technology$mt$) OR lower(name) = lower($mt$Tribhuvan University Central Department of Computer Science and Information Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Tribhuvan University Central Department of Computer Science and Information Technology$mt$, $mt$tribhuvan-university-central-department-of-computer-science-and-information-technology$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Kirtipur, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"MSc CSIT"},{"name":"MIT / postgraduate computing programs"}]$mt$::jsonb,
  ARRAY[$mt$Central university department$mt$, $mt$postgraduate/research focus$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://cdcsit.tu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$tribhuvan-university-central-department-of-computer-science-and-information-technology$mt$) OR lower(name) = lower($mt$Tribhuvan University Central Department of Computer Science and Information Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCSIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Business + IT orientation$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://uniglobe.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$uniglobe-college$mt$) OR lower(name) = lower($mt$Uniglobe College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Uniglobe College$mt$, $mt$uniglobe-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCSIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  ARRAY[$mt$Business + IT orientation$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://uniglobe.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$uniglobe-college$mt$) OR lower(name) = lower($mt$Uniglobe College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc Computer Science"},{"name":"BE Computer Engineering"},{"name":"MSc/MPhil/PhD computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Research-intensive computing/engineering school$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhulikhel, Kavrepalanchok, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Kathmandu University$mt$),
  source_url = COALESCE(source_url, $mt$https://comp.ku.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathmandu-university-department-of-computer-science-and-engineering$mt$) OR lower(name) = lower($mt$Kathmandu University Department of Computer Science and Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathmandu University Department of Computer Science and Engineering$mt$, $mt$kathmandu-university-department-of-computer-science-and-engineering$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Dhulikhel, Kavrepalanchok, Bagmati$mt$, $mt$Kathmandu University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc Computer Science"},{"name":"BE Computer Engineering"},{"name":"MSc/MPhil/PhD computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Research-intensive computing/engineering school$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / University","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://comp.ku.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-university-department-of-computer-science-and-engineering$mt$) OR lower(name) = lower($mt$Kathmandu University Department of Computer Science and Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCA"},{"name":"BSc CSIT / computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$IT and management programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Satdobato, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$asian-college-of-higher-studies$mt$) OR lower(name) = lower($mt$Asian College of Higher Studies$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Asian College of Higher Studies$mt$, $mt$asian-college-of-higher-studies$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Satdobato, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCA"},{"name":"BSc CSIT / computing programs"}]$mt$::jsonb,
  ARRAY[$mt$IT and management programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-college-of-higher-studies$mt$) OR lower(name) = lower($mt$Asian College of Higher Studies$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"Computer/IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Management, technology and engineering education$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$asian-institute-of-technology-management$mt$) OR lower(name) = lower($mt$Asian Institute of Technology & Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Asian Institute of Technology & Management$mt$, $mt$asian-institute-of-technology-management$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Lalitpur, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"Computer/IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Management, technology and engineering education$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-institute-of-technology-management$mt$) OR lower(name) = lower($mt$Asian Institute of Technology & Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Software Engineering"},{"name":"computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$UK degree pathway$mt$, $mt$computing and business$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kupondole, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Bedfordshire, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://pcpscollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pcps-college$mt$) OR lower(name) = lower($mt$PCPS College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$PCPS College$mt$, $mt$pcps-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Kupondole, Lalitpur, Bagmati$mt$, $mt$University of Bedfordshire, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Software Engineering"},{"name":"computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$UK degree pathway$mt$, $mt$computing and business$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://pcpscollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pcps-college$mt$) OR lower(name) = lower($mt$PCPS College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"BCA"},{"name":"BIM"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Major public TU campus with multiple IT degrees$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Patan Dhoka, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://pmc.tu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$patan-multiple-campus$mt$) OR lower(name) = lower($mt$Patan Multiple Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Patan Multiple Campus$mt$, $mt$patan-multiple-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Patan Dhoka, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"BCA"},{"name":"BIM"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$Major public TU campus with multiple IT degrees$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://pmc.tu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$patan-multiple-campus$mt$) OR lower(name) = lower($mt$Patan Multiple Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BE Computer"},{"name":"Software/Computer-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Engineering and computing focus$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://gces.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$gandaki-college-of-engineering-and-sciences$mt$) OR lower(name) = lower($mt$Gandaki College of Engineering and Sciences$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Gandaki College of Engineering and Sciences$mt$, $mt$gandaki-college-of-engineering-and-sciences$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BE Computer"},{"name":"Software/Computer-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Engineering and computing focus$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://gces.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-college-of-engineering-and-sciences$mt$) OR lower(name) = lower($mt$Gandaki College of Engineering and Sciences$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"Computer Science / computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Foreign-affiliated computing education$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Sunderland, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://ismt.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$ismt-college-pokhara$mt$) OR lower(name) = lower($mt$ISMT College Pokhara$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$ISMT College Pokhara$mt$, $mt$ismt-college-pokhara$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$University of Sunderland, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"Computer Science / computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Foreign-affiliated computing education$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://ismt.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ismt-college-pokhara$mt$) OR lower(name) = lower($mt$ISMT College Pokhara$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"IT/computing and management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$IT-focused private college$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Asia Pacific University of Technology & Innovation / international collaboration$mt$),
  source_url = COALESCE(source_url, $mt$https://infomaxcollege.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$infomax-college-of-it-and-management$mt$) OR lower(name) = lower($mt$Infomax College of IT and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Infomax College of IT and Management$mt$, $mt$infomax-college-of-it-and-management$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Asia Pacific University of Technology & Innovation / international collaboration$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"IT/computing and management programs"}]$mt$::jsonb,
  ARRAY[$mt$IT-focused private college$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://infomaxcollege.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$infomax-college-of-it-and-management$mt$) OR lower(name) = lower($mt$Infomax College of IT and Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc (Hons) Computing"},{"name":"IT/computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Foreign-affiliated IT college outside Kathmandu Valley$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$London Metropolitan University, UK$mt$),
  source_url = COALESCE(source_url, $mt$https://informatics.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$informatics-college-pokhara$mt$) OR lower(name) = lower($mt$Informatics College Pokhara$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Informatics College Pokhara$mt$, $mt$informatics-college-pokhara$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$London Metropolitan University, UK$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc (Hons) Computing"},{"name":"IT/computing programs"}]$mt$::jsonb,
  ARRAY[$mt$Foreign-affiliated IT college outside Kathmandu Valley$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://informatics.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$informatics-college-pokhara$mt$) OR lower(name) = lower($mt$Informatics College Pokhara$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"computer/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$TU-affiliated IT education$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$mount-annapurna-campus$mt$) OR lower(name) = lower($mt$Mount Annapurna Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mount Annapurna Campus$mt$, $mt$mount-annapurna-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"computer/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$TU-affiliated IT education$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mount-annapurna-campus$mt$) OR lower(name) = lower($mt$Mount Annapurna Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"Computer Engineering"},{"name":"Software Engineering"},{"name":"IT-related graduate programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$University engineering school$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://pu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pokhara-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Pokhara University School of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pokhara University School of Engineering$mt$, $mt$pokhara-university-school-of-engineering$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"Computer Engineering"},{"name":"Software Engineering"},{"name":"IT-related graduate programs"}]$mt$::jsonb,
  ARRAY[$mt$University engineering school$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / University School","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://pu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Pokhara University School of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"Computer Science / IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$University science and technology programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, $mt$https://pu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$pokhara-university-school-of-science-and-technology$mt$) OR lower(name) = lower($mt$Pokhara University School of Science and Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Pokhara University School of Science and Technology$mt$, $mt$pokhara-university-school-of-science-and-technology$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"Computer Science / IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$University science and technology programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / University School","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://pu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-university-school-of-science-and-technology$mt$) OR lower(name) = lower($mt$Pokhara University School of Science and Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"BCA"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Large public constituent campus$mt$, $mt$broad computing programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, $mt$https://prnc.tu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$prithvi-narayan-campus$mt$) OR lower(name) = lower($mt$Prithvi Narayan Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Prithvi Narayan Campus$mt$, $mt$prithvi-narayan-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT"},{"name":"BCA"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$Large public constituent campus$mt$, $mt$broad computing programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://prnc.tu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$prithvi-narayan-campus$mt$) OR lower(name) = lower($mt$Prithvi Narayan Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$IT-focused TU-affiliated college$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$soch-college-of-it$mt$) OR lower(name) = lower($mt$Soch College of IT$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Soch College of IT$mt$, $mt$soch-college-of-it$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Pokhara, Kaski, Gandaki$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"}]$mt$::jsonb,
  ARRAY[$mt$IT-focused TU-affiliated college$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$soch-college-of-it$mt$) OR lower(name) = lower($mt$Soch College of IT$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BIT / MIT / IT and computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Dedicated graduate/IT academic unit$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Birendranagar, Surkhet, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$Mid-West University$mt$),
  source_url = COALESCE(source_url, $mt$https://mu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$mid-west-university-graduate-school-of-information-technology$mt$) OR lower(name) = lower($mt$Mid-West University Graduate School of Information Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mid-West University Graduate School of Information Technology$mt$, $mt$mid-west-university-graduate-school-of-information-technology$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Birendranagar, Surkhet, Karnali$mt$, $mt$Mid-West University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BIT / MIT / IT and computing programs"}]$mt$::jsonb,
  ARRAY[$mt$Dedicated graduate/IT academic unit$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://mu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mid-west-university-graduate-school-of-information-technology$mt$) OR lower(name) = lower($mt$Mid-West University Graduate School of Information Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BE Computer"},{"name":"BE Software"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$University school focused on engineering and technology$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Birendranagar, Surkhet, Karnali$mt$),
  affiliation = COALESCE(affiliation, $mt$Mid-West University$mt$),
  source_url = COALESCE(source_url, $mt$https://mu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$mid-west-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Mid-West University School of Engineering$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mid-West University School of Engineering$mt$, $mt$mid-west-university-school-of-engineering$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Birendranagar, Surkhet, Karnali$mt$, $mt$Mid-West University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BE Computer"},{"name":"BE Software"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$University school focused on engineering and technology$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://mu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mid-west-university-school-of-engineering$mt$) OR lower(name) = lower($mt$Mid-West University School of Engineering$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"IT/computing programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Public higher education campus with computing programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Nepalgunj, Banke, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepalgunj-campus$mt$) OR lower(name) = lower($mt$Nepalgunj Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepalgunj Campus$mt$, $mt$nepalgunj-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Nepalgunj, Banke, Lumbini$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"IT/computing programs"}]$mt$::jsonb,
  ARRAY[$mt$Public higher education campus with computing programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepalgunj-campus$mt$) OR lower(name) = lower($mt$Nepalgunj Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT/BCA and IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Public constituent campus in Dang$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ghorahi, Dang, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$mahendra-multiple-campus$mt$) OR lower(name) = lower($mt$Mahendra Multiple Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mahendra Multiple Campus$mt$, $mt$mahendra-multiple-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Ghorahi, Dang, Lumbini$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT/BCA and IT programs"}]$mt$::jsonb,
  ARRAY[$mt$Public constituent campus in Dang$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mahendra-multiple-campus$mt$) OR lower(name) = lower($mt$Mahendra Multiple Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT/BCA/IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Public campus serving western Nepal$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Butwal, Rupandehi, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$butwal-multiple-campus$mt$) OR lower(name) = lower($mt$Butwal Multiple Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Butwal Multiple Campus$mt$, $mt$butwal-multiple-campus$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Butwal, Rupandehi, Lumbini$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT/BCA/IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Public campus serving western Nepal$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$butwal-multiple-campus$mt$) OR lower(name) = lower($mt$Butwal Multiple Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCA"},{"name":"BSc CSIT / IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Regional IT-focused institution$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Butwal, Rupandehi, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$lumbini-ict-college$mt$) OR lower(name) = lower($mt$Lumbini ICT College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Lumbini ICT College$mt$, $mt$lumbini-ict-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Butwal, Rupandehi, Lumbini$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCA"},{"name":"BSc CSIT / IT programs"}]$mt$::jsonb,
  ARRAY[$mt$Regional IT-focused institution$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lumbini-ict-college$mt$) OR lower(name) = lower($mt$Lumbini ICT College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BCA / IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Regional private IT/computing education$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Butwal, Rupandehi, Lumbini$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$siddhartha-international-college$mt$) OR lower(name) = lower($mt$Siddhartha International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Siddhartha International College$mt$, $mt$siddhartha-international-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Butwal, Rupandehi, Lumbini$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BCA / IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Regional private IT/computing education$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National affiliation","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$siddhartha-international-college$mt$) OR lower(name) = lower($mt$Siddhartha International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  courses_offered = $mt$[{"name":"BSc CSIT"},{"name":"BIT/BCA/computing-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[$mt$Regional public university with computing programs$mt$]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mahendranagar, Kanchanpur, Sudurpashchim$mt$),
  affiliation = COALESCE(affiliation, $mt$Far Western University$mt$),
  source_url = COALESCE(source_url, $mt$https://fwu.edu.np/$mt$),
  updated_at = now()
WHERE lower(slug) = lower($mt$far-western-university$mt$) OR lower(name) = lower($mt$Far Western University$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Far Western University$mt$, $mt$far-western-university$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Mahendranagar, Kanchanpur, Sudurpashchim$mt$, $mt$Far Western University$mt$,
  NULL,
  $mt$IT/computing-focused higher-education institution or university school offering one or more computing, information technology, computer science, software, cybersecurity, AI or related programs.$mt$,
  $mt$[{"name":"BSc CSIT"},{"name":"BIT/BCA/computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$Regional public university with computing programs$mt$]::text[],
  $mt$To enrich from current institutional notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":null,"sourceSheet":"IT Colleges Directory"}$mt$::jsonb,
  $mt$https://fwu.edu.np/$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$far-western-university$mt$) OR lower(name) = lower($mt$Far Western University$mt$)
);

UPDATE public.institutes SET
  description = $mt$Thames International College is a leading higher education and management studies institution located in Old Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BCA, BA/other management programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BCA"},{"name":"BA/other management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Old Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$thames-international-college$mt$) OR lower(name) = lower($mt$Thames International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Thames International College$mt$, $mt$thames-international-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Old Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Thames International College is a leading higher education and management studies institution located in Old Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BCA, BA/other management programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BCA"},{"name":"BA/other management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$thames-international-college$mt$) OR lower(name) = lower($mt$Thames International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Texas College of Management and IT is a leading higher education and management studies institution located in Siphal / Mitrapark, Kathmandu, Bagmati. Affiliated with Lincoln University College; Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, BBS, BSc CSIT, other management/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"BBS"},{"name":"BSc CSIT"},{"name":"other management/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Siphal / Mitrapark, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Lincoln University College; Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$texas-college-of-management-and-it$mt$) OR lower(name) = lower($mt$Texas College of Management and IT$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Texas College of Management and IT$mt$, $mt$texas-college-of-management-and-it$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Siphal / Mitrapark, Kathmandu, Bagmati$mt$, $mt$Lincoln University College; Tribhuvan University$mt$,
  NULL,
  $mt$Texas College of Management and IT is a leading higher education and management studies institution located in Siphal / Mitrapark, Kathmandu, Bagmati. Affiliated with Lincoln University College; Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, BBS, BSc CSIT, other management/IT programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"BBS"},{"name":"BSc CSIT"},{"name":"other management/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$texas-college-of-management-and-it$mt$) OR lower(name) = lower($mt$Texas College of Management and IT$mt$)
);

UPDATE public.institutes SET
  description = $mt$National College of Management and Technical Science (NCMT College) is a leading higher education and management studies institution located in Samakhusi, Ranibari, Kathmandu, Bagmati. Affiliated with Lincoln University College, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, IT/business programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Samakhusi, Ranibari, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Lincoln University College$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$national-college-of-management-and-technical-science-ncmt-college$mt$) OR lower(name) = lower($mt$National College of Management and Technical Science (NCMT College)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$National College of Management and Technical Science (NCMT College)$mt$, $mt$national-college-of-management-and-technical-science-ncmt-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Samakhusi, Ranibari, Kathmandu, Bagmati$mt$, $mt$Lincoln University College$mt$,
  NULL,
  $mt$National College of Management and Technical Science (NCMT College) is a leading higher education and management studies institution located in Samakhusi, Ranibari, Kathmandu, Bagmati. Affiliated with Lincoln University College, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, IT/business programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"IT/business programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-college-of-management-and-technical-science-ncmt-college$mt$) OR lower(name) = lower($mt$National College of Management and Technical Science (NCMT College)$mt$)
);

UPDATE public.institutes SET
  description = $mt$School of Arts, Sciences, & Technology (SAST) is a leading higher education and management studies institution located in Lazimpat, Kathmandu, Bagmati. Affiliated with University of Nepal, the institution adheres to competitive academic standards. Key offered programs include BBA, Computer Science/IT, integrated science, economics, sustainability-related programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"Computer Science/IT"},{"name":"integrated science"},{"name":"economics"},{"name":"sustainability-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lazimpat, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$University of Nepal$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$school-of-arts-sciences-technology-sast$mt$) OR lower(name) = lower($mt$School of Arts, Sciences, & Technology (SAST)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$School of Arts, Sciences, & Technology (SAST)$mt$, $mt$school-of-arts-sciences-technology-sast$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Lazimpat, Kathmandu, Bagmati$mt$, $mt$University of Nepal$mt$,
  NULL,
  $mt$School of Arts, Sciences, & Technology (SAST) is a leading higher education and management studies institution located in Lazimpat, Kathmandu, Bagmati. Affiliated with University of Nepal, the institution adheres to competitive academic standards. Key offered programs include BBA, Computer Science/IT, integrated science, economics, sustainability-related programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"Computer Science/IT"},{"name":"integrated science"},{"name":"economics"},{"name":"sustainability-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / National","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-arts-sciences-technology-sast$mt$) OR lower(name) = lower($mt$School of Arts, Sciences, & Technology (SAST)$mt$)
);

UPDATE public.institutes SET
  description = $mt$People's Campus is a leading higher education and management studies institution located in Paknajol, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Paknajol, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$peoples-campus$mt$) OR lower(name) = lower($mt$People's Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$People's Campus$mt$, $mt$peoples-campus$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Paknajol, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$People's Campus is a leading higher education and management studies institution located in Paknajol, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, management programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Community","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$peoples-campus$mt$) OR lower(name) = lower($mt$People's Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Janamaitri Campus is a leading higher education and management studies institution located in Kuleshwor, Kathmandu, Bagmati. Affiliated with Bagmati University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, B.Ed and other programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"B.Ed and other programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kuleshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Bagmati University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$janamaitri-campus$mt$) OR lower(name) = lower($mt$Janamaitri Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Janamaitri Campus$mt$, $mt$janamaitri-campus$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Kuleshwor, Kathmandu, Bagmati$mt$, $mt$Bagmati University$mt$,
  NULL,
  $mt$Janamaitri Campus is a leading higher education and management studies institution located in Kuleshwor, Kathmandu, Bagmati. Affiliated with Bagmati University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, B.Ed and other programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"B.Ed and other programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Community","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janamaitri-campus$mt$) OR lower(name) = lower($mt$Janamaitri Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kantipur College of Management and Information Technology is a leading higher education and management studies institution located in Mid Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BITM/BIM, IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BITM/BIM"},{"name":"IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mid Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kantipur-college-of-management-and-information-technology$mt$) OR lower(name) = lower($mt$Kantipur College of Management and Information Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kantipur College of Management and Information Technology$mt$, $mt$kantipur-college-of-management-and-information-technology$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Mid Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Kantipur College of Management and Information Technology is a leading higher education and management studies institution located in Mid Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BITM/BIM, IT programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BITM/BIM"},{"name":"IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-college-of-management-and-information-technology$mt$) OR lower(name) = lower($mt$Kantipur College of Management and Information Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$Modern Nepal College is a leading higher education and management studies institution located in Sorhakhutte, Naya Bazar, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BITM, management programs, management/IT.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BITM"},{"name":"management programs"},{"name":"management/IT"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Sorhakhutte, Naya Bazar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$modern-nepal-college$mt$) OR lower(name) = lower($mt$Modern Nepal College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Modern Nepal College$mt$, $mt$modern-nepal-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Sorhakhutte, Naya Bazar, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Modern Nepal College is a leading higher education and management studies institution located in Sorhakhutte, Naya Bazar, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BITM, management programs, management/IT.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BITM"},{"name":"management programs"},{"name":"management/IT"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$modern-nepal-college$mt$) OR lower(name) = lower($mt$Modern Nepal College$mt$)
);

UPDATE public.institutes SET
  description = $mt$KFA Business School is a leading higher education and management studies institution located in Mid Baneshwor, Kathmandu, Bagmati. Affiliated with Lincoln University College, Malaysia, the institution adheres to competitive academic standards. Key offered programs include BBA, business/management programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"business/management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mid Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Lincoln University College, Malaysia$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kfa-business-school$mt$) OR lower(name) = lower($mt$KFA Business School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$KFA Business School$mt$, $mt$kfa-business-school$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Mid Baneshwor, Kathmandu, Bagmati$mt$, $mt$Lincoln University College, Malaysia$mt$,
  NULL,
  $mt$KFA Business School is a leading higher education and management studies institution located in Mid Baneshwor, Kathmandu, Bagmati. Affiliated with Lincoln University College, Malaysia, the institution adheres to competitive academic standards. Key offered programs include BBA, business/management programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"business/management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kfa-business-school$mt$) OR lower(name) = lower($mt$KFA Business School$mt$)
);

UPDATE public.institutes SET
  description = $mt$Presidential Graduate School is a leading higher education and management studies institution located in Thapagaun, New Baneshwor, Kathmandu, Bagmati. Affiliated with Westcliff University, USA, the institution adheres to competitive academic standards. Key offered programs include BBA, business/management and technology-related programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"business/management and technology-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Thapagaun, New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Westcliff University, USA$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$presidential-graduate-school$mt$) OR lower(name) = lower($mt$Presidential Graduate School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Presidential Graduate School$mt$, $mt$presidential-graduate-school$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Thapagaun, New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Westcliff University, USA$mt$,
  NULL,
  $mt$Presidential Graduate School is a leading higher education and management studies institution located in Thapagaun, New Baneshwor, Kathmandu, Bagmati. Affiliated with Westcliff University, USA, the institution adheres to competitive academic standards. Key offered programs include BBA, business/management and technology-related programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"business/management and technology-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$presidential-graduate-school$mt$) OR lower(name) = lower($mt$Presidential Graduate School$mt$)
);

UPDATE public.institutes SET
  description = $mt$KIST College & SS is a leading higher education and management studies institution located in Kamalpokhari, Kathmandu, Bagmati. Affiliated with Tribhuvan University; Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BIT, BSc CSIT, BCA.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BIT"},{"name":"BSc CSIT"},{"name":"BCA"},{"name":"BHM"},{"name":"science/management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kamalpokhari, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University; Purbanchal University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kist-college-ss$mt$) OR lower(name) = lower($mt$KIST College & SS$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$KIST College & SS$mt$, $mt$kist-college-ss$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Kamalpokhari, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University; Purbanchal University$mt$,
  NULL,
  $mt$KIST College & SS is a leading higher education and management studies institution located in Kamalpokhari, Kathmandu, Bagmati. Affiliated with Tribhuvan University; Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, BIT, BSc CSIT, BCA.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"BIT"},{"name":"BSc CSIT"},{"name":"BCA"},{"name":"BHM"},{"name":"science/management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kist-college-ss$mt$) OR lower(name) = lower($mt$KIST College & SS$mt$)
);

UPDATE public.institutes SET
  description = $mt$Public Youth Campus is a leading higher education and management studies institution located in Dhobichaur, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, management programs, management.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"management programs"},{"name":"management"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Dhobichaur, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$public-youth-campus$mt$) OR lower(name) = lower($mt$Public Youth Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Public Youth Campus$mt$, $mt$public-youth-campus$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Dhobichaur, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Public Youth Campus is a leading higher education and management studies institution located in Dhobichaur, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, management programs, management.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"management programs"},{"name":"management"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$public-youth-campus$mt$) OR lower(name) = lower($mt$Public Youth Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$Ace International Business School is a leading higher education and management studies institution located in New Baneshwor, Kathmandu, Bagmati. Affiliated with Glasgow Caledonian University, Scotland, the institution adheres to competitive academic standards. Key offered programs include BBA, computing/business programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"computing/business programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Glasgow Caledonian University, Scotland$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$ace-international-business-school$mt$) OR lower(name) = lower($mt$Ace International Business School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Ace International Business School$mt$, $mt$ace-international-business-school$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Glasgow Caledonian University, Scotland$mt$,
  NULL,
  $mt$Ace International Business School is a leading higher education and management studies institution located in New Baneshwor, Kathmandu, Bagmati. Affiliated with Glasgow Caledonian University, Scotland, the institution adheres to competitive academic standards. Key offered programs include BBA, computing/business programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"computing/business programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ace-international-business-school$mt$) OR lower(name) = lower($mt$Ace International Business School$mt$)
);

UPDATE public.institutes SET
  description = $mt$Global College International is a leading higher education and management studies institution located in Mid-Baneshwor, Kathmandu, Bagmati. Affiliated with Mid-West University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, management/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"management/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mid-Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Mid-West University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$global-college-international$mt$) OR lower(name) = lower($mt$Global College International$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Global College International$mt$, $mt$global-college-international$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Mid-Baneshwor, Kathmandu, Bagmati$mt$, $mt$Mid-West University$mt$,
  NULL,
  $mt$Global College International is a leading higher education and management studies institution located in Mid-Baneshwor, Kathmandu, Bagmati. Affiliated with Mid-West University, the institution adheres to competitive academic standards. Key offered programs include BBA, BBS, management/IT programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BBS"},{"name":"management/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$global-college-international$mt$) OR lower(name) = lower($mt$Global College International$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kathmandu Don Bosco College is a leading higher education and management studies institution located in Lazimpat, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, management/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"management/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lazimpat, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathmandu-don-bosco-college$mt$) OR lower(name) = lower($mt$Kathmandu Don Bosco College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathmandu Don Bosco College$mt$, $mt$kathmandu-don-bosco-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Lazimpat, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Kathmandu Don Bosco College is a leading higher education and management studies institution located in Lazimpat, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, management/IT programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"management/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-don-bosco-college$mt$) OR lower(name) = lower($mt$Kathmandu Don Bosco College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Atharva Business College is a leading higher education and management studies institution located in Maharajgunj, Kathmandu, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards. Key offered programs include BBA, business/management programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"business/management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maharajgunj, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Pokhara University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$atharva-business-college$mt$) OR lower(name) = lower($mt$Atharva Business College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Atharva Business College$mt$, $mt$atharva-business-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Maharajgunj, Kathmandu, Bagmati$mt$, $mt$Pokhara University$mt$,
  NULL,
  $mt$Atharva Business College is a leading higher education and management studies institution located in Maharajgunj, Kathmandu, Bagmati. Affiliated with Pokhara University, the institution adheres to competitive academic standards. Key offered programs include BBA, business/management programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"business/management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$atharva-business-college$mt$) OR lower(name) = lower($mt$Atharva Business College$mt$)
);

UPDATE public.institutes SET
  description = $mt$SANN International College is a leading higher education and management studies institution located in Naikap, Chandragiri, Kathmandu, Bagmati. Affiliated with Purbanchal University; Rajarshi Janak University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Naikap, Chandragiri, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University; Rajarshi Janak University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$sann-international-college$mt$) OR lower(name) = lower($mt$SANN International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$SANN International College$mt$, $mt$sann-international-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Naikap, Chandragiri, Kathmandu, Bagmati$mt$, $mt$Purbanchal University; Rajarshi Janak University$mt$,
  NULL,
  $mt$SANN International College is a leading higher education and management studies institution located in Naikap, Chandragiri, Kathmandu, Bagmati. Affiliated with Purbanchal University; Rajarshi Janak University, the institution adheres to competitive academic standards. Key offered programs include BBA, BIT, management programs.$mt$,
  $mt$[{"name":"BBA"},{"name":"BIT"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBA Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sann-international-college$mt$) OR lower(name) = lower($mt$SANN International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Certified College of Accountancy (CCA) is a leading higher education and management studies institution located in Thapagaun, New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University; ACCA, the institution adheres to competitive academic standards. Key offered programs include BBS, ACCA/professional accountancy.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"ACCA/professional accountancy"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Thapagaun, New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University; ACCA$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$certified-college-of-accountancy-cca$mt$) OR lower(name) = lower($mt$Certified College of Accountancy (CCA)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Certified College of Accountancy (CCA)$mt$, $mt$certified-college-of-accountancy-cca$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Thapagaun, New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University; ACCA$mt$,
  NULL,
  $mt$Certified College of Accountancy (CCA) is a leading higher education and management studies institution located in Thapagaun, New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University; ACCA, the institution adheres to competitive academic standards. Key offered programs include BBS, ACCA/professional accountancy.$mt$,
  $mt$[{"name":"BBS"},{"name":"ACCA/professional accountancy"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$certified-college-of-accountancy-cca$mt$) OR lower(name) = lower($mt$Certified College of Accountancy (CCA)$mt$)
);

UPDATE public.institutes SET
  description = $mt$Global College of Management is a leading higher education and management studies institution located in Mid-Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Mid-Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$global-college-of-management$mt$) OR lower(name) = lower($mt$Global College of Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Global College of Management$mt$, $mt$global-college-of-management$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Mid-Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Global College of Management is a leading higher education and management studies institution located in Mid-Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$global-college-of-management$mt$) OR lower(name) = lower($mt$Global College of Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$New Summit College is a leading higher education and management studies institution located in Shantinagar Gate, New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Shantinagar Gate, New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$new-summit-college$mt$) OR lower(name) = lower($mt$New Summit College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$New Summit College$mt$, $mt$new-summit-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Shantinagar Gate, New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$New Summit College is a leading higher education and management studies institution located in Shantinagar Gate, New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$new-summit-college$mt$) OR lower(name) = lower($mt$New Summit College$mt$)
);

UPDATE public.institutes SET
  description = $mt$St. Xavier's College, Maitighar is a leading higher education and management studies institution located in Maitighar, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, science/IT and management-related programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"science/IT and management-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maitighar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$st-xaviers-college-maitighar$mt$) OR lower(name) = lower($mt$St. Xavier's College, Maitighar$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$St. Xavier's College, Maitighar$mt$, $mt$st-xaviers-college-maitighar$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Maitighar, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$St. Xavier's College, Maitighar is a leading higher education and management studies institution located in Maitighar, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, science/IT and management-related programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"science/IT and management-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$st-xaviers-college-maitighar$mt$) OR lower(name) = lower($mt$St. Xavier's College, Maitighar$mt$)
);

UPDATE public.institutes SET
  description = $mt$NIST Higher Education is a leading higher education and management studies institution located in Lainchour, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, science/management programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"science/management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lainchour, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$nist-higher-education$mt$) OR lower(name) = lower($mt$NIST Higher Education$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$NIST Higher Education$mt$, $mt$nist-higher-education$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Lainchour, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$NIST Higher Education is a leading higher education and management studies institution located in Lainchour, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, science/management programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"science/management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nist-higher-education$mt$) OR lower(name) = lower($mt$NIST Higher Education$mt$)
);

UPDATE public.institutes SET
  description = $mt$Academia International College is a leading higher education and management studies institution located in Gwarko Chowk, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/science/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gwarko Chowk, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$academia-international-college$mt$) OR lower(name) = lower($mt$Academia International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Academia International College$mt$, $mt$academia-international-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Gwarko Chowk, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Academia International College is a leading higher education and management studies institution located in Gwarko Chowk, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science/IT programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/science/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$academia-international-college$mt$) OR lower(name) = lower($mt$Academia International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Nesfield International College is a leading higher education and management studies institution located in Lagankhel, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management/hospitality programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management/hospitality programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lagankhel, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$nesfield-international-college$mt$) OR lower(name) = lower($mt$Nesfield International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nesfield International College$mt$, $mt$nesfield-international-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Lagankhel, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Nesfield International College is a leading higher education and management studies institution located in Lagankhel, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management/hospitality programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management/hospitality programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nesfield-international-college$mt$) OR lower(name) = lower($mt$Nesfield International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Nepal Mega College is a leading higher education and management studies institution located in Babarmahal, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Babarmahal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$nepal-mega-college$mt$) OR lower(name) = lower($mt$Nepal Mega College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Nepal Mega College$mt$, $mt$nepal-mega-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Babarmahal, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Nepal Mega College is a leading higher education and management studies institution located in Babarmahal, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-mega-college$mt$) OR lower(name) = lower($mt$Nepal Mega College$mt$)
);

UPDATE public.institutes SET
  description = $mt$DAV College is a leading higher education and management studies institution located in Bhanimandal, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science/IT-related programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/science/IT-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bhanimandal, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$dav-college$mt$) OR lower(name) = lower($mt$DAV College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$DAV College$mt$, $mt$dav-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Bhanimandal, Lalitpur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$DAV College is a leading higher education and management studies institution located in Bhanimandal, Lalitpur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science/IT-related programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/science/IT-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dav-college$mt$) OR lower(name) = lower($mt$DAV College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Ed-Mark College is a leading higher education and management studies institution located in Kalanki, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kalanki, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$ed-mark-college$mt$) OR lower(name) = lower($mt$Ed-Mark College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Ed-Mark College$mt$, $mt$ed-mark-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Kalanki, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Ed-Mark College is a leading higher education and management studies institution located in Kalanki, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ed-mark-college$mt$) OR lower(name) = lower($mt$Ed-Mark College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kalika Multiple Campus is a leading higher education and management studies institution located in Kajipokhari, Pokhara, Kaski, Gandaki. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/humanities programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/humanities programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Kajipokhari, Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kalika-multiple-campus$mt$) OR lower(name) = lower($mt$Kalika Multiple Campus$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kalika Multiple Campus$mt$, $mt$kalika-multiple-campus$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Kajipokhari, Pokhara, Kaski, Gandaki$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Kalika Multiple Campus is a leading higher education and management studies institution located in Kajipokhari, Pokhara, Kaski, Gandaki. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/humanities programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/humanities programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Community","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kalika-multiple-campus$mt$) OR lower(name) = lower($mt$Kalika Multiple Campus$mt$)
);

UPDATE public.institutes SET
  description = $mt$REHDON College & School is a leading higher education and management studies institution located in Samakhushi, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Samakhushi, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$rehdon-college-school$mt$) OR lower(name) = lower($mt$REHDON College & School$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$REHDON College & School$mt$, $mt$rehdon-college-school$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Samakhushi, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$REHDON College & School is a leading higher education and management studies institution located in Samakhushi, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management/science programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management/science programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$rehdon-college-school$mt$) OR lower(name) = lower($mt$REHDON College & School$mt$)
);

UPDATE public.institutes SET
  description = $mt$Universal College is a leading higher education and management studies institution located in Maitidevi, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maitidevi, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$universal-college$mt$) OR lower(name) = lower($mt$Universal College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Universal College$mt$, $mt$universal-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Maitidevi, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Universal College is a leading higher education and management studies institution located in Maitidevi, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$universal-college$mt$) OR lower(name) = lower($mt$Universal College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Madan Bhandari Memorial College is a leading higher education and management studies institution located in New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$madan-bhandari-memorial-college$mt$) OR lower(name) = lower($mt$Madan Bhandari Memorial College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Madan Bhandari Memorial College$mt$, $mt$madan-bhandari-memorial-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Madan Bhandari Memorial College is a leading higher education and management studies institution located in New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management/IT programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / Community","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$madan-bhandari-memorial-college$mt$) OR lower(name) = lower($mt$Madan Bhandari Memorial College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Premier College is a leading higher education and management studies institution located in New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$premier-college$mt$) OR lower(name) = lower($mt$Premier College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Premier College$mt$, $mt$premier-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Premier College is a leading higher education and management studies institution located in New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BBA, management programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"BBA"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$premier-college$mt$) OR lower(name) = lower($mt$Premier College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Samriddhi College is a leading higher education and management studies institution located in Lokanthali, Madhyapur Thimi, Bhaktapur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Lokanthali, Madhyapur Thimi, Bhaktapur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$samriddhi-college$mt$) OR lower(name) = lower($mt$Samriddhi College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Samriddhi College$mt$, $mt$samriddhi-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Lokanthali, Madhyapur Thimi, Bhaktapur, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Samriddhi College is a leading higher education and management studies institution located in Lokanthali, Madhyapur Thimi, Bhaktapur, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$samriddhi-college$mt$) OR lower(name) = lower($mt$Samriddhi College$mt$)
);

UPDATE public.institutes SET
  description = $mt$NCA College of Management is a leading higher education and management studies institution located in Minbhawan, New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Minbhawan, New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$nca-college-of-management$mt$) OR lower(name) = lower($mt$NCA College of Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$NCA College of Management$mt$, $mt$nca-college-of-management$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Minbhawan, New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$NCA College of Management is a leading higher education and management studies institution located in Minbhawan, New Baneshwor, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, management programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nca-college-of-management$mt$) OR lower(name) = lower($mt$NCA College of Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kathmandu BernHardt College is a leading higher education and management studies institution located in Bafal, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BSc CSIT, management/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BBS"},{"name":"BSc CSIT"},{"name":"management/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bafal, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Tribhuvan University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathmandu-bernhardt-college$mt$) OR lower(name) = lower($mt$Kathmandu BernHardt College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathmandu BernHardt College$mt$, $mt$kathmandu-bernhardt-college$mt$, $mt$management$mt$,
  $mt$college$mt$, $mt$Bafal, Kathmandu, Bagmati$mt$, $mt$Tribhuvan University$mt$,
  NULL,
  $mt$Kathmandu BernHardt College is a leading higher education and management studies institution located in Bafal, Kathmandu, Bagmati. Affiliated with Tribhuvan University, the institution adheres to competitive academic standards. Key offered programs include BBS, BSc CSIT, management/IT programs.$mt$,
  $mt$[{"name":"BBS"},{"name":"BSc CSIT"},{"name":"management/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"BBS Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-bernhardt-college$mt$) OR lower(name) = lower($mt$Kathmandu BernHardt College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Kathipur International College is a leading engineering and technology institution located in Buddhanagar, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include Engineering/technology and management-related programs.$mt$,
  courses_offered = $mt$[{"name":"Engineering/technology and management-related programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Buddhanagar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kathipur-international-college$mt$) OR lower(name) = lower($mt$Kathipur International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Kathipur International College$mt$, $mt$kathipur-international-college$mt$, $mt$engineering$mt$,
  $mt$college$mt$, $mt$Buddhanagar, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Kathipur International College is a leading engineering and technology institution located in Buddhanagar, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include Engineering/technology and management-related programs.$mt$,
  $mt$[{"name":"Engineering/technology and management-related programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"Engineering Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathipur-international-college$mt$) OR lower(name) = lower($mt$Kathipur International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Mid-Valley International College is a leading information technology and computing institution located in Gyaneshwor, Kathmandu, Bagmati. Affiliated with HELP University, Malaysia, the institution adheres to competitive academic standards. Key offered programs include BSc IT / computing, management programs.$mt$,
  courses_offered = $mt$[{"name":"BSc IT / computing"},{"name":"management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gyaneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$HELP University, Malaysia$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$mid-valley-international-college$mt$) OR lower(name) = lower($mt$Mid-Valley International College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Mid-Valley International College$mt$, $mt$mid-valley-international-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Gyaneshwor, Kathmandu, Bagmati$mt$, $mt$HELP University, Malaysia$mt$,
  NULL,
  $mt$Mid-Valley International College is a leading information technology and computing institution located in Gyaneshwor, Kathmandu, Bagmati. Affiliated with HELP University, Malaysia, the institution adheres to competitive academic standards. Key offered programs include BSc IT / computing, management programs.$mt$,
  $mt$[{"name":"BSc IT / computing"},{"name":"management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mid-valley-international-college$mt$) OR lower(name) = lower($mt$Mid-Valley International College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Southwestern School of Management and Technology is a leading information technology and computing institution located in Basundhara, Dhapashi, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BIT, management/technology programs.$mt$,
  courses_offered = $mt$[{"name":"BIT"},{"name":"management/technology programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Basundhara, Dhapashi, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$southwestern-school-of-management-and-technology$mt$) OR lower(name) = lower($mt$Southwestern School of Management and Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Southwestern School of Management and Technology$mt$, $mt$southwestern-school-of-management-and-technology$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Basundhara, Dhapashi, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Southwestern School of Management and Technology is a leading information technology and computing institution located in Basundhara, Dhapashi, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BIT, management/technology programs.$mt$,
  $mt$[{"name":"BIT"},{"name":"management/technology programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$southwestern-school-of-management-and-technology$mt$) OR lower(name) = lower($mt$Southwestern School of Management and Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$Padmashree College is a leading information technology and computing institution located in Tinkune, Kathmandu, Bagmati. Affiliated with Nilai University, Malaysia, the institution adheres to competitive academic standards. Key offered programs include BIT, IT/computing and management programs.$mt$,
  courses_offered = $mt$[{"name":"BIT"},{"name":"IT/computing and management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Tinkune, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Nilai University, Malaysia$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$padmashree-college$mt$) OR lower(name) = lower($mt$Padmashree College$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Padmashree College$mt$, $mt$padmashree-college$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Tinkune, Kathmandu, Bagmati$mt$, $mt$Nilai University, Malaysia$mt$,
  NULL,
  $mt$Padmashree College is a leading information technology and computing institution located in Tinkune, Kathmandu, Bagmati. Affiliated with Nilai University, Malaysia, the institution adheres to competitive academic standards. Key offered programs include BIT, IT/computing and management programs.$mt$,
  $mt$[{"name":"BIT"},{"name":"IT/computing and management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$padmashree-college$mt$) OR lower(name) = lower($mt$Padmashree College$mt$)
);

UPDATE public.institutes SET
  description = $mt$Model Institute of Technology (MIT) is a leading information technology and computing institution located in Bagbazar, Kathmandu, Bagmati. Affiliated with International American University, the institution adheres to competitive academic standards. Key offered programs include BIT, business/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BIT"},{"name":"business/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Bagbazar, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$International American University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$model-institute-of-technology-mit$mt$) OR lower(name) = lower($mt$Model Institute of Technology (MIT)$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Model Institute of Technology (MIT)$mt$, $mt$model-institute-of-technology-mit$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Bagbazar, Kathmandu, Bagmati$mt$, $mt$International American University$mt$,
  NULL,
  $mt$Model Institute of Technology (MIT) is a leading information technology and computing institution located in Bagbazar, Kathmandu, Bagmati. Affiliated with International American University, the institution adheres to competitive academic standards. Key offered programs include BIT, business/IT programs.$mt$,
  $mt$[{"name":"BIT"},{"name":"business/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$model-institute-of-technology-mit$mt$) OR lower(name) = lower($mt$Model Institute of Technology (MIT)$mt$)
);

UPDATE public.institutes SET
  description = $mt$KCM is a leading information technology and computing institution located in Gwarko, Lalitpur, Bagmati. Affiliated with Siam University, Thailand, the institution adheres to competitive academic standards. Key offered programs include BSc Information Technology, business/management programs.$mt$,
  courses_offered = $mt$[{"name":"BSc Information Technology"},{"name":"business/management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Gwarko, Lalitpur, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Siam University, Thailand$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$kcm$mt$) OR lower(name) = lower($mt$KCM$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$KCM$mt$, $mt$kcm$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Gwarko, Lalitpur, Bagmati$mt$, $mt$Siam University, Thailand$mt$,
  NULL,
  $mt$KCM is a leading information technology and computing institution located in Gwarko, Lalitpur, Bagmati. Affiliated with Siam University, Thailand, the institution adheres to competitive academic standards. Key offered programs include BSc Information Technology, business/management programs.$mt$,
  $mt$[{"name":"BSc Information Technology"},{"name":"business/management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kcm$mt$) OR lower(name) = lower($mt$KCM$mt$)
);

UPDATE public.institutes SET
  description = $mt$Phoenix College of Management is a leading information technology and computing institution located in Maitidevi, Kathmandu, Bagmati. Affiliated with Lincoln University College, the institution adheres to competitive academic standards. Key offered programs include BIT, business/management programs.$mt$,
  courses_offered = $mt$[{"name":"BIT"},{"name":"business/management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Maitidevi, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Lincoln University College$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$phoenix-college-of-management$mt$) OR lower(name) = lower($mt$Phoenix College of Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Phoenix College of Management$mt$, $mt$phoenix-college-of-management$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Maitidevi, Kathmandu, Bagmati$mt$, $mt$Lincoln University College$mt$,
  NULL,
  $mt$Phoenix College of Management is a leading information technology and computing institution located in Maitidevi, Kathmandu, Bagmati. Affiliated with Lincoln University College, the institution adheres to competitive academic standards. Key offered programs include BIT, business/management programs.$mt$,
  $mt$[{"name":"BIT"},{"name":"business/management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$phoenix-college-of-management$mt$) OR lower(name) = lower($mt$Phoenix College of Management$mt$)
);

UPDATE public.institutes SET
  description = $mt$Asian College of Management and Technology is a leading information technology and computing institution located in Min Bhawan, New Baneshwor, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BIT, management/IT programs.$mt$,
  courses_offered = $mt$[{"name":"BIT"},{"name":"management/IT programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Min Bhawan, New Baneshwor, Kathmandu, Bagmati$mt$),
  affiliation = COALESCE(affiliation, $mt$Purbanchal University$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$asian-college-of-management-and-technology$mt$) OR lower(name) = lower($mt$Asian College of Management and Technology$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Asian College of Management and Technology$mt$, $mt$asian-college-of-management-and-technology$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Min Bhawan, New Baneshwor, Kathmandu, Bagmati$mt$, $mt$Purbanchal University$mt$,
  NULL,
  $mt$Asian College of Management and Technology is a leading information technology and computing institution located in Min Bhawan, New Baneshwor, Kathmandu, Bagmati. Affiliated with Purbanchal University, the institution adheres to competitive academic standards. Key offered programs include BIT, management/IT programs.$mt$,
  $mt$[{"name":"BIT"},{"name":"management/IT programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-college-of-management-and-technology$mt$) OR lower(name) = lower($mt$Asian College of Management and Technology$mt$)
);

UPDATE public.institutes SET
  description = $mt$Infomax College of Information Technology and Management is a leading information technology and computing institution located in Ranipauwa, Pokhara, Kaski, Gandaki. Affiliated with Asia Pacific University of Technology & Innovation, the institution adheres to competitive academic standards. Key offered programs include BSc IT, IT and management programs.$mt$,
  courses_offered = $mt$[{"name":"BSc IT"},{"name":"IT and management programs"}]$mt$::jsonb,
  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ARRAY[]::text[] ELSE salient_features END,
  location = COALESCE(location, $mt$Ranipauwa, Pokhara, Kaski, Gandaki$mt$),
  affiliation = COALESCE(affiliation, $mt$Asia Pacific University of Technology & Innovation$mt$),
  source_url = COALESCE(source_url, NULL),
  updated_at = now()
WHERE lower(slug) = lower($mt$infomax-college-of-information-technology-and-management$mt$) OR lower(name) = lower($mt$Infomax College of Information Technology and Management$mt$);

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  description, courses_offered, salient_features, scholarships,
  admission_guidelines, established_year, admission_status,
  contact_email, contact_phone, contact_info, source_url,
  status, applications_enabled, is_verified, is_featured
)
SELECT
  $mt$Infomax College of Information Technology and Management$mt$, $mt$infomax-college-of-information-technology-and-management$mt$, $mt$it$mt$,
  $mt$college$mt$, $mt$Ranipauwa, Pokhara, Kaski, Gandaki$mt$, $mt$Asia Pacific University of Technology & Innovation$mt$,
  NULL,
  $mt$Infomax College of Information Technology and Management is a leading information technology and computing institution located in Ranipauwa, Pokhara, Kaski, Gandaki. Affiliated with Asia Pacific University of Technology & Innovation, the institution adheres to competitive academic standards. Key offered programs include BSc IT, IT and management programs.$mt$,
  $mt$[{"name":"BSc IT"},{"name":"IT and management programs"}]$mt$::jsonb,
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private / International","rawContact":"To enrich from official profile","sourceSheet":"IT Append 2026-08-11"}$mt$::jsonb,
  NULL,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$infomax-college-of-information-technology-and-management$mt$) OR lower(name) = lower($mt$Infomax College of Information Technology and Management$mt$)
);

COMMIT;