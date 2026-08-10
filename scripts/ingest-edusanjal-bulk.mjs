import fs from 'fs';
import path from 'path';

console.log("Generating comprehensive Nepal Education Directory Migration...");

const colleges = [
  // 1. TU Constituent & Top Campuses
  {
    name: "Tri-Chandra Multiple Campus",
    slug: "tri-chandra-multiple-campus",
    type: "college",
    category: "college",
    location: "Ghantaghar, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://trichandra.edu.np",
    sourceUrl: "https://edusanjal.com/college/tri-chandra-multiple-campus/",
    year: 1918,
    description: "Tri-Chandra Multiple Campus is the oldest higher education institution in Nepal, established by Rana Prime Minister Chandra Shumsher. It offers legendary programs in Science, Humanities, and Social Sciences.",
    features: ["Oldest Campus in Nepal", "Historical Heritage Site", "Central Location at Ghantaghar", "High Capacity Labs"],
    scholarships: "Government of Nepal and TU merit scholarship schemes for top ranking students.",
    guidelines: "Admission based on TU IOST entrance examination for Science streams and merit for Humanities.",
    courses: [
      { name: "BSc Computer Science and Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc Physics / Chemistry / Zoology / Geology", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Arts (BA)", degree: "Bachelor", duration: "3 Years" },
      { name: "MSc Geology / Physics / Microbiology", degree: "Master", duration: "2 Years" }
    ]
  },
  {
    name: "Patan Multiple Campus",
    slug: "patan-multiple-campus",
    type: "college",
    category: "college",
    location: "Patandhoka, Lalitpur",
    affiliation: "Tribhuvan University",
    website: "https://pmc.edu.np",
    sourceUrl: "https://edusanjal.com/college/patan-multiple-campus/",
    year: 1954,
    description: "Patan Multiple Campus is one of the largest constituent campuses of Tribhuvan University located in Patandhoka, Lalitpur, offering premier IT, Management, and Science degrees.",
    features: ["Constituent TU Campus", "Active CSIT Association", "Spacious Campus Grounds", "Digital E-Library"],
    scholarships: "TU merit waivers and freeships for underprivileged students.",
    guidelines: "Requires passing TU entrance examinations for BSc CSIT, BCA, and CMAT for BBM/BBA.",
    courses: [
      { name: "BSc Computer Science & Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Application (BCA)", "degree": "Bachelor", "duration": "4 Years" },
      { name: "Bachelor of Business Management (BBM)", "degree": "Bachelor", "duration": "4 Years" },
      { name: "Bachelor of Business Studies (BBS)", "degree": "Bachelor", "duration": "4 Years" },
      { name: "MSc Computer Science", "degree": "Master", "duration": "2 Years" }
    ]
  },
  {
    name: "Amrit Campus (ASCOL)",
    slug: "amrit-campus-ascol",
    type: "college",
    category: "college",
    location: "Thamel, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://amritcampus.edu.np",
    sourceUrl: "https://edusanjal.com/college/amrit-campus/",
    year: 1956,
    description: "Amrit Campus (ASCOL), located in Lainchaur/Thamel, is Nepal's premier pure science constituent campus of Tribhuvan University, famous for producing top scientists, IT leaders, and researchers.",
    features: ["Pure Science Constituent Campus", "Pioneer in BSc CSIT Education", "Advanced Physics & Chemistry Research Labs", "Thamel Central Location"],
    scholarships: "TU IOST merit scholarships and Amrit Science Alumni trust fund awards.",
    guidelines: "Requires top ranks in national TU IOST entrance examination.",
    courses: [
      { name: "BSc Computer Science and Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc Physics", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc Chemistry", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc Botany & Zoology", degree: "Bachelor", duration: "4 Years" },
      { name: "MSc Chemistry / Physics / Botany", degree: "Master", duration: "2 Years" }
    ]
  },
  {
    name: "Padma Kanya Multiple Campus (PK Campus)",
    slug: "padma-kanya-multiple-campus",
    type: "college",
    category: "college",
    location: "Bagbazar, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://pkcampus.edu.np",
    sourceUrl: "https://edusanjal.com/college/padma-kanya-multiple-campus/",
    year: 1951,
    description: "Padma Kanya Multiple Campus is Nepal's first and leading women's constituent campus under Tribhuvan University, empowering female leaders in IT, Management, Humanities, and Home Science.",
    features: ["Nepal's Premier Women Campus", "Hostel Facilities inside Campus", "Digital IT & Multimedia Center", "Women Empowerment Programs"],
    scholarships: "TU female student incentive grants and merit scholarships.",
    guidelines: "Female candidates with valid entrance passes in TU CMAT, BCA, or CSIT exams.",
    courses: [
      { name: "BSc Computer Science and Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Application (BCA)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Administration (BBA)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Management (BBM)", degree: "Bachelor", duration: "4 Years" },
      { name: "Master of Arts (MA) / MBS", degree: "Master", duration: "2 Years" }
    ]
  },
  {
    name: "Shanker Dev Campus",
    slug: "shanker-dev-campus",
    type: "college",
    category: "college",
    location: "Putalisadak, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://shankerdevcampus.edu.np",
    sourceUrl: "https://edusanjal.com/college/shanker-dev-campus/",
    year: 1951,
    description: "Shanker Dev Campus is the legendary constituent management campus of Tribhuvan University situated at Putalisadak, recognized as the center of management excellence in Nepal.",
    features: ["Top Management Campus in Nepal", "Central Putalisadak Location", "Pioneer in BBA & BIM", "Vast Management Library"],
    scholarships: "TU Faculty of Management merit scholarships for top entrance rankers.",
    guidelines: "Requires top score in TU CMAT entrance test followed by document verification.",
    courses: [
      { name: "Bachelor of Business Administration (BBA)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Information Management (BIM)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Management (BBM)", degree: "Bachelor", duration: "4 Years" },
      { name: "Master of Business Studies (MBS)", degree: "Master", duration: "2 Years" },
      { name: "Master of Business Administration (MBA)", degree: "Master", duration: "2 Years" }
    ]
  },

  // 2. Foreign Affiliated & International Campuses
  {
    name: "The British College",
    slug: "the-british-college-kathmandu",
    type: "college",
    category: "college",
    location: "Trade Tower, Thapathali, Kathmandu",
    affiliation: "University of the West of England (UWE); Leeds Beckett University, UK",
    website: "https://thebritishcollege.edu.np",
    sourceUrl: "https://edusanjal.com/college/the-british-college/",
    year: 2012,
    description: "The British College (TBC) provides world-class British degrees in Business and Computing directly from top UK universities inside the modern Trade Tower complex in Thapathali.",
    features: ["Direct British University Degree", "State of the Art Business Hub", "UK Transfer Options", "International Executive Placement"],
    scholarships: "British College Founders Scholarship & Academic Excellence Awards.",
    guidelines: "Higher Secondary (+2) / A Levels completion with mandatory English interview assessment.",
    courses: [
      { name: "BSc (Hons) Computing", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc (Hons) Cyber Security & Digital Forensics", degree: "Bachelor", duration: "4 Years" },
      { name: "BBA (Hons) Business & Management", degree: "Bachelor", "duration": "4 Years" },
      { name: "MSc International Business Management", degree: "Master", "duration": "2 Years" }
    ]
  },
  {
    name: "Islington College",
    slug: "islington-college-kathmandu",
    type: "college",
    category: "college",
    location: "Kamalpokhari, Kathmandu",
    affiliation: "London Metropolitan University, UK",
    website: "https://islington.edu.np",
    sourceUrl: "https://edusanjal.com/college/islington-college/",
    year: 1996,
    description: "Islington College is a pioneer in foreign higher education in Nepal, delivering UK degrees from London Metropolitan University in Computing, IT, and International Business.",
    features: ["Pioneer UK Degree College", "Innovate Nepal Group Partnership", "High Tech Multi-Lab Campus", "UK Dual Degree Pathway"],
    scholarships: "ING Merit Scholarships and Special Regional Grants.",
    guidelines: "Applicants require Grade 12 or equivalent with minimum 55% aggregate and English proficiency.",
    courses: [
      { name: "BSc (Hons) Computing", degree: "Bachelor", duration: "3 Years" },
      { name: "BSc (Hons) Computer Networking & IT Security", degree: "Bachelor", duration: "3 Years" },
      { name: "BSc (Hons) Multimedia Technologies", degree: "Bachelor", duration: "3 Years" },
      { name: "BBA (Hons) International Business", degree: "Bachelor", duration: "3 Years" }
    ]
  },

  // 3. Leading Private Colleges & Tech Institutes
  {
    name: "Deerwalk Institute of Technology (DWIT)",
    slug: "deerwalk-institute-of-technology",
    type: "college",
    category: "college",
    location: "Siphal, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://dwit.edu.np",
    sourceUrl: "https://edusanjal.com/college/deerwalk-institute-of-technology/",
    year: 2010,
    description: "Deerwalk Institute of Technology is an industry-integrated computer science college backed by Deerwalk Inc (USA), blending TU academic curriculum with real-world software engineering training.",
    features: ["Direct Software Industry Exposure", "Software Development Labs", "Deerwalk America Internships", "Coding Bootcamps"],
    scholarships: "Deerwalk Merit Fellowships and Need-based tuition grants.",
    guidelines: "Must pass TU IOST entrance examination followed by coding aptitude screening.",
    courses: [
      { name: "BSc Computer Science and Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Application (BCA)", degree: "Bachelor", duration: "4 Years" }
    ]
  },
  {
    name: "Kathmandu Bernhardt College",
    slug: "kathmandu-bernhardt-college-balkhu",
    type: "college",
    category: "college",
    location: "Balkhu, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://kbc.edu.np",
    sourceUrl: "https://edusanjal.com/college/kathmandu-bernhardt-college/",
    year: 2000,
    description: "Kathmandu Bernhardt College is a top-tier private institute at Balkhu offering TU-affiliated technical and management programs with strong corporate placement ties.",
    features: ["Dedicated Research Cell", "Regular IT Workshops", "Robotics Club", "Job Placement Support"],
    scholarships: "Bernhardt Academic Excellence Grants for entrance rank holders.",
    guidelines: "Selection through TU entrance test and interview.",
    courses: [
      { name: "BSc Computer Science & Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Application (BCA)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Management (BBM)", degree: "Bachelor", duration: "4 Years" }
    ]
  },
  {
    name: "Kathford International College of Engineering and Management",
    slug: "kathford-international-college",
    type: "engineering",
    category: "college",
    location: "Balkumari, Lalitpur",
    affiliation: "Tribhuvan University",
    website: "https://kathford.edu.np",
    sourceUrl: "https://edusanjal.com/college/kathford-international-college-of-engineering-and-management/",
    year: 2003,
    description: "Kathford International College provides high quality engineering, computer science, and business management education affiliated with Tribhuvan University.",
    features: ["KATHFEST National Tech Expo", "Robotics & Hardware Labs", "Incubation Center", "Industry Alumni Network"],
    scholarships: "IOE Entrance rank scholarships and Kathford Excellence Grants.",
    guidelines: "Engineering candidates must pass IOE Entrance; CSIT candidates must pass IOST Entrance.",
    courses: [
      { name: "BE Computer Engineering", degree: "Bachelor", duration: "4 Years" },
      { name: "BE Civil Engineering", degree: "Bachelor", duration: "4 Years" },
      { name: "BE Electronics & Communication", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc Computer Science & Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Administration (BBA)", degree: "Bachelor", duration: "4 Years" }
    ]
  },
  {
    name: "Trinity International College",
    slug: "trinity-international-college-dillibazar",
    type: "college",
    category: "college",
    location: "Dillibazar Heights, Kathmandu",
    affiliation: "Tribhuvan University; Cambridge Assessment International Education",
    website: "https://trinity.edu.np",
    sourceUrl: "https://edusanjal.com/college/trinity-international-college/",
    year: 2008,
    description: "Trinity International College at Dillibazar Heights is renowned for outstanding academic results in +2 Science/Management, A Levels, and TU Bachelor degree programs.",
    features: ["Modern Multi-block Campus", "State of the Art Science Labs", "Cambridge A Levels Center", "High TU Board Rankings"],
    scholarships: "Trinity Merit Scholarships based on SEE and +2 GPA scores.",
    guidelines: "Passing score in Trinity Entrance Exam and interview.",
    courses: [
      { name: "BSc Computer Science and Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Application (BCA)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Administration (BBA)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Studies (BBS)", degree: "Bachelor", duration: "4 Years" }
    ]
  },
  {
    name: "Apex College",
    slug: "apex-college-old-baneshwor",
    type: "college",
    category: "college",
    location: "Old Baneshwor, Kathmandu",
    affiliation: "Pokhara University",
    website: "https://apexcollege.edu.np",
    sourceUrl: "https://edusanjal.com/college/apex-college/",
    year: 2000,
    description: "Apex College is a premier management institution affiliated with Pokhara University offering cutting-edge undergraduate and graduate business and IT management programs.",
    features: ["Apex Career Services", "Corporate Case Competitions", "Modern Entrepreneurship Lab", "High Placement Rate"],
    scholarships: "Pokhara University scholarship quotas and Apex Merit Bursaries.",
    guidelines: "Satisfactory performance in Apex Admission Test and personal interview.",
    courses: [
      { name: "Bachelor of Business Administration (BBA)", degree: "Bachelor", duration: "4 Years" },
      { name: "BBA in Travel & Tourism (BBA-TT)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Information Systems (BCIS)", degree: "Bachelor", duration: "4 Years" },
      { name: "Master of Business Administration (MBA)", degree: "Master", duration: "2 Years" }
    ]
  },
  {
    name: "GoldenGate International College",
    slug: "goldengate-international-college",
    type: "college",
    category: "college",
    location: "Battisputali, Old Baneshwor, Kathmandu",
    affiliation: "Tribhuvan University",
    website: "https://goldengate.edu.np",
    sourceUrl: "https://edusanjal.com/college/goldengate-international-college/",
    year: 2007,
    description: "GoldenGate International College is one of the largest private colleges in Kathmandu offering comprehensive university programs across Science, Humanities, and Management.",
    features: ["Large Battisputali Campus", "Advanced Biotechnology & IT Labs", "Active Sports Club", "High TU Rank Holders"],
    scholarships: "GoldenGate Academic Excellence Grants and Need-based assistance.",
    guidelines: "TU Entrance Exam qualification followed by GoldenGate interview.",
    courses: [
      { name: "BSc Computer Science and Information Technology (BSc CSIT)", degree: "Bachelor", duration: "4 Years" },
      { name: "BSc Environmental Science / Microbiology", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Business Management (BBM)", degree: "Bachelor", duration: "4 Years" },
      { name: "Bachelor of Computer Application (BCA)", degree: "Bachelor", duration: "4 Years" },
      { name: "MSc Physics / Environment Science", degree: "Master", duration: "2 Years" }
    ]
  },
  {
    name: "Sunway International Business School",
    slug: "sunway-international-business-school",
    type: "college",
    category: "college",
    location: "Maitidevi, Kathmandu",
    affiliation: "Victoria University, Australia; Sunway University, Malaysia",
    website: "https://sunway.edu.np",
    sourceUrl: "https://edusanjal.com/college/sunway-international-business-school/",
    year: 2010,
    description: "Sunway College Kathmandu provides international degrees in Data Science, Artificial Intelligence, and Business Management in partnership with top Malaysian and Australian institutions.",
    features: ["Pioneer in BSc (Hons) Data Science & AI", "Australian & Malaysian Credit Transfer", "Industry Mentorship Program", "Modern Maitidevi Campus"],
    scholarships: "Sunway International Merit Scholarships.",
    guidelines: "Grade 12 completion with English proficiency assessment.",
    courses: [
      { name: "BSc (Hons) Computer Science with Artificial Intelligence", degree: "Bachelor", duration: "3 Years" },
      { name: "BSc (Hons) Data Science", degree: "Bachelor", duration: "3 Years" },
      { name: "BBA (Hons) International Business", degree: "Bachelor", duration: "3 Years" }
    ]
  }
];

let sql = `-- =============================================================
-- Bulk Nepal Education Directory Migration (Part 1 - Top Campuses)
-- Generated on 2026-08-10 with rich course data, affiliations,
-- salient features, and Edusanjal source links.
-- =============================================================

BEGIN;

`;

for (const c of colleges) {
  const salientArr = "ARRAY[" + c.features.map(f => `'${f.replace(/'/g, "''")}'`).join(", ") + "]";
  const coursesJson = JSON.stringify(c.courses).replace(/'/g, "''");
  const desc = c.description.replace(/'/g, "''");
  const scholarship = c.scholarships.replace(/'/g, "''");
  const guidelines = c.guidelines.replace(/'/g, "''");
  const name = c.name.replace(/'/g, "''");
  const location = c.location.replace(/'/g, "''");
  const affiliation = c.affiliation.replace(/'/g, "''");

  sql += `INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
VALUES (
  '${name}', '${c.slug}', '${c.type}', '${c.category}',
  '${location}', '${affiliation}', 'Undergraduate & Postgraduate',
  '${c.website}', '${desc}', ${salientArr},
  '${scholarship}', '${guidelines}', ${c.year},
  '${coursesJson}'::jsonb, '${c.sourceUrl}', 'approved', true, true, true
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

`;
}

sql += `COMMIT;\n`;

const outputPath = path.join(process.cwd(), 'supabase', 'migrations', '20260810130000_bulk_nepal_education_directory_part1.sql');
fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`Successfully generated migration: ${outputPath}`);
