#!/usr/bin/env node
/**
 * generate-full-directory-migration.mjs
 *
 * Reads Nepal_Engineering_Colleges_FINAL_Directory_Snapshot_2026.xlsx
 * and generates a single SQL migration that inserts every unique institution
 * into public.institutes using the safe WHERE NOT EXISTS pattern.
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

function safeInt(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 'NULL' : String(n);
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

/** Build courses_offered JSON array from programs string */
function buildCoursesJson(programs) {
  if (!programs) return "'[]'::jsonb";
  const items = programs.split(/[;,]/).map(p => p.trim()).filter(Boolean);
  if (items.length === 0) return "'[]'::jsonb";
  const arr = items.map(p => ({ name: p }));
  return `${$$(JSON.stringify(arr))}::jsonb`;
}

/** Build salient_features array from text */
function buildFeatures(row) {
  const raw = String(row['Key Features'] || row['Features'] || '').trim();
  if (!raw || raw === 'To enrich') return "ARRAY[]::text[]";
  const items = raw.split(/[;]/).map(f => f.trim()).filter(Boolean);
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
    // If location already contains district info, don't duplicate
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
  if (!desc || desc === 'To enrich' || desc.startsWith('Directory snapshot record')) return null;
  return desc;
}

function getSourceUrl(row, name) {
  const url = String(
    row['Official / Profile URL'] ||
    row['EduSanjal Profile URL'] ||
    row['Official / Primary Source'] ||
    ''
  ).trim();
  if (!url || url === 'To enrich' || url === '(none)') return null;

  // Fix broken edusanjal query links: https://edusanjal.com/college/?q=... -> https://edusanjal.com/search/?q=...
  if (url.includes('edusanjal.com/college/?q=')) {
    const cleanName = (name || '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '+')
      .trim();
    return `https://edusanjal.com/search/?q=${encodeURIComponent(cleanName)}`;
  }

  // Direct edusanjal profile link or official university/college website
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

// Collect all institutions, dedup by identity key (name normalized + district)
const seen = new Map(); // identityKey → institution record
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
    // Identity key: lowercase name + district for dedup
    const key = `${name.toLowerCase()}|${district.toLowerCase()}`;

    if (seen.has(key)) {
      // Merge: enrich existing record with new data if missing
      const existing = seen.get(key);
      // Merge programs
      const newPrograms = getPrograms(row);
      if (newPrograms && !existing._programs) {
        existing._programs = newPrograms;
      } else if (newPrograms && existing._programs) {
        // Combine unique programs
        const existingSet = new Set(existing._programs.split(/[;,]/).map(p => p.trim().toLowerCase()));
        const newItems = newPrograms.split(/[;,]/).map(p => p.trim()).filter(p => !existingSet.has(p.toLowerCase()));
        if (newItems.length > 0) {
          existing._programs += '; ' + newItems.join('; ');
        }
      }
      // Merge description if better
      const newDesc = getDescription(row);
      if (newDesc && !existing.description) existing.description = newDesc;
      // Merge affiliation
      const newAff = getAffiliation(row);
      if (newAff && !existing.affiliation) existing.affiliation = newAff;
      continue;
    }

    const record = {
      name,
      slug: slugify(name),
      type: getType(config.name, row),
      institution_category: getCategory(config.name, row),
      location: getLocation(row),
      affiliation: getAffiliation(row),
      description: getDescription(row),
      _programs: getPrograms(row),
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
lines.push('-- Uses INSERT ... WHERE NOT EXISTS for safe idempotent application.');
lines.push('');
lines.push('BEGIN;');
lines.push('');

// Generate one INSERT per institution for safety with WHERE NOT EXISTS
for (const rec of records) {
  const coursesJson = buildCoursesJson(rec._programs);
  const features = buildFeatures(rec.features);
  const contactInfo = buildContactInfo(rec.contact_info_row, rec.contact_info_sheet);

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
  lines.push(`  ${$$(rec.description)},`);
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
  lines.push(`  SELECT 1 FROM public.institutes WHERE lower(slug) = lower(${$$(rec.slug)})`);
  lines.push(`);`);
  lines.push('');
}

lines.push('COMMIT;');

const sql = lines.join('\n');
writeFileSync(OUTPUT_PATH, sql, 'utf-8');
console.log(`\nSQL migration written to: ${OUTPUT_PATH}`);
console.log(`File size: ${(sql.length / 1024).toFixed(1)} KB`);
