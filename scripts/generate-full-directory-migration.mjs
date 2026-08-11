#!/usr/bin/env node
/**
 * generate-full-directory-migration.mjs
 *
 * Reads Nepal_Engineering_Colleges_FINAL_Directory_Snapshot_2026.xlsx
 * across all institution sheets, cross-references program offerings across sheets,
 * applies standard affiliation program fallbacks where missing, and generates
 * a single SQL migration that updates and inserts all 210 institutions in public.institutes
 * with multi-course arrays and clean academic descriptions.
 *
 * Usage:
 *   node scripts/generate-full-directory-migration.mjs
 *
 * Output:
 *   supabase/migrations/20260811100000_full_directory_from_workbook.sql
 */

import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKBOOK_PATH = resolve(ROOT, 'Nepal_Engineering_Colleges_FINAL_Directory_Snapshot_2026.xlsx');
const OUTPUT_PATH = resolve(ROOT, 'supabase/migrations/20260811100000_full_directory_from_workbook.sql');

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Dollar-quote safely */
function $$(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const s = String(val).replace(/\0/g, '');
  if (s.includes('$mt$')) {
    return `$q$${s}$q$`;
  }
  return `$mt$${s}$mt$`;
}

/** Determine institution type from sheet name / data */
function getType(sheetName, row) {
  const sn = sheetName.toLowerCase();
  if (sn.includes('ctevt')) return 'technical';
  if (sn.includes('engineering')) return 'engineering';
  if (sn.includes('it ') || sn.includes('it_')) return 'it';
  if (sn.includes('bba')) return 'management';
  if (sn.includes('bbs')) return 'management';
  return 'college';
}

/** Determine institution_category - must strictly match CHECK (institution_category IN ('college', 'school', 'plus_two')) */
function getCategory(sheetName, row) {
  return 'college';
}

/** Extract programs from various column names */
function getPrograms(row) {
  return String(
    row['Programs Offered'] ||
    row['Programs / Sectors'] ||
    row['Programs Offered / Other Programs'] ||
    row['Programs / Other Programs'] ||
    ''
  ).trim();
}

/** Deduces standard academic programs based on institution affiliation, type, and name */
function getStandardAffiliationPrograms(affiliation, type, name) {
  const aff = (affiliation || '').toLowerCase();
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (t === 'technical' || aff.includes('ctevt') || n.includes('polytechnic') || n.includes('technical school')) {
    return [
      'Diploma in Civil Engineering',
      'Diploma in Computer Engineering',
      'Diploma in Electrical Engineering',
      'Diploma in Mechanical Engineering',
      'Diploma in Information Technology'
    ];
  }

  if (t === 'engineering' || n.includes('engineering')) {
    if (aff.includes('tribhuvan') || aff.includes('tu')) {
      return ['BE Civil', 'BE Computer', 'BE Electronics Communication & Information', 'BE Electrical', 'B.Arch'];
    }
    if (aff.includes('pokhara')) {
      return ['BE Civil', 'BE Computer', 'BE Electrical & Electronics', 'BE Software', 'BE Information Technology'];
    }
    if (aff.includes('purbanchal')) {
      return ['BE Civil', 'BE Computer', 'BE Electronics & Communication', 'B.Arch', 'BIT'];
    }
    if (aff.includes('kathmandu') || aff.includes('ku')) {
      return ['BE Computer Engineering', 'BE Civil Engineering', 'BE Electrical & Electronics', 'BE Mechanical Engineering'];
    }
    if (aff.includes('mid-west') || aff.includes('far western') || aff.includes('lumbini')) {
      return ['BE Civil', 'BE Computer', 'BE Information Technology'];
    }
    return ['BE Civil Engineering', 'BE Computer Engineering', 'BE Electrical Engineering', 'BE Information Technology'];
  }

  if (t === 'it' || n.includes('it') || n.includes('technology') || n.includes('computer')) {
    if (aff.includes('tribhuvan') || aff.includes('tu')) {
      return ['BSc CSIT', 'BCA', 'BIT', 'BIM'];
    }
    if (aff.includes('pokhara')) {
      return ['BCA', 'BIT', 'BSc Computer Science'];
    }
    if (aff.includes('purbanchal')) {
      return ['BIT', 'BCA', 'BSc (Hons) IT'];
    }
    return ['BSc CSIT', 'BCA', 'BIT', 'BSc (Hons) Computing'];
  }

  if (t === 'management' || n.includes('management') || n.includes('business') || n.includes('campus')) {
    if (aff.includes('tribhuvan') || aff.includes('tu')) {
      return ['BBA', 'BBS', 'BBM', 'BCA'];
    }
    if (aff.includes('pokhara')) {
      return ['BBA', 'BBA-BI', 'BCIS', 'BHM'];
    }
    if (aff.includes('purbanchal')) {
      return ['BBA', 'BBS', 'BHCM'];
    }
    return ['BBA', 'BBS', 'BBM'];
  }

  return ['Bachelor Programs', 'Diploma Programs'];
}

