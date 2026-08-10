-- =============================================================
-- Edusanjal College Directory Enrichment Migration
-- Safely enriches existing college directory entries with detailed
-- courses, affiliations, scholarships, salient features, and source URLs
-- sourced from Edusanjal education listings.
-- =============================================================

BEGIN;

-- 1. Thames International College
UPDATE public.institutes
SET
  affiliation = COALESCE(affiliation, 'Tribhuvan University'),
  website = COALESCE(website, 'https://thamesac.edu.np'),
  source_url = COALESCE(source_url, 'https://edusanjal.com/college/thames-international-college/'),
  established_year = COALESCE(established_year, 2002),
  salient_features = ARRAY['State of the art IT Labs', 'Career Counseling Center', 'International Exchange Programs', 'Student Leadership Clubs'],
  scholarships = 'Merit-based scholarships for high academic achievers and need-based financial aid for deserving students.',
  admission_guidelines = 'Applicants must pass the CMAT / entrance examination conducted by Tribhuvan University followed by a personal interview.',
  courses_offered = '[
    {"name": "Bachelor of Business Administration (BBA)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Business Management (BBM)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Computer Application (BCA)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Social Work (BSW)", "degree": "Bachelor", "duration": "4 Years"}
  ]'::jsonb
WHERE slug = 'thames-international-college' OR name ILIKE '%Thames International%';

-- 2. Ace Institute of Management
UPDATE public.institutes
SET
  affiliation = COALESCE(affiliation, 'Pokhara University'),
  website = COALESCE(website, 'https://ace.edu.np'),
  source_url = COALESCE(source_url, 'https://edusanjal.com/college/ace-institute-of-management/'),
  established_year = COALESCE(established_year, 1999),
  salient_features = ARRAY['AACSB Member School', 'Incubation & Entrepreneurship Center', 'Corporate Mentorship', 'Global Internship Placements'],
  scholarships = 'Pokhara University scholarship scheme alongside Ace Merit & Need-based financial grants.',
  admission_guidelines = 'Requires minimum 2.0 GPA in +2 / A Levels, successful performance in Ace Aptitude Test (AAT), and group discussion interview.',
  courses_offered = '[
    {"name": "Bachelor of Business Administration (BBA)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BBA in Banking & Insurance (BBA-BI)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Master of Business Administration (MBA)", "degree": "Master", "duration": "2 Years"}
  ]'::jsonb
WHERE slug = 'ace-institute-of-management' OR name ILIKE '%Ace Institute%';

-- 3. Softwarica College of IT and E-commerce
UPDATE public.institutes
SET
  affiliation = COALESCE(affiliation, 'Coventry University, UK'),
  website = COALESCE(website, 'https://softwarica.edu.np'),
  source_url = COALESCE(source_url, 'https://edusanjal.com/college/softwarica-college-of-it-and-e-commerce/'),
  established_year = COALESCE(established_year, 2010),
  salient_features = ARRAY['100% British University Degree', 'Cyber Security Research Lab', 'Cisco & RedHat Academy', 'Guaranteed Paid Internships'],
  scholarships = 'Coventry University International Excellence Scholarship and Early Bird Academic Bursaries.',
  admission_guidelines = 'High school completion with English proficiency equivalent to IELTS 6.0 or passing Softwarica Placement Assessment.',
  courses_offered = '[
    {"name": "BSc (Hons) Computer Science & Software Engineering", "degree": "Bachelor", "duration": "3 Years"},
    {"name": "BSc (Hons) Cyber Security & Digital Forensics", "degree": "Bachelor", "duration": "3 Years"},
    {"name": "MSc Data Science and Computational Intelligence", "degree": "Master", "duration": "2 Years"}
  ]'::jsonb
WHERE slug = 'softwarica-college-of-it-and-e-commerce' OR name ILIKE '%Softwarica%';

-- 4. Nepal College of Information Technology (NCIT)
UPDATE public.institutes
SET
  affiliation = COALESCE(affiliation, 'Pokhara University'),
  website = COALESCE(website, 'https://ncit.edu.np'),
  source_url = COALESCE(source_url, 'https://edusanjal.com/college/nepal-college-of-information-technology-ncit/'),
  established_year = COALESCE(established_year, 2001),
  salient_features = ARRAY['Pioneer Engineering College', 'Robotics & AI Research Club', 'High Speed Fiber Network', 'Active Placement Cell'],
  scholarships = 'Full tuition waivers for Pokhara University entrance toppers and semester-wise rank holders.',
  admission_guidelines = 'Pass Pokhara University Engineering Entrance Exam for BE courses and Management Entrance for BBA/BCA.',
  courses_offered = '[
    {"name": "BE Computer Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Software Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Electronics & Communication", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Civil Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Computer Application (BCA)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Business Administration (BBA)", "degree": "Bachelor", "duration": "4 Years"}
  ]'::jsonb
WHERE slug = 'nepal-college-of-information-technology' OR name ILIKE '%NCIT%' OR name ILIKE '%Nepal College of Information Technology%';

-- 5. St. Xavier's College (Maitighar)
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, contact_email, contact_phone,
  source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'St. Xavier''s College',
  'st-xaviers-college-maitighar',
  'college',
  'college',
  'Maitighar, Kathmandu',
  'Tribhuvan University; Kathmandu University',
  'Undergraduate & Postgraduate',
  'https://sxc.edu.np',
  'St. Xavier''s College, Maitighar, is an autonomous Jesuit educational institution in Kathmandu renowned for top academic standards, holistic character building, and excellence in science, management, and humanities education in Nepal.',
  ARRAY['Jesuit Educational Heritage', 'Advanced Science & Computing Labs', 'Social Service & Community Outreach', 'Top Academic Ranks in TU'],
  'Jesuit Need-based Freeships and TU Merit Scholarships.',
  'Highly competitive entrance examination conducted directly by St. Xavier''s College followed by rigorous interview panel.',
  1988,
  '[
    {"name": "BSc Computer Science & Information Technology (BSc CSIT)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Information Management (BIM)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Business Studies (BBS)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Science in Physics / Microbiology", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "MSc Computer Science", "degree": "Master", "duration": "2 Years"}
  ]'::jsonb,
  'info@sxc.edu.np',
  '+977-1-4221150',
  'https://edusanjal.com/college/st-xaviers-college/',
  'approved',
  true,
  true,
  true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

-- 6. Pulchowk Campus - Institute of Engineering (IOE)
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, contact_email, contact_phone,
  source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Pulchowk Campus - Institute of Engineering (IOE)',
  'pulchowk-campus-ioe',
  'engineering',
  'college',
  'Pulchowk, Lalitpur',
  'Tribhuvan University',
  'Undergraduate & Postgraduate',
  'https://pulchowk.ioe.edu.np',
  'Pulchowk Campus is the central constituent campus of the Institute of Engineering (IOE), Tribhuvan University. It is widely regarded as the pinnacle of engineering education and research in Nepal.',
  ARRAY['Premier Engineering Institute in Nepal', 'State-of-the-Art Research Centers', 'LOCUS National Tech Festival', 'High Graduate Employability Globally'],
  'Government-subsidized regular seats for IOE entrance toppers alongside need-based stipend funds.',
  'Admission strictly based on rank achieved in the national IOE Entrance Examination.',
  1972,
  '[
    {"name": "BE Computer Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Civil Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Electronics, Communication & Information Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Electrical Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Mechanical Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "BE Aerospace Engineering", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "MSc Computer Systems & Knowledge Engineering", "degree": "Master", "duration": "2 Years"}
  ]'::jsonb,
  'admin@ioe.edu.np',
  '+977-1-5521231',
  'https://edusanjal.com/college/pulchowk-campus/',
  'approved',
  true,
  true,
  true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

-- 7. Kathmandu BernHardt College
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, contact_email, contact_phone,
  source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Kathmandu BernHardt College',
  'kathmandu-bernhardt-college',
  'college',
  'college',
  'Balkhu, Kathmandu',
  'Tribhuvan University',
  'Undergraduate',
  'https://kbc.edu.np',
  'Kathmandu BernHardt College is a leading institution situated at Balkhu, Kathmandu, offering career-focused IT and management programs affiliated with Tribhuvan University.',
  ARRAY['Dedicated IT Research Wing', 'Industry Project Mentorship', 'Rich Library & Digital Learning Portal', 'Soft Skills Workshops'],
  'TU Merit Scholarships and BernHardt Academic Excellence Awards.',
  'Applicants must pass the TU IOST entrance exam for BSc CSIT or CMAT for BCA/BBM/BBA.',
  2000,
  '[
    {"name": "BSc Computer Science & Information Technology (BSc CSIT)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Computer Application (BCA)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Business Management (BBM)", "degree": "Bachelor", "duration": "4 Years"},
    {"name": "Bachelor of Business Studies (BBS)", "degree": "Bachelor", "duration": "4 Years"}
  ]'::jsonb,
  'info@kbc.edu.np',
  '+977-1-5187140',
  'https://edusanjal.com/college/kathmandu-bernhardt-college/',
  'approved',
  true,
  true,
  false
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

-- 8. Herald College Kathmandu
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, contact_email, contact_phone,
  source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Herald College Kathmandu',
  'herald-college-kathmandu',
  'college',
  'college',
  'Naxal, Kathmandu',
  'University of Wolverhampton, UK',
  'Undergraduate',
  'https://heraldcollege.edu.np',
  'Herald College Kathmandu delivers direct UK university degrees in Information Technology and International Business Management in partnership with University of Wolverhampton.',
  ARRAY['Direct UK Degree', 'Lecture-Tutorial-Workshop Pedagogy', 'Innovate Nepal Group Network', 'UK Summer School Opportunity'],
  'ING Scholarship Scheme & Academic Achievement Grants.',
  'Completion of Higher Secondary (+2) / A-Levels with English proficiency screening.',
  2016,
  '[
    {"name": "BSc (Hons) Computer Science", "degree": "Bachelor", "duration": "3 Years"},
    {"name": "International BBA (Hons)", "degree": "Bachelor", "duration": "3 Years"}
  ]'::jsonb,
  'info@heraldcollege.edu.np',
  '+977-1-4010100',
  'https://edusanjal.com/college/herald-college-kathmandu/',
  'approved',
  true,
  true,
  true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

COMMIT;
