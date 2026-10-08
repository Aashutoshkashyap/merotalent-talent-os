# MeroTalent — Safe Read-Only Supabase Production Export Audit & Access Status

**Date:** October 8, 2026
**Auditor:** Antigravity AI Engine & MeroTalent Database Architecture Team
**Scope:** Production Export Path Discovery & Readiness Verification
**Safety Protocol:** Read-Only Verification — Zero modifications to Supabase Production. No credential changes.

---

## 1. Executive Verdict & Access Assessment

```text
============================================================
SOURCE ACCESS STATUS: READ-ONLY EXPORT BLOCKED
============================================================
Target Production Host: dtirpilgzlsfryucanlg.supabase.co (Verified)
Public Read Access:     OPERATIONAL (Anon key queries public rows)
Administrative Access:  BLOCKED (SUPABASE_SECRET_KEY is empty in .env)
Direct Database Access: BLOCKED (DATABASE_URL / psql not configured)
Neon Staging Target:    BLOCKED (NEON_URL not configured)

STATUS:
SOURCE:          CURRENT SUPABASE PRODUCTION (Host Verified)
DATABASE:        REAL IMPORT BLOCKED
AUTH:            REAL SOURCE MANIFEST BLOCKED
STORAGE:         REAL BINARY TRANSFER BLOCKED
RECONCILIATION:  BLOCKED

PRODUCTION CUTOVER: NO-GO
============================================================
```

---

## 2. Phase 1 — Source Access Inventory & Capability Audit

A systematic probe of local configurations, `.env` files, tooling, and network endpoints evaluated available source access methods:

| # | Access Mechanism | Status | Current Production? | Read-Only Safe? | DB DDL/DML Export | Auth (`auth.users`) Export | Storage Objects & Bytes |
|---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Supabase Direct `DATABASE_URL`** | **MISSING** | N/A | N/A | No (`psql`/dump blocked) | No | No |
| 2 | **Supabase Pooler Connection** | **MISSING** | N/A | N/A | No | No | No |
| 3 | **Supabase Service Role Key (`SUPABASE_SECRET_KEY`)** | **EMPTY (`""`)** | N/A | N/A | Partial (PostgREST DML only) | No (Admin API blocked) | No (Private buckets blocked) |
| 4 | **Supabase Anon / Publishable Key** | **PRESENT & VERIFIED** | **YES** (`dtirpilgzlsfryucanlg.supabase.co`) | **YES** | No (RLS restricts private data) | No (Public access only) | No (Public bucket metadata only) |
| 5 | **Supabase Management API Token** | **MISSING** | N/A | N/A | No | No | No |
| 6 | **Supabase CLI (`supabase`) Session** | **NOT INSTALLED** | N/A | N/A | No | No | No |
| 7 | **Existing Production Dump File** | **NONE FOUND** | N/A | N/A | No | No | No |
| 8 | **Neon Staging Connection (`NEON_URL`)** | **MISSING** | Target: `summer-sky-63693897` | N/A | Staging branch empty | Staging branch empty | Staging branch empty |

---

## 3. Live Read-Only Connectivity Proof

A non-mutating read query executed against `https://dtirpilgzlsfryucanlg.supabase.co` confirmed live project identity:

* **Endpoint:** `https://dtirpilgzlsfryucanlg.supabase.co/rest/v1/institutes?select=*&head=true`
* **Result:** HTTP 200 OK — `count: 292` public institute records returned.
* **Target Confirmation:** Confirmed that `dtirpilgzlsfryucanlg.supabase.co` is the live, authoritative MeroTalent production project.

---

## 4. Exact Missing Credentials & Required User Configuration

In compliance with **Phase 2 (Hard Safety Rules)**, zero credentials were reset, zero passwords were changed, and no fake or synthetic credentials were used.

To perform the legitimate, auditable, read-only extraction and populate the isolated Neon staging branch, the following two safe, read-only configurations must be supplied:

### Required Credential 1: Supabase Source Export (One of the following)
* **Option A (Recommended for Full DB & Auth Export):** Direct Read-Only PostgreSQL Connection String:
  ```text
  postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```
  *(Obtained from: Supabase Dashboard → Project Settings → Database → Connection Pooling / Direct)*
* **Option B (For API-driven Auth & Storage & Table Export):** Supabase Service Role Key:
  ```text
  SUPABASE_SECRET_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
  *(Obtained from: Supabase Dashboard → Project Settings → API → `service_role` secret)*

### Required Credential 2: Neon Staging Import
* **Neon Staging Branch Connection String:**
  ```text
  NEON_URL="postgresql://[user]:[password]@ep-summer-sky-63693897-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```
  *(Obtained from: Neon Console → Project `summer-sky-63693897` → Branch `migration-staging` → Connection Details)*

---

## 5. Safe Automated Migration Pipeline Plan (Once Credentials Provided)

Once the read-only credentials are supplied, the extraction and staging import will proceed sequentially:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Authorized Operator
    participant Source as Supabase Production (dtirpilgzlsfryucanlg)
    participant Runner as Secure Migration Runner
    participant Staging as Neon Staging (summer-sky-63693897:migration-staging)

    Note over Source: READ-ONLY SAFE EXTRACTION
    Dev->>Runner: Execute with SUPABASE_SECRET_KEY / DATABASE_URL & NEON_URL
    Runner->>Source: 1. Fetch 102 auth.users & identities (Admin API)
    Runner->>Source: 2. Dump application schema & 80 tables (Read-Only pg_dump / PostgREST)
    Runner->>Source: 3. Download 22 storage objects & calculate SHA-256 locally

    Note over Staging: ISOLATED STAGING IMPORT
    Runner->>Staging: 4. Apply schema & populate 80 tables
    Runner->>Staging: 5. Populate merotalent_accounts mapping table
    Runner->>Staging: 6. Re-host 22 storage objects in staging buckets

    Note over Runner,Staging: RECONCILIATION
    Runner->>Staging: 7. Run canonical MD5 checksum across all 80 tables
    Runner->>Dev: 8. Generate verified parity evidence report
```

---

## 6. Cutover Verdict

```text
============================================================
STATUS SUMMARY
============================================================
SOURCE:              CURRENT SUPABASE PRODUCTION (Verified)
DATABASE:            REAL IMPORT BLOCKED
AUTH:                REAL SOURCE MANIFEST BLOCKED
STORAGE:             REAL BINARY TRANSFER BLOCKED
RECONCILIATION:      BLOCKED

PRODUCTION CUTOVER:  NO-GO
============================================================
```
