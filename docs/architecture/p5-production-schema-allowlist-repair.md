# P5-E.10B-W5-A1 — Production Schema Allowlist Repair

## 1. Incident Summary

The authorized W5-A1 Production snapshot attempt (SessionPooler mode) stopped safely
after release-gate and identity checks with:

`STOP_UNKNOWN_DATABASE_SCHEMA`

Prior markers:

- `RELEASE_GATE_LOCKED_PASS`
- `PRODUCTION_IDENTITY_PASS`

Snapshot workspace file count: **0**. No dump, storage export, packaging, age
encryption, local `.age` copy, or Wasabi upload occurred.

## 2. Root Cause

Runner allowlist was incomplete relative to the already documented Production
non-system schema inventory in
`docs/architecture/p5-backup-restore-evidence-readiness.md`.

## 3. Documented Production Schemas

Source inventory:

`auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`,
`storage`, `supabase_migrations`, `vault`

## 4. Allowlist Repair

Previous allowlist:

`public`, `auth`, `storage`, `extensions`, `graphql_public`, `realtime`

Added exactly three documented schemas:

- `graphql`
- `supabase_migrations`
- `vault`

No other schemas were added. Unknown schemas remain fail-closed.

## 5. Stopcode Clarity

Live inventory stop messages include the concrete unknown schema name
(schema names are not secrets). Connection strings, passwords, and row data
are never logged.

## 6. Safety Boundary

- No new Production connection
- No snapshot retry
- No dump / storage / Wasabi / VeraCrypt / SQL mutation

A later Production snapshot still requires a new explicit user authorization.

## 7. Final Decision

`PASS_DOCUMENTED_PRODUCTION_SCHEMA_ALLOWLIST_REPAIRED` after offline QA and local commit.