/** Build courses_offered JSON array from a set of program names */
function buildCoursesJsonFromSet(programSet, affiliation, type, name) {
  let items = Array.from(programSet).filter(p => Boolean(p) && !p.includes('To be enriched') && !p.includes('Directory snapshot record') && !p.includes('Edusanjal listing also describes'));

  // If no explicit programs collected, apply standard fallback based on affiliation/type
  if (items.length === 0) {
    items = getStandardAffiliationPrograms(affiliation, type, name);
  }

  const arr = items.map(p => ({ name: p }));
  return `${$$(JSON.stringify(arr))}::jsonb`;
}

/** Build salient_features array from text */
function buildFeatures(row) {
  const raw = String(row['Key Features'] || row['Features'] || '').trim();
  if (!raw || raw === 'To enrich' || raw.includes('To be enriched')) return "ARRAY[]::text[]";
  const items = raw.split(/[;]/).map(f => f.trim()).filter(f => Boolean(f) && !f.includes('To be enriched'));
  if (items.length === 0) return "ARRAY[]::text[]";
  const elems = items.map(i => $$(i)).join(', ');
  return `ARRAY[${elems}]::text[]`;
}

/** Build contact_info JSON */
function buildContactInfo(row, sheetName) {
  const ownership = String(
    row['Ownership'] || row['Ownership / Modality'] || row['Ownership / Category'] || row['Institution Type'] || ''
  ).trim() || null;
  const rawContact = String(row['Contact'] || row['Contact / Email'] || '').trim() || null;
  const obj = {
    directoryAsOf: '2026-08-11',
    ownership: ownership,
    rawContact: (rawContact && rawContact !== 'To enrich' && rawContact !== 'To enrich / official profile')
      ? rawContact : null,
    sourceSheet: sheetName
  };
  return `${$$(JSON.stringify(obj))}::jsonb`;
}

/** Get affiliation */
function getAffiliation(row) {
  return String(
    row['University / Affiliation'] ||
    row['Affiliation / Authority'] ||
    ''
  ).trim() || null;
}

/** Get province → map to location with district */
function getLocation(row) {
  const loc = String(row['Location'] || '').trim();
  const district = String(row['District'] || '').trim();
  const province = String(row['Province'] || '').trim();

  if (loc && district && province) {
    if (loc.toLowerCase().includes(district.toLowerCase())) {
      return `${loc}, ${province}`;
    }
    return `${loc}, ${district}, ${province}`;
  }
  if (loc && district) return `${loc}, ${district}`;
  if (loc) return loc;
  if (district && province) return `${district}, ${province}`;
  return district || province || null;
}

function getDescription(row) {
  const desc = String(row['Description'] || '').trim();
  if (!desc || desc === 'To enrich' || desc.startsWith('Directory snapshot record') || desc.includes('is listed in the August 2026 MeroTalent')) return null;
  return desc;
}

function formatRichDescription(rec, programSet) {
  const name = rec.name;
  let rawDesc = (rec.description || '').trim();

  if (
    !rawDesc ||
    rawDesc.includes('is listed in the August 2026 MeroTalent') ||
    rawDesc.includes('To be enriched') ||
    rawDesc.startsWith('Directory snapshot record')
  ) {
    rawDesc = null;
  }

  if (rawDesc) {
    return rawDesc;
  }

  const loc = rec.location ? `located in ${rec.location}` : 'located in Nepal';
  const aff = rec.affiliation && rec.affiliation !== 'To enrich' ? `Affiliated with ${rec.affiliation}` : null;
  
  let programList = Array.from(programSet).filter(p => Boolean(p) && !p.includes('To be enriched') && !p.includes('Directory snapshot record'));
  let programsText = programList.length > 0 ? programList.slice(0, 5).join(', ') : null;

  const estYear = parseInt(String(rec.established_year), 10);
  const est = !isNaN(estYear) && estYear > 1800 && estYear < 2030 ? `Established in ${estYear}` : null;

  const type = rec.type === 'engineering' ? 'engineering and technology'
             : rec.type === 'it' ? 'information technology and computing'
             : rec.type === 'technical' ? 'technical and vocational TVET education'
             : rec.type === 'management' ? 'higher education and management studies'
             : 'higher education';

  const parts = [];
  parts.push(`${name} is a leading ${type} institution ${loc}.`);
  if (est) parts.push(`${est}, it provides quality academic programs and practical career development.`);
  if (aff) parts.push(`${aff}, the institution adheres to competitive academic standards.`);
  if (programsText) parts.push(`Key offered programs include ${programsText}.`);

  return parts.join(' ');
}

function getSourceUrl(row, name) {
  const url = String(
    row['Official / Profile URL'] ||
    row['EduSanjal Profile URL'] ||
    row['Official / Primary Source'] ||
    ''
  ).trim();
  if (!url || url === 'To enrich' || url === '(none)') return null;

  if (url.includes('edusanjal.com/college/?q=')) {
    const cleanName = (name || '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '+')
      .trim();
    return `https://edusanjal.com/search/?q=${encodeURIComponent(cleanName)}`;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return null;
}

function getScholarships(row) {
  const s = String(row['Scholarships'] || '').trim();
  if (!s || s === 'To enrich') return null;
  return s;
}

function getEstablished(row) {
  const est = row['Established'];
  if (!est) return 'NULL';
  const n = parseInt(String(est), 10);
  if (isNaN(n) || n < 1800 || n > 2030) return 'NULL';
  return String(n);
}

// ── Sheet configurations ──────────────────────────────────────────────────────

const SHEET_CONFIGS = [
  { name: 'Engineering Directory', nameCol: 'College / Institution' },
  { name: 'CTEVT Directory', nameCol: 'Institution' },
  { name: 'IT Colleges Directory', nameCol: 'Institution' },
  { name: 'BBA Append 2026-08-11', nameCol: 'Institution' },
  { name: 'BBS Append 2026-08-11', nameCol: 'Institution' },
  { name: 'Engineering Append 2026-08-11', nameCol: 'Institution' },
  { name: 'IT Append 2026-08-11', nameCol: 'Institution' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Reading workbook:', WORKBOOK_PATH);
const wb = XLSX.readFile(WORKBOOK_PATH);

const seen = new Map();
const records = [];

for (const config of SHEET_CONFIGS) {
  const ws = wb.Sheets[config.name];
  if (!ws) {
    console.warn(`Sheet "${config.name}" not found, skipping.`);
    continue;
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`Processing "${config.name}": ${rows.length} rows`);

  for (const row of rows) {
    const name = String(row[config.nameCol] || '').trim();
    if (!name) continue;

    const district = String(row['District'] || '').trim();
    const key = `${name.toLowerCase()}|${district.toLowerCase()}`;

    const rawProgs = getPrograms(row);

    if (seen.has(key)) {
      const existing = seen.get(key);
      if (rawProgs && !rawProgs.includes('To be enriched') && !rawProgs.startsWith('Directory snapshot record')) {
        const parts = rawProgs.split(/[;,]/).map(p => p.trim()).filter(p => Boolean(p) && !p.includes('To be enriched') && !p.includes('Edusanjal listing also describes'));
        parts.forEach(p => existing.programSet.add(p));
      }
      const newDesc = getDescription(row);
      if (newDesc && !existing.description) existing.description = newDesc;
      const newAff = getAffiliation(row);
      if (newAff && !existing.affiliation) existing.affiliation = newAff;
      continue;
    }

    const programSet = new Set();
    if (rawProgs && !rawProgs.includes('To be enriched') && !rawProgs.startsWith('Directory snapshot record')) {
      const parts = rawProgs.split(/[;,]/).map(p => p.trim()).filter(p => Boolean(p) && !p.includes('To be enriched') && !p.includes('Edusanjal listing also describes'));
      parts.forEach(p => programSet.add(p));
    }

    const record = {
      name,
      slug: slugify(name),
      type: getType(config.name, row),
      institution_category: getCategory(config.name, row),
      location: getLocation(row),
      affiliation: getAffiliation(row),
      description: getDescription(row),
      programSet: programSet,
      features: row,
      featureSheet: config.name,
      scholarships: getScholarships(row),
      established_year: getEstablished(row),
      source_url: getSourceUrl(row, name),
      contact_info_row: row,
      contact_info_sheet: config.name,
    };

    seen.set(key, record);
    records.push(record);
  }
}

console.log(`\nTotal unique institutions: ${records.length}`);

// ── Generate SQL ──────────────────────────────────────────────────────────────

const lines = [];
lines.push('-- Auto-generated from Nepal_Engineering_Colleges_FINAL_Directory_Snapshot_2026.xlsx');
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push(`-- Total institutions: ${records.length}`);
lines.push('-- Updates existing records with complete multi-course JSON arrays and inserts new ones.');
lines.push('');
lines.push('BEGIN;');
lines.push('');

for (const rec of records) {
  const richDesc = formatRichDescription(rec, rec.programSet);
  const coursesJson = buildCoursesJsonFromSet(rec.programSet, rec.affiliation, rec.type, rec.name);
  const features = buildFeatures(rec.features);
  const contactInfo = buildContactInfo(rec.contact_info_row, rec.contact_info_sheet);

  // 1. UPDATE existing record description, courses_offered (FORCE OVERWRITE with multi-course array), features, location, affiliation
  lines.push(`UPDATE public.institutes SET`);
  lines.push(`  description = ${$$(richDesc)},`);
  lines.push(`  courses_offered = ${coursesJson},`);
  lines.push(`  salient_features = CASE WHEN array_length(salient_features, 1) IS NULL OR salient_features::text ILIKE '%To be enriched%' THEN ${features} ELSE salient_features END,`);
  lines.push(`  location = COALESCE(location, ${$$(rec.location)}),`);
  lines.push(`  affiliation = COALESCE(affiliation, ${$$(rec.affiliation)}),`);
  lines.push(`  source_url = COALESCE(source_url, ${$$(rec.source_url)}),`);
  lines.push(`  updated_at = now()`);
  lines.push(`WHERE lower(slug) = lower(${$$(rec.slug)}) OR lower(name) = lower(${$$(rec.name)});`);
  lines.push('');

  // 2. INSERT new record if it does not exist yet
  lines.push(`INSERT INTO public.institutes (`);
  lines.push(`  name, slug, type, institution_category, location, affiliation, level,`);
  lines.push(`  description, courses_offered, salient_features, scholarships,`);
  lines.push(`  admission_guidelines, established_year, admission_status,`);
  lines.push(`  contact_email, contact_phone, contact_info, source_url,`);
  lines.push(`  status, applications_enabled, is_verified, is_featured`);
  lines.push(`)`);
  lines.push(`SELECT`);
  lines.push(`  ${$$(rec.name)}, ${$$(rec.slug)}, ${$$(rec.type)},`);
  lines.push(`  ${$$(rec.institution_category)}, ${$$(rec.location)}, ${$$(rec.affiliation)},`);
  lines.push(`  NULL,`);
  lines.push(`  ${$$(richDesc)},`);
  lines.push(`  ${coursesJson},`);
  lines.push(`  ${features},`);
  lines.push(`  ${$$(rec.scholarships)},`);
  lines.push(`  NULL,`);
  lines.push(`  ${rec.established_year},`);
  lines.push(`  $mt$closed$mt$,`);
  lines.push(`  NULL, NULL,`);
  lines.push(`  ${contactInfo},`);
  lines.push(`  ${$$(rec.source_url)},`);
  lines.push(`  'approved', true, false, false`);
  lines.push(`WHERE NOT EXISTS (`);
  lines.push(`  SELECT 1 FROM public.institutes WHERE lower(slug) = lower(${$$(rec.slug)}) OR lower(name) = lower(${$$(rec.name)})`);
  lines.push(`);`);
  lines.push('');
}

lines.push('COMMIT;');

const sql = lines.join('\n');
writeFileSync(OUTPUT_PATH, sql, 'utf-8');
console.log(`\nSQL migration written to: ${OUTPUT_PATH}`);
console.log(`File size: ${(sql.length / 1024).toFixed(1)} KB`);
