# 🔄 NSK-ESPORTS — Supabase to MongoDB Migration Guide & Rollback Plan

This guide documents the automated migration process from Supabase (PostgreSQL) to MongoDB + Node.js/Express.

---

## 1. Migration Strategy

The migration process follows an **Extract ➔ Transform ➔ Validate ➔ Load ➔ Verify** pipeline:

```text
PostgreSQL (Supabase)
       ↓ (Extract via REST / SDK)
JSON Records
       ↓ (Transform & UUID to ObjectId Mapping)
Mongoose Models (MongoDB)
       ↓ (Load & Index Creation)
Audit & Parity Verification
```

### Key Conversions
1. **Tables to Collections**:
   - `tournaments` ➔ `tournaments`
   - `teams` ➔ `teams`
   - `matches` ➔ `matches`
   - `match_results` ➔ `matchresults`
   - `announcements` ➔ `announcements`
2. **UUIDs to ObjectIds**:
   - Primary keys and foreign keys were mapped to 24-character hexadecimal MongoDB `ObjectId` references. The original UUID is stored in `legacyId` for traceability.
3. **Flat Columns to Nested Structures**:
   - Columns like `tournament_date`, `reg_deadline`, `num_matches` were structured cleanly into sub-documents: `schedule: { date, regDeadline, numMatches }`.
   - `total_slots` and `filled_slots` ➔ `slots: { total, filled }`.
   - `entry_fee`, `upi_id`, `qr_code_url` ➔ `entry: { fee, upiId, qrCodeUrl }`.

---

## 2. Automated Scripts

| Script | Command | Purpose |
|---|---|---|
| **Data Migration** | `npm run migrate` | Connects to Supabase, pulls all records, transforms and inserts into MongoDB. |
| **Demo Seeder** | `npm run seed` | Seeds a tournament with full teams, matches, results, and announcement. |
| **Unit & Model Tests** | `npm run test:backend` | Tests Mongoose models, password hashing, atomic slots, and scoring engine. |
| **E2E REST API Tests** | `npm run test:e2e` | Runs comprehensive 10-step integration test suite covering all endpoints. |

---

## 3. Rollback Strategy

If any unforeseen issue arises, rollback to Supabase can be performed instantaneously:

1. **Re-enable Supabase in Frontend**:
   - In `.env`, restore `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - In `src/services/dataService.js`, the previous Supabase queries can be restored from Git commit tags.
2. **Data Preservation**:
   - The PostgreSQL database was never modified or deleted during the migration; all existing Supabase tables remain untouched.
3. **Safe Fallback**:
   - The frontend and backend communicate strictly via REST abstractions.
