-- Auto-generated from Nepal_Engineering_Colleges_FINAL_Directory_Snapshot_2026.xlsx
-- Generated: 2026-08-11T14:38:03.589Z
-- Total institutions: 210
-- Uses INSERT ... WHERE NOT EXISTS for safe idempotent application.

BEGIN;

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Imperial+College+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$imperial-college-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Khwopa+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$khwopa-college-of-engineering$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$khwopa-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Khwopa+Polytechnic+Institute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$khwopa-polytechnic-institute$mt$)
);

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
  $mt$https://edusanjal.com/college/?q=Nepal+Engineering+College+(NEC)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-engineering-college-nec$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Chitwan+Engineering+Campus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$chitwan-engineering-campus$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Nepal+Polytechnic+Institute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-polytechnic-institute$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=United+Technical+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$united-technical-college$mt$)
);

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
  $mt$[{"name":"BE Civil"},{"name":"BE Computer"},{"name":"B.Arch"},{"name":"BIT (Edusanjal listing also describes additional graduate engineering programs)"}]$mt$::jsonb,
  ARRAY[$mt$Smart air-conditioned classrooms$mt$, $mt$alumni network$mt$, $mt$cafeteria$mt$, $mt$futsal/basketball/table tennis$mt$, $mt$student-friendly environment.$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  2000,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"01-5382962; 01-5380445; 01-5670924; 01-5670925; 9841470160 | acme@acme.edu.np","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Acme+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$acme-engineering-college$mt$)
);

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
  $mt$https://edusanjal.com/college/?q=Advanced+College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$advanced-college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Aryan+School+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$aryan-school-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=College+of+Information+Technology+and+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$college-of-information-technology-and-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Cosmos+College+of+Management+and+Technology$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$cosmos-college-of-management-and-technology$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Geomatics+Institute+of+Technology$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$geomatics-institute-of-technology$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Hillside+College+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$hillside-college-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Himalayan+College+of+Geomatic+Engineering+and+Land+Resource+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalayan-college-of-geomatic-engineering-and-land-resource-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Himalayan+WhiteHouse+International+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalayan-whitehouse-international-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"},{"name":"BSc CSIT"},{"name":"BIT"},{"name":"IT/computing programs"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Kantipur+City+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-city-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Kantipur+International+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-international-college$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Community","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Kapan+Campus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kapan-campus$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Community","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Kapan+Multiple+Campus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kapan-multiple-campus$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Kathmandu+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Morgan+Engineering+and+Management+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$morgan-engineering-and-management-college$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Oxford+Advanced+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$oxford-advanced-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=School+of+Environmental+Management+and+Sustainable+Development+(SchEMS)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-environmental-management-and-sustainable-development-schems$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"},{"name":"BSc (Hons) Software Engineering"},{"name":"BSc (Hons) Ethical Hacking & Cybersecurity / computing-related programs"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private/International","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Softwarica+College+of+IT+and+E-commerce$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$softwarica-college-of-it-and-e-commerce$mt$)
);

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
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  1930,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Thapathali+Campus+|+Institute+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$thapathali-campus-institute-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Yeti+International+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$yeti-international-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-university-school-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"},{"name":"Engineering"},{"name":"Electrical/Electronics"},{"name":"Computer"},{"name":"Hospitality"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Nepal+Banepa+Polytechnic+Institute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-banepa-polytechnic-institute$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Asian+Institute+of+Technology+and+Management+(AITM)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-institute-of-technology-and-management-aitm$mt$)
);

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
  $mt$https://edusanjal.com/college/?q=Everest+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$everest-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Himalaya+College+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalaya-college-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Himalayan+Institute+of+Science+and+Technology+(HIST)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$himalayan-institute-of-science-and-technology-hist$mt$)
);

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
  $mt$https://edusanjal.com/college/?q=Kantipur+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"},{"name":"BSc CSIT"},{"name":"BE Computer"},{"name":"Computer/IT programs"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Kathford+International+College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathford-international-college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Lalitpur+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lalitpur-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Lumbini+International+Academy+of+Science+and+Technology$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lumbini-international-academy-of-science-and-technology$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Mega+College+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mega-college-of-engineering$mt$)
);

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
  $mt$https://edusanjal.com/college/?q=National+College+of+Engineering+(NCE)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-college-of-engineering-nce$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=National+Institute+of+Engineering+and+Technology+(NIET)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-institute-of-engineering-and-technology-niet$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"},{"name":"BE Computer"},{"name":"BE Software"},{"name":"BCA/IT-related programs"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Nepal+College+of+Information+Technology+(NCIT)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-college-of-information-technology-ncit$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Nepal+Open+University$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-open-university$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Pulchowk+Campus+|+Institute+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pulchowk-campus-institute-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Ritz+College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ritz-college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Sagarmatha+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sagarmatha-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Universal+Engineering+and+Science+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$universal-engineering-and-science-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Gandaki+College+of+Engineering+and+Science$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-college-of-engineering-and-science$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Pashchimanchal+Campus+|+Institute+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pashchimanchal-campus-institute-of-engineering$mt$)
);

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
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  1999,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Pokhara+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-engineering-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-engineering-pokhara-university$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Oxford+College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$oxford-college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Western+Advance+College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$western-advance-college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"},{"name":"Engineering"},{"name":"Electrical"},{"name":"Agriculture"},{"name":"Animal Science"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Karnali+Technical+School$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$karnali-technical-school$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Graduate+School+of+Engineering+|+Mid-West+University$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$graduate-school-of-engineering-mid-west-university$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Community","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Dhulabari+Campus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dhulabari-campus$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Pathivara+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pathivara-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Eastern+College+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$eastern-college-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Madan+Bhandari+Memorial+Academy$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$madan-bhandari-memorial-academy$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Madan+Bhandari+Memorial+Academy+Nepal$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$madan-bhandari-memorial-academy-nepal$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Manmohan+Memorial+Polytechnic$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$manmohan-memorial-polytechnic$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$purbanchal-university-school-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=School+of+Engineering+-+Manmohan+Technical+University$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-engineering-manmohan-technical-university$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Purwanchal+Campus+|+Institute+of+Engineering$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$purwanchal-campus-institute-of-engineering$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Bheri+College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bheri-college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=College+of+Engineering+and+Management$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$college-of-engineering-and-management$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Institute+of+Engineering+and+Information+Technology+|+Lumbini+Technological+University$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$institute-of-engineering-and-information-technology-lumbini-technological-university$mt$)
);

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
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Rapti+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$rapti-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Lumbini+Engineering,+Management+&+Science+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lumbini-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Not verified","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Central+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$central-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Janakpur+Engineering+College$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janakpur-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Gaushala+Engineering+Campus$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gaushala-engineering-campus$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=National+Academy+of+Science+and+Technology+(Dhangadhi+Engineering+College)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dhangadhi-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Private","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=National+Academy+of+Science+and+Technology+(Dhangadi+Engineering+College)$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-academy-of-science-and-technology-dhangadi-engineering-college$mt$)
);

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
  $mt$To be enriched from the individual Edusanjal college profile$mt$,
  $mt$[{"name":"To be enriched from the individual Edusanjal college profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched from the individual Edusanjal college profile$mt$]::text[],
  $mt$To be enriched from individual profile/admission notice$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Public / Constituent","rawContact":"Not captured in current snapshot","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=School+of+Engineering+|+Far+Western+University$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-engineering-far-western-university$mt$)
);

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
  $mt$To be enriched from the individual institution profile$mt$,
  $mt$[{"name":"To be enriched from official/Edusanjal profile"}]$mt$::jsonb,
  ARRAY[$mt$To be enriched$mt$]::text[],
  $mt$To be enriched$mt$,
  NULL,
  NULL,
  $mt$closed$mt$,
  NULL, NULL,
  $mt${"directoryAsOf":"2026-08-11","ownership":"Community/Technical","rawContact":"To be enriched","sourceSheet":"Engineering Directory"}$mt$::jsonb,
  $mt$https://edusanjal.com/college/?q=Sindhuli+Community+Technical+Institute$mt$,
  'approved', true, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sindhuli-community-technical-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$balaju-school-of-engineering-and-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$shankharapur-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$panauti-technical-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$thaha-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$posta-bahadur-bogati-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ganesh-man-memorial-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mahanagar-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$shahid-yagyashwor-memorial-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$rapti-technical-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nirmal-lama-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lahan-technical-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bp-memorial-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-technical-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-polytechnic-institute-pvt-ltd$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asia-technical-training-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$annapurna-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dhaulagiri-technical-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$tikapur-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sahid-smriti-pratishthan$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$jana-prakash-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$malika-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$shree-krishna-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janajagriti-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bairiya-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$panchakanya-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$bachhauli-secondary-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janjyoti-technical-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kalika-community-school$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$institute-of-community-technical-education$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$chhinnamasta-institute-of-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$everest-technical-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$white-park-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kailali-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sk-institute-of-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$surkhet-technical-school-pvt$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lb-modern-electronic-institute-pvt-ltd$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$peace-technical-training-center-pvt-ltd$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$world-link-technical-training-institute-private-limited$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$narayani-polytechnic-institute-pvt-ltd$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kankai-polytechnic-institute$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$trade-link-training-institute-pvt$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kumakh-college-of-management-and-technical-science$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ace-institute-of-management$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$amrit-science-campus-ascol$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$deerwalk-institute-of-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$herald-college-kathmandu$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$herald-college-kathmandu-international-computing$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$iims-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ismt-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$informatics-college-kathmandu$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$islington-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-college-of-business-management-and-it$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kings-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lord-buddha-education-foundation-lbef$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mahendra-ratna-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nami-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$padma-kanya-multiple-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$prime-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$quest-international-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$saim-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$st-xaviers-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$techspire-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$texas-international-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$the-british-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$the-british-college-kathmandu$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$tribhuvan-university-central-department-of-computer-science-and-information-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$uniglobe-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-university-department-of-computer-science-and-engineering$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-college-of-higher-studies$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-institute-of-technology-management$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pcps-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$patan-multiple-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$gandaki-college-of-engineering-and-sciences$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ismt-college-pokhara$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$infomax-college-of-it-and-management$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$informatics-college-pokhara$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mount-annapurna-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-university-school-of-engineering$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$pokhara-university-school-of-science-and-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$prithvi-narayan-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$soch-college-of-it$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mid-west-university-graduate-school-of-information-technology$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mid-west-university-school-of-engineering$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepalgunj-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mahendra-multiple-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$butwal-multiple-campus$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$lumbini-ict-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$siddhartha-international-college$mt$)
);

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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$far-western-university$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$thames-international-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$texas-college-of-management-and-it$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$national-college-of-management-and-technical-science-ncmt-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$school-of-arts-sciences-technology-sast$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$peoples-campus$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$janamaitri-campus$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kantipur-college-of-management-and-information-technology$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$modern-nepal-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kfa-business-school$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$presidential-graduate-school$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kist-college-ss$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$public-youth-campus$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ace-international-business-school$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$global-college-international$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-don-bosco-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$atharva-business-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$sann-international-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$certified-college-of-accountancy-cca$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$global-college-of-management$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$new-summit-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$st-xaviers-college-maitighar$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nist-higher-education$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$academia-international-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nesfield-international-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nepal-mega-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$dav-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$ed-mark-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kalika-multiple-campus$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$rehdon-college-school$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$universal-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$madan-bhandari-memorial-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$premier-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$samriddhi-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$nca-college-of-management$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathmandu-bernhardt-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kathipur-international-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$mid-valley-international-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$southwestern-school-of-management-and-technology$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$padmashree-college$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$model-institute-of-technology-mit$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$kcm$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$phoenix-college-of-management$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$asian-college-of-management-and-technology$mt$)
);

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
  NULL,
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
  SELECT 1 FROM public.institutes WHERE lower(slug) = lower($mt$infomax-college-of-information-technology-and-management$mt$)
);

COMMIT;