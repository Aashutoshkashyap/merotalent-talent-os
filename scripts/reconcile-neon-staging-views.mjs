/** Read-only, deterministic comparison of the two retained public directory views. */
import crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceUrl = new URL(process.env.SUPABASE_DATABASE_URL || "postgresql://invalid@invalid");
const stageUrl = new URL(process.env.NEON_STAGING_DATABASE_URL || "postgresql://invalid@invalid");
if (sourceUrl.hostname !== "db.dtirpilgzlsfryucanlg.supabase.co" ||
    stageUrl.hostname !== "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech") {
  throw new Error("View comparison is restricted to approved source and isolated staging.");
}
const clients = [sourceUrl, stageUrl].map(url => new pg.Client({
  connectionString: url.toString(), options: "-c default_transaction_read_only=on",
}));
const canonical = rows => crypto.createHash("sha256").update(rows.map(row => {
  const sorted = {};
  for (const key of Object.keys(row).sort()) sorted[key] = row[key] instanceof Date ? row[key].toISOString() : row[key];
  return JSON.stringify(sorted);
}).join("\n")).digest("hex");
try {
  await Promise.all(clients.map(client => client.connect()));
  const report = [];
  for (const name of ["institute_directory", "public_profile_directory"]) {
    const rows = await Promise.all(clients.map(client => client.query(`SELECT * FROM public."${name}" ORDER BY id`)));
    const [sourceSha256, stageSha256] = rows.map(result => canonical(result.rows));
    const differences = [];
    let collationOnlyDifferences = 0;
    for (let i = 0; i < Math.max(rows[0].rows.length, rows[1].rows.length); i++) {
      const left = rows[0].rows[i] ?? {};
      const right = rows[1].rows[i] ?? {};
      const fields = [...new Set([...Object.keys(left), ...Object.keys(right)])]
        .filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
      if (fields.length) {
        const leftTags = Array.isArray(left.search_tags) ? [...left.search_tags].sort() : [];
        const rightTags = Array.isArray(right.search_tags) ? [...right.search_tags].sort() : [];
        const suffix = (document, tags) => typeof document === "string" && document.endsWith(tags.join(" ").toLowerCase())
          ? document.slice(0, -tags.join(" ").length) : document;
        const leftPrograms = Array.isArray(left.program_names) ? [...left.program_names].sort() : [];
        const rightPrograms = Array.isArray(right.program_names) ? [...right.program_names].sort() : [];
        const normalizedDocument = (record) => {
          let document = suffix(record.search_document, record.search_tags ?? []);
          const programs = record.program_names ?? [];
          if (typeof document !== "string" || !programs.length) return document;
          // programs are appended inside the search string before the other
          // stable public fields; normalize their order without changing values.
          return document.replace(programs.join(" ").toLowerCase(), [...programs].sort().join(" ").toLowerCase());
        };
        const collationOnly = fields.every(field => ["program_names", "search_tags", "search_document"].includes(field)) &&
          JSON.stringify(leftTags) === JSON.stringify(rightTags) &&
          JSON.stringify(leftPrograms) === JSON.stringify(rightPrograms) &&
          normalizedDocument(left) === normalizedDocument(right);
        if (collationOnly) collationOnlyDifferences++;
        differences.push({ row: i, fields, collationOnly });
      }
    }
    report.push({ view: name, sourceRows: rows[0].rowCount, stageRows: rows[1].rowCount,
      sourceSha256, stageSha256, match: rows[0].rowCount === rows[1].rowCount && sourceSha256 === stageSha256,
      differingRows: differences.length, collationOnlyDifferences,
      semanticMatch: differences.length === collationOnlyDifferences,
      sampleDifferingFields: differences.slice(0, 5),
      nonCollationSamples: differences.filter(item => !item.collationOnly).slice(0, 10) });
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.some(item => !item.semanticMatch)) process.exitCode = 1;
} finally {
  await Promise.all(clients.map(client => client.end().catch(() => {})));
}
