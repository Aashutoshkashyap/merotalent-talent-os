# MeroTalent Production Cutover Plan (Supabase → Neon)

> [!WARNING]
> **PRE-CUTOVER NOTICE:** This plan is executed ONLY after all staging verification gates are passed and explicit authorization is granted. Supabase remains live and untouched during staging.

---

### 1. Sequence & Maintenance Window
- **Window not yet established**: the earlier 02:00–02:15 NPT proposal was not
  an executed or verified maintenance window. Do not advertise a 15-minute bound
  until the actual write-fence, final-delta and rollback timings are rehearsed.
- **Maintenance Banner**: Render platform maintenance banner on public routes.
- A banner or application API fence alone does not stop cached legacy clients
  writing directly to Supabase. The cutover gate must prove source database and
  storage write quiescence, including in-flight uploads, before the final snapshot.

---

### 2. Step-by-Step Execution Protocol

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION CUTOVER PROTOCOL                           │
├───────┬─────────────────────────┬───────────────────────────────────────────┤
│ T-15m │ Freeze Writes           │ Set application to read-only maintenance  │
│       │                         │ mode; pause payment checkout initialization│
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T-10m │ Final DB Sync           │ Execute final differential pg_dump & sync │
│       │                         │ into Neon Production branch               │
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T-08m │ Final Storage Delta     │ Sync newly uploaded files to S3 buckets   │
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T-05m │ Google OAuth Switch     │ Add Neon Auth Callback URL to Google      │
│       │                         │ Cloud Console credentials                 │
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T-03m │ Vercel Env Update       │ Update Vercel Production Environment      │
│       │                         │ variables (DATABASE_URL, NEON_AUTH_URL)   │
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T-00m │ Deploy Production       │ Deploy Neon-backed production build       │
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T+05m │ Automated Smoke Tests   │ Execute end-to-end UAT test suite         │
├───────┼─────────────────────────┼───────────────────────────────────────────┤
│ T+10m │ Remove Maintenance Mode │ Open traffic to users on Neon production  │
└───────┴─────────────────────────┴───────────────────────────────────────────┘
```

---

### 3. Automated Smoke Test Checklist
- [ ] User Login (Password & Google OAuth)
- [ ] Profile retrieval and photo rendering
- [ ] College directory browsing & application submission
- [ ] Jobs discovery, matching score, and application submission
- [ ] Mentorship booking (Free & eSewa Paid verification)
- [ ] Event registration and QR code generation
- [ ] Notification delivery via SSE stream
- [ ] Admin RBAC, module capabilities, and audit log generation

---

### 4. Rollback Plan
- **Current evidence (2026-10-20)**: the production candidate encrypted backup
  restored locally with 99-table schema/row equality. A committed skill insert
  and update were replayed into another fresh local restore with all fingerprints
  matching, preserved identities/grants, and conflict/duplicate denial. This is
  local candidate-clone evidence, not an executed live Supabase rollback.
- **Rollback Decision Trigger**: Any blocking regression detected during smoke tests or first 48 hours.
- **Historical proposed actions, not an executable approved rollback yet**:
  1. Revert Vercel production environment variables to Supabase endpoints.
  2. Redeploy previous stable Vercel deployment.
  3. Re-enable Supabase OAuth callbacks.
  4. Perform two-way reconciliation for any records created in Neon during the window.

Never simply point traffic back to an old Supabase snapshot after Neon has accepted
writes. Stop new writes first, capture the committed delta, reject conflicting
before-images and preserve new identities, scopes, files and transaction state.
Account mappings cannot be recreated by matching email. Restoring an earlier
Neon-compatible application build while keeping the verified Neon data may be
safer than a backend reversal. Actual source-schema/Auth/storage compatibility and
the chosen rollback procedure must pass before canonical promotion.

---

### 5. Final Supabase Retention & Decommissioning
- **Retention**: retain the legacy source, backups and explicit ownership-recovery
  path until Neon stability and account recovery requirements are verified.
- **Decommissioning**: no automatic seven-day deletion. Remove obsolete runtime
  access only after successful cutover; destructive infrastructure retirement
  requires a separately verified and explicitly authorized retention decision.
