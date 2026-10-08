# MeroTalent Production Cutover Plan (Supabase → Neon)

> [!WARNING]
> **PRE-CUTOVER NOTICE:** This plan is executed ONLY after all staging verification gates are passed and explicit authorization is granted. Supabase remains live and untouched during staging.

---

### 1. Sequence & Maintenance Window
- **Scheduled Window**: 15 Minutes Planned Maintenance (Off-peak: 02:00–02:15 NPT).
- **Maintenance Banner**: Render platform maintenance banner on public routes.

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
- **Rollback Decision Trigger**: Any blocking regression detected during smoke tests or first 48 hours.
- **Rollback Actions**:
  1. Revert Vercel production environment variables to Supabase endpoints.
  2. Redeploy previous stable Vercel deployment.
  3. Re-enable Supabase OAuth callbacks.
  4. Perform two-way reconciliation for any records created in Neon during the window.

---

### 5. Final Supabase Retention & Decommissioning
- **Retention Period**: Supabase production project kept operational in read-only standby for **7 days** post-cutover.
- **Decommissioning**: Only after 7 days of 100% error-free Neon production operation will the Supabase project be scheduled for deletion.
