/** Mechanical, exhaustive classification of the live catalog; unresolved items stay explicit. */
import fs from "node:fs";
import path from "node:path";

const inventory = JSON.parse(fs.readFileSync("/private/tmp/merotalent-neon-schema-inventory-2026-10-08.json", "utf8"));
const outputDate = "2026-10-08";
const esc = value => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ").trim();
const quote = value => `\`${esc(value)}\``;
const table = (headers, rows) => [
  `| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map(row => `| ${row.map(esc).join(" | ")} |`), "",
].join("\n");
const stageTriggers = new Set(inventory.stage.triggers.map(row => `${row.table_name}.${row.name}`));
const stageFunctions = new Set(inventory.stage.functions.map(row => `${row.name}(${row.args})`));
const stageViews = new Set(inventory.stage.views.map(row => row.name));
const sensitiveTables = new Set([
  "profiles", "user_roles", "user_permissions", "role_permissions", "permissions", "module_entitlements",
  "entity_admin_assignments", "user_module_capabilities", "entity_feature_grants", "subscriptions", "payments",
  "payment_checkout_sessions", "payment_proofs", "payment_webhook_events", "provider_configurations",
  "module_ai_credentials", "college_applications", "job_applications", "mentor_bookings",
  "event_registrations", "leads", "notifications", "audit_logs", "media_upload_intents",
  "conversations", "messages", "sub_admin_requests", "entity_scope_requests",
]);
const publicReadReplacements = new Map([
  ["institutes", "NeonRepositories.getPublicInstitute / institute directory view"],
  ["jobs", "NeonRepositories.getPublicJob"],
]);
function policyClassification(row) {
  const publicRead = row.cmd === "SELECT" && /public|anyone|published|approved|visible|browse|directory/i.test(row.policyname);
  const replacement = publicRead ? publicReadReplacements.get(row.tablename) : undefined;
  if (replacement) return { category: "B", replacement, target: "Server query filters published/approved records; retain route tests", status: "Implemented for tested public read only" };
  const obsolete = /^(course_enrollments|course_modules|course_videos|lessons|lesson_progress|quizzes|certificates)$/i.test(row.tablename);
  if (obsolete) return { category: "E", replacement: "No Neon route proven; internal LMS is outside current product scope", target: "Decide retention/archival; deny direct access", status: "Manual product review" };
  return { category: "D", replacement: "Partial server checks; no equivalent per-row policy verified",
    target: "Trusted server identity + exact resource/operation guard before route cutover", status: "Not yet implemented/verified" };
}
const policyRows = inventory.source.policies.map(row => {
  const c = policyClassification(row);
  return [quote(row.policyname), quote(row.tablename), quote(row.cmd),
    `Source rule: ${row.policyname}`,
    `USING ${row.qual ?? '—'}; WITH CHECK ${row.with_check ?? '—'}`,
    sensitiveTables.has(row.tablename) ? "High — private/admin/payment" : "Moderate — content/ownership",
    c.replacement, c.target, `${c.category}: ${c.status}`];
});
const policyCounts = policyRows.reduce((counts, row) => { const key = row[8][0]; counts[key] = (counts[key] ?? 0) + 1; return counts; }, {});
let securityReport = `# Isolated Neon staging security-object classification — ${outputDate}\n\n`;
securityReport += `Source: live Supabase catalog, read-only. Target: migration-staging \`br-frosty-haze-azsnybmr\`. This is a classification, **not an assertion of security parity**. Staging has no RLS policies and runtime access is limited to the subset of server routes explicitly guarded by Neon authorization. No production changes.\n\n`;
securityReport += `## Policy decisions\n\nA = database boundary required; B = verified application replacement for the named read; C = Supabase-specific and obsolete; D = redesign needed; E = unclear/manual review. The source has ${policyRows.length} policies: ${Object.entries(policyCounts).map(([key,n])=>`${key}: ${n}`).join(", ")}. A and C are currently zero because neither a trusted database actor context nor a fully obsolete policy set has been proven. The generic “Active accounts” policies are **not** copied: they rely on Supabase roles/functions and may combine permissively with other policies.\n\n`;
securityReport += table(["Policy", "Table", "Operation", "Purpose", "Source predicate", "Sensitivity", "Current application replacement", "Target behavior", "Status"], policyRows);
securityReport += `\nThe B classification is deliberately limited to named public read policies; it does **not** certify other operations on those tables. Every D/E item must be matched to an authorized server route or retained database control before cutover. Direct SQL credentials must remain server-only.\n`;
fs.writeFileSync(`docs/neon-staging-security-object-classification-${outputDate}.md`, securityReport);

const authDependent = name => [
  "audit_row_change", "secure_legacy_appointment", "protect_college_application_owner_update",
  "protect_college_admin_fields",
  "protect_company_admin_fields", "protect_event_approval_fields", "protect_event_registration_owner_update",
  "protect_job_application_update", "protect_job_approval_fields", "protect_mentor_admin_fields",
  "protect_mentor_booking_owner_update", "protect_message_update", "protect_notification_update",
  "protect_profile_admin_fields", "secure_job_application_insert", "validate_job_application_media",
  "track_institute_content_ownership", "convert_admin_delete_to_soft_delete", "notify_approval_change",
].includes(name);
function triggerCategory(row) {
  if (/updated_at|timestamp/.test(row.function_name)) return "C — timestamp/derived";
  if (row.function_name === "audit_row_change") return "B — audit/history";
  if (row.function_name === "create_lead_from_submission" || row.function_name === "sync_payment_result" ||
      row.function_name === "release_expired_checkout_reservation" || row.function_name === "release_failed_paid_reservations" ||
      row.function_name === "sync_legacy_college_admin_assignment") return "A — application behavior";
  if (authDependent(row.function_name)) return "D — Supabase Auth context / redesign";
  return "A — integrity/derived behavior";
}
const triggerRows = inventory.source.triggers.map(row => [quote(row.table_name), quote(row.name), quote(row.function_name),
  triggerCategory(row), stageTriggers.has(`${row.table_name}.${row.name}`) ? "Retained on staging" : "Excluded pending trusted actor / redesign"]);
const scanDirs = ["src", "app"];
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(ts|tsx|js|mjs)$/.test(file) && !/\.(test|spec)\./.test(file) ? [file] : [];
  });
}
const codeFiles = scanDirs.flatMap(sourceFiles).map(file => ({ file, code: fs.readFileSync(file, "utf8") }));
function callers(name) {
  const literal = new RegExp(`(?:\\.rpc\\s*\\(\\s*["'\\x60]|public\\.)${name}\\b`);
  return codeFiles.filter(item => literal.test(item.code)).map(item => item.file).slice(0, 3);
}
const triggerFunctionNames = new Set(inventory.source.triggers.map(row => row.function_name));
const functionRows = inventory.source.functions.map(row => {
  const key = `${row.name}(${row.args})`;
  const callerPaths = callers(row.name);
  const retained = stageFunctions.has(key);
  const extension = row.language === "c" || row.language === "internal";
  const legacy = /_before_|_legacy_phase|_legacy_/.test(row.name) && !retained;
  const classification = retained ? (extension ? "Extension-provided" : "Retained SQL function")
    : legacy ? "Obsolete historical implementation"
    : callerPaths.length ? "Unmigrated Supabase RPC caller — redesign required"
    : triggerFunctionNames.has(row.name) ? "Trigger dependency — pending redesign"
    : "No current caller proven — manual review";
  const replacement = retained ? "Neon SQL" : callerPaths.length ? "No complete Neon replacement verified" : "None verified";
  return [quote(`${row.name}(${row.args})`), row.security_definer ? "Yes" : "No",
    callerPaths.length ? callerPaths.map(quote).join(", ") : triggerFunctionNames.has(row.name) ? "Source trigger" : "Not found in runtime scan",
    classification, replacement, retained ? "Present" : "Excluded/deferred"];
});
const sourceConstraints = inventory.source.constraints.filter(row => row.type !== "n");
const stageConstraints = new Set(inventory.stage.constraints.filter(row => row.type !== "n").map(row => `${row.table_name}.${row.name}`));
const missingConstraints = sourceConstraints.filter(row => !stageConstraints.has(`${row.table_name}.${row.name}`));
const sourceIndexes = inventory.source.indexes;
const stageIndexes = new Set(inventory.stage.indexes.map(row => row.name));
const missingIndexes = sourceIndexes.filter(row => !stageIndexes.has(row.name));
const constraintRows = missingConstraints.map(row => [quote(row.table_name), quote(row.name), quote(row.type),
  quote(row.definition), /REFERENCES auth\./i.test(row.definition) ? "Blocked by absent imported Auth identities/table" : "Needs investigation / equivalent constraint"]);
let schemaReport = `# Actual Neon migration-staging schema parity — ${outputDate}\n\n`;
schemaReport += `Inventory host: \`${inventory.stageHost}\`; source was read-only. Source has ${inventory.source.triggers.length} triggers, ${inventory.source.views.length} views, ${inventory.source.functions.length} public functions (including extensions), ${sourceConstraints.length} non-null constraints, and ${sourceIndexes.length} indexes. Staging currently has ${inventory.stage.triggers.length} triggers, ${inventory.stage.views.length} views, ${inventory.stage.functions.length} public functions (including extensions), ${stageConstraints.size} non-null constraints, and ${inventory.stage.indexes.length} indexes. Counts do not imply functional/security parity.\n\n`;
schemaReport += `## Triggers — every source trigger\n\n47 reviewed portable triggers were retained; 40 remain excluded. Auth-context triggers cannot be copied while staging has no trusted Neon actor propagation.\n\n`;
schemaReport += table(["Table", "Trigger", "Function", "Class", "Target decision"], triggerRows);
schemaReport += `## Views\n\n`;
schemaReport += table(["View", "Purpose", "Target", "Dependency"], inventory.source.views.map(row => [quote(row.name),
  row.name === "institute_directory" ? "Approved public institute search + effective verification" : "Active public profile projection",
  stageViews.has(row.name) ? "Recreated with security_barrier" : "Missing",
  row.name === "institute_directory" ? "is_college_effectively_verified ported" : "profiles only"]));
schemaReport += `Read-only row comparison: public_profile_directory is exact (103/103 rows and SHA-256). institute_directory returns 292/292 rows with every non-derived value matching; 116 rows differ only in ordering of derived program/tag arrays and the resulting search_document text under PostgreSQL 17 vs 18 collation. Normalized semantic comparison passes; raw view SHA-256 does not match.\n\n`;
schemaReport += `## Functions and RPCs — every source public function\n\nThis caller scan is static and may miss dynamically named RPCs. A function labeled “not found” is **not** approved for removal. Supabase-dependent functions stay excluded pending trusted Auth context or explicit server-service replacement.\n\n`;
schemaReport += table(["Function/signature", "Security definer", "Caller", "Classification", "Replacement", "Target"], functionRows);
schemaReport += `## Constraints missing from target (${missingConstraints.length})\n\n`;
schemaReport += table(["Table", "Constraint", "Type", "Source definition", "Decision"], constraintRows);
schemaReport += `## Indexes missing from target (${missingIndexes.length})\n\n`;
schemaReport += table(["Table", "Index", "Definition", "Decision"], missingIndexes.map(row => [quote(row.table_name), quote(row.name), quote(row.definition), "Investigate"]));
schemaReport += `\nAuth foreign keys are deferred until the identity mapping and Auth-backed target are designed. The institute trigram indexes and partner URL check were restored on staging. Neither these objects nor the two views prove route-level authorization.\n`;
fs.writeFileSync(`docs/neon-staging-schema-parity-${outputDate}.md`, schemaReport);
console.log(JSON.stringify({ policies: policyRows.length, policyCounts, triggers: triggerRows.length,
  retainedTriggers: triggerRows.filter(row => row[4] === "Retained on staging").length,
  sourceFunctions: functionRows.length, retainedFunctions: functionRows.filter(row => row[5] === "Present").length,
  missingConstraints: missingConstraints.length, missingIndexes: missingIndexes.length }, null, 2));
