-- =============================================================
-- Bulk Nepal Education Directory Migration (Part 1 - Top Campuses)
-- Generated on 2026-08-10 with rich course data, affiliations,
-- salient features, and Edusanjal source links.
-- =============================================================

BEGIN;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Tri-Chandra Multiple Campus', 'tri-chandra-multiple-campus', 'college', 'college',
  'Ghantaghar, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://trichandra.edu.np', 'Tri-Chandra Multiple Campus is the oldest higher education institution in Nepal, established by Rana Prime Minister Chandra Shumsher. It offers legendary programs in Science, Humanities, and Social Sciences.', ARRAY['Oldest Campus in Nepal', 'Historical Heritage Site', 'Central Location at Ghantaghar', 'High Capacity Labs'],
  'Government of Nepal and TU merit scholarship schemes for top ranking students.', 'Admission based on TU IOST entrance examination for Science streams and merit for Humanities.', 1918,
  '[{"name":"BSc Computer Science and Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"BSc Physics / Chemistry / Zoology / Geology","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Arts (BA)","degree":"Bachelor","duration":"3 Years"},{"name":"MSc Geology / Physics / Microbiology","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/tri-chandra-multiple-campus/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Patan Multiple Campus', 'patan-multiple-campus', 'college', 'college',
  'Patandhoka, Lalitpur', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://pmc.edu.np', 'Patan Multiple Campus is one of the largest constituent campuses of Tribhuvan University located in Patandhoka, Lalitpur, offering premier IT, Management, and Science degrees.', ARRAY['Constituent TU Campus', 'Active CSIT Association', 'Spacious Campus Grounds', 'Digital E-Library'],
  'TU merit waivers and freeships for underprivileged students.', 'Requires passing TU entrance examinations for BSc CSIT, BCA, and CMAT for BBM/BBA.', 1954,
  '[{"name":"BSc Computer Science & Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Application (BCA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Management (BBM)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Studies (BBS)","degree":"Bachelor","duration":"4 Years"},{"name":"MSc Computer Science","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/patan-multiple-campus/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Amrit Campus (ASCOL)', 'amrit-campus-ascol', 'college', 'college',
  'Thamel, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://amritcampus.edu.np', 'Amrit Campus (ASCOL), located in Lainchaur/Thamel, is Nepal''s premier pure science constituent campus of Tribhuvan University, famous for producing top scientists, IT leaders, and researchers.', ARRAY['Pure Science Constituent Campus', 'Pioneer in BSc CSIT Education', 'Advanced Physics & Chemistry Research Labs', 'Thamel Central Location'],
  'TU IOST merit scholarships and Amrit Science Alumni trust fund awards.', 'Requires top ranks in national TU IOST entrance examination.', 1956,
  '[{"name":"BSc Computer Science and Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"BSc Physics","degree":"Bachelor","duration":"4 Years"},{"name":"BSc Chemistry","degree":"Bachelor","duration":"4 Years"},{"name":"BSc Botany & Zoology","degree":"Bachelor","duration":"4 Years"},{"name":"MSc Chemistry / Physics / Botany","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/amrit-campus/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Padma Kanya Multiple Campus (PK Campus)', 'padma-kanya-multiple-campus', 'college', 'college',
  'Bagbazar, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://pkcampus.edu.np', 'Padma Kanya Multiple Campus is Nepal''s first and leading women''s constituent campus under Tribhuvan University, empowering female leaders in IT, Management, Humanities, and Home Science.', ARRAY['Nepal''s Premier Women Campus', 'Hostel Facilities inside Campus', 'Digital IT & Multimedia Center', 'Women Empowerment Programs'],
  'TU female student incentive grants and merit scholarships.', 'Female candidates with valid entrance passes in TU CMAT, BCA, or CSIT exams.', 1951,
  '[{"name":"BSc Computer Science and Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Application (BCA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Administration (BBA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Management (BBM)","degree":"Bachelor","duration":"4 Years"},{"name":"Master of Arts (MA) / MBS","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/padma-kanya-multiple-campus/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Shanker Dev Campus', 'shanker-dev-campus', 'college', 'college',
  'Putalisadak, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://shankerdevcampus.edu.np', 'Shanker Dev Campus is the legendary constituent management campus of Tribhuvan University situated at Putalisadak, recognized as the center of management excellence in Nepal.', ARRAY['Top Management Campus in Nepal', 'Central Putalisadak Location', 'Pioneer in BBA & BIM', 'Vast Management Library'],
  'TU Faculty of Management merit scholarships for top entrance rankers.', 'Requires top score in TU CMAT entrance test followed by document verification.', 1951,
  '[{"name":"Bachelor of Business Administration (BBA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Information Management (BIM)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Management (BBM)","degree":"Bachelor","duration":"4 Years"},{"name":"Master of Business Studies (MBS)","degree":"Master","duration":"2 Years"},{"name":"Master of Business Administration (MBA)","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/shanker-dev-campus/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'The British College', 'the-british-college-kathmandu', 'college', 'college',
  'Trade Tower, Thapathali, Kathmandu', 'University of the West of England (UWE); Leeds Beckett University, UK', 'Undergraduate & Postgraduate',
  'https://thebritishcollege.edu.np', 'The British College (TBC) provides world-class British degrees in Business and Computing directly from top UK universities inside the modern Trade Tower complex in Thapathali.', ARRAY['Direct British University Degree', 'State of the Art Business Hub', 'UK Transfer Options', 'International Executive Placement'],
  'British College Founders Scholarship & Academic Excellence Awards.', 'Higher Secondary (+2) / A Levels completion with mandatory English interview assessment.', 2012,
  '[{"name":"BSc (Hons) Computing","degree":"Bachelor","duration":"4 Years"},{"name":"BSc (Hons) Cyber Security & Digital Forensics","degree":"Bachelor","duration":"4 Years"},{"name":"BBA (Hons) Business & Management","degree":"Bachelor","duration":"4 Years"},{"name":"MSc International Business Management","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/the-british-college/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Islington College', 'islington-college-kathmandu', 'college', 'college',
  'Kamalpokhari, Kathmandu', 'London Metropolitan University, UK', 'Undergraduate & Postgraduate',
  'https://islington.edu.np', 'Islington College is a pioneer in foreign higher education in Nepal, delivering UK degrees from London Metropolitan University in Computing, IT, and International Business.', ARRAY['Pioneer UK Degree College', 'Innovate Nepal Group Partnership', 'High Tech Multi-Lab Campus', 'UK Dual Degree Pathway'],
  'ING Merit Scholarships and Special Regional Grants.', 'Applicants require Grade 12 or equivalent with minimum 55% aggregate and English proficiency.', 1996,
  '[{"name":"BSc (Hons) Computing","degree":"Bachelor","duration":"3 Years"},{"name":"BSc (Hons) Computer Networking & IT Security","degree":"Bachelor","duration":"3 Years"},{"name":"BSc (Hons) Multimedia Technologies","degree":"Bachelor","duration":"3 Years"},{"name":"BBA (Hons) International Business","degree":"Bachelor","duration":"3 Years"}]'::jsonb, 'https://edusanjal.com/college/islington-college/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Deerwalk Institute of Technology (DWIT)', 'deerwalk-institute-of-technology', 'college', 'college',
  'Siphal, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://dwit.edu.np', 'Deerwalk Institute of Technology is an industry-integrated computer science college backed by Deerwalk Inc (USA), blending TU academic curriculum with real-world software engineering training.', ARRAY['Direct Software Industry Exposure', 'Software Development Labs', 'Deerwalk America Internships', 'Coding Bootcamps'],
  'Deerwalk Merit Fellowships and Need-based tuition grants.', 'Must pass TU IOST entrance examination followed by coding aptitude screening.', 2010,
  '[{"name":"BSc Computer Science and Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Application (BCA)","degree":"Bachelor","duration":"4 Years"}]'::jsonb, 'https://edusanjal.com/college/deerwalk-institute-of-technology/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Kathmandu Bernhardt College', 'kathmandu-bernhardt-college-balkhu', 'college', 'college',
  'Balkhu, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://kbc.edu.np', 'Kathmandu Bernhardt College is a top-tier private institute at Balkhu offering TU-affiliated technical and management programs with strong corporate placement ties.', ARRAY['Dedicated Research Cell', 'Regular IT Workshops', 'Robotics Club', 'Job Placement Support'],
  'Bernhardt Academic Excellence Grants for entrance rank holders.', 'Selection through TU entrance test and interview.', 2000,
  '[{"name":"BSc Computer Science & Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Application (BCA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Management (BBM)","degree":"Bachelor","duration":"4 Years"}]'::jsonb, 'https://edusanjal.com/college/kathmandu-bernhardt-college/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Kathford International College of Engineering and Management', 'kathford-international-college', 'engineering', 'college',
  'Balkumari, Lalitpur', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://kathford.edu.np', 'Kathford International College provides high quality engineering, computer science, and business management education affiliated with Tribhuvan University.', ARRAY['KATHFEST National Tech Expo', 'Robotics & Hardware Labs', 'Incubation Center', 'Industry Alumni Network'],
  'IOE Entrance rank scholarships and Kathford Excellence Grants.', 'Engineering candidates must pass IOE Entrance; CSIT candidates must pass IOST Entrance.', 2003,
  '[{"name":"BE Computer Engineering","degree":"Bachelor","duration":"4 Years"},{"name":"BE Civil Engineering","degree":"Bachelor","duration":"4 Years"},{"name":"BE Electronics & Communication","degree":"Bachelor","duration":"4 Years"},{"name":"BSc Computer Science & Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Administration (BBA)","degree":"Bachelor","duration":"4 Years"}]'::jsonb, 'https://edusanjal.com/college/kathford-international-college-of-engineering-and-management/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Trinity International College', 'trinity-international-college-dillibazar', 'college', 'college',
  'Dillibazar Heights, Kathmandu', 'Tribhuvan University; Cambridge Assessment International Education', 'Undergraduate & Postgraduate',
  'https://trinity.edu.np', 'Trinity International College at Dillibazar Heights is renowned for outstanding academic results in +2 Science/Management, A Levels, and TU Bachelor degree programs.', ARRAY['Modern Multi-block Campus', 'State of the Art Science Labs', 'Cambridge A Levels Center', 'High TU Board Rankings'],
  'Trinity Merit Scholarships based on SEE and +2 GPA scores.', 'Passing score in Trinity Entrance Exam and interview.', 2008,
  '[{"name":"BSc Computer Science and Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Application (BCA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Administration (BBA)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Studies (BBS)","degree":"Bachelor","duration":"4 Years"}]'::jsonb, 'https://edusanjal.com/college/trinity-international-college/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Apex College', 'apex-college-old-baneshwor', 'college', 'college',
  'Old Baneshwor, Kathmandu', 'Pokhara University', 'Undergraduate & Postgraduate',
  'https://apexcollege.edu.np', 'Apex College is a premier management institution affiliated with Pokhara University offering cutting-edge undergraduate and graduate business and IT management programs.', ARRAY['Apex Career Services', 'Corporate Case Competitions', 'Modern Entrepreneurship Lab', 'High Placement Rate'],
  'Pokhara University scholarship quotas and Apex Merit Bursaries.', 'Satisfactory performance in Apex Admission Test and personal interview.', 2000,
  '[{"name":"Bachelor of Business Administration (BBA)","degree":"Bachelor","duration":"4 Years"},{"name":"BBA in Travel & Tourism (BBA-TT)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Information Systems (BCIS)","degree":"Bachelor","duration":"4 Years"},{"name":"Master of Business Administration (MBA)","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/apex-college/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'GoldenGate International College', 'goldengate-international-college', 'college', 'college',
  'Battisputali, Old Baneshwor, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://goldengate.edu.np', 'GoldenGate International College is one of the largest private colleges in Kathmandu offering comprehensive university programs across Science, Humanities, and Management.', ARRAY['Large Battisputali Campus', 'Advanced Biotechnology & IT Labs', 'Active Sports Club', 'High TU Rank Holders'],
  'GoldenGate Academic Excellence Grants and Need-based assistance.', 'TU Entrance Exam qualification followed by GoldenGate interview.', 2007,
  '[{"name":"BSc Computer Science and Information Technology (BSc CSIT)","degree":"Bachelor","duration":"4 Years"},{"name":"BSc Environmental Science / Microbiology","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Business Management (BBM)","degree":"Bachelor","duration":"4 Years"},{"name":"Bachelor of Computer Application (BCA)","degree":"Bachelor","duration":"4 Years"},{"name":"MSc Physics / Environment Science","degree":"Master","duration":"2 Years"}]'::jsonb, 'https://edusanjal.com/college/goldengate-international-college/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  'Sunway International Business School', 'sunway-international-business-school', 'college', 'college',
  'Maitidevi, Kathmandu', 'Victoria University, Australia; Sunway University, Malaysia', 'Undergraduate & Postgraduate',
  'https://sunway.edu.np', 'Sunway College Kathmandu provides international degrees in Data Science, Artificial Intelligence, and Business Management in partnership with top Malaysian and Australian institutions.', ARRAY['Pioneer in BSc (Hons) Data Science & AI', 'Australian & Malaysian Credit Transfer', 'Industry Mentorship Program', 'Modern Maitidevi Campus'],
  'Sunway International Merit Scholarships.', 'Grade 12 completion with English proficiency assessment.', 2010,
  '[{"name":"BSc (Hons) Computer Science with Artificial Intelligence","degree":"Bachelor","duration":"3 Years"},{"name":"BSc (Hons) Data Science","degree":"Bachelor","duration":"3 Years"},{"name":"BBA (Hons) International Business","degree":"Bachelor","duration":"3 Years"}]'::jsonb, 'https://edusanjal.com/college/sunway-international-business-school/', 'approved', true, true, true
)
ON CONFLICT (lower(slug)) WHERE deleted_at IS NULL DO UPDATE SET
  website = EXCLUDED.website,
  source_url = EXCLUDED.source_url,
  affiliation = EXCLUDED.affiliation,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  salient_features = EXCLUDED.salient_features,
  courses_offered = EXCLUDED.courses_offered,
  scholarships = EXCLUDED.scholarships,
  admission_guidelines = EXCLUDED.admission_guidelines;

COMMIT;
