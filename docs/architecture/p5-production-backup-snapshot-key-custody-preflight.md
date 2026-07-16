# P5-E.10B-W5-P1 — Production Backup Snapshot and Key-Custody Preflight

## 1. Executive Result

**Verdict:** `PASS_PRODUCTION_SNAPSHOT_PREFLIGHT_READY_FOR_MANUAL_PREPARATION`

Fail-closed production snapshot architecture, package format, encryption-before-upload rules, key-custody model, Wasabi target recommendation, and offline synthetic tests are ready. **No** Production dump, storage download, Wasabi access, credentials, or production age key were created in this gate.

## 2. Authorization Boundary

Authorized: local authoring, synthetic offline tests, QA, documentation, local commit.

Forbidden and not performed: Supabase/Wasabi network, dumps, uploads, restores, billing, installs, push/deploy/launch, credential prompts, production key generation.

## 3. Git Baseline

| Item | Value |
|---|---|
| Baseline commit | `2eb2dfa` |
| Branch | `review/p5-e10b-w5-p1-production-snapshot-preflight` |
| Prior verdict | `PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED` |

## 4. Current S-07 State

S-07 remains **OPEN**. Offline age/rclone and synthetic Wasabi roundtrip are proven. Production snapshot and restore are still required.

## 5. Proven W4 Capabilities

- Real age encrypt/decrypt offline
- Local rclone filesystem transfer
- Encrypted synthetic Wasabi roundtrip (one object retained under trial prefix)
- Trial principal is **not** authorized for production snapshots

## 6. Production Snapshot Scope

A complete BoundLore snapshot must cover PostgreSQL (roles without password hashes, schemas/data, functions/RPCs, triggers, RLS/policies, grants, extensions, types), Supabase-specific schemas (`public`, `auth`, `storage`, plus allowlisted platform schemas), storage binaries for the three content buckets, and redacted configuration recovery inventories (never secret values).

## 7. Database Coverage

Planned tools: `pg_dumpall --roles-only --no-role-passwords` and `pg_dump -Fc` with TOC via `pg_restore -l`. Live connections remain unimplemented (`LiveDumpImplemented = false`).

## 8. Supabase-specific Database Coverage

Allowlist starts with: `public`, `auth`, `storage`, `extensions`, `graphql_public`, `realtime`. Later live gate must discover schemas read-only and stop on unknown non-system schemas (`STOP_UNKNOWN_DATABASE_SCHEMA`).

## 9. Storage Binary Coverage

Allowlist only: `avatars`, `discovery-uploads`, `report-screenshots`. Unknown bucket → `STOP_UNKNOWN_STORAGE_BUCKET`. Streaming + SHA-256; no upload/update/delete APIs.

## 10. Configuration Recovery Coverage

Encrypted inventories for Supabase/Cloudflare/GitHub recovery **names and procedures only** — never secret values, never service-role keys, never passwords.

## 11. Snapshot Consistency Model

Future live sequence: confirm production ref → confirm release gate locked → invent schemas/buckets → dump DB → export storage with start/end inventory → fail-closed on inventory drift. No freeze/lock mutations.

## 12. Backup Package Format

```
boundlore-production-backup-<UTC>/
  manifest/   backup-manifest.json.age + public-summary.json
  database/   roles.sql.age, database.custom.age, inventories *.age
  storage/    avatars|discovery-uploads|report-screenshots + storage-manifest.json.age
  configuration/  *-recovery-inventory.json.age
  evidence/   snapshot-summary.json
```

Sensitive parts client-side age-encrypted; plaintext never uploaded.

## 13. Manifest Schema

Includes format_version, backup_id, timestamps, source env/ref/region, git commit, release-gate expected/observed, DB/storage inventories, `role_passwords_included: false`, encryption method + recipient fingerprint, `plaintext_uploaded: false`, redacted Wasabi fields, validation/cleanup/restore statuses, tool versions. Full manifest encrypted; public summary has no user identifiers or schema details.

## 14. Production Encryption Model

age only; public recipient required for encrypt; private key never in runner args, Git, Wasabi, or chat. Encrypt before any offsite put.

## 15. Key-Custody Model

Distinct production age keypair (manual user creation). Private key: ≥2 offline copies at physically separate locations; not sole-copy on one PC; never only in Git/Wasabi/chat/Downloads. Annual restore-key test; rotate with retention of old keys until last ciphertext expires. Runner never creates the production key.

## 16. Local Artifact Location Model

Outside repository; not Desktop/Downloads/synced public clouds by default. Concrete path chosen by user and stored only in an **out-of-repo** local config. Free-space check required before live run. Temp plaintext cleaned after encrypt+verify.

## 17. Wasabi Production Target Options

**A** — existing trial bucket + new `production-snapshots/` prefix (fast; weaker isolation).  
**B** — dedicated production backup bucket (clearer isolation; extra manual setup).

## 18. Recommended Wasabi Target

**Recommend Variant B (dedicated production backup bucket)** once the user is ready for manual setup: isolates trial objects, supports distinct principals, clearer naming/retention decisions. Until then, do **not** reuse `trial-integration/` principal or prefix. First production gate: Put/List only on exact production prefix; **no Delete**.

## 19. Production Credential Separation

Three separate runtime secrets: DB dump, Supabase storage read, Wasabi production put/list. Trial credentials must not be reused. No credentials as script parameters; child-process-only env; wipe after use.

## 20. Retention and 90-Day Constraint

Wasabi minimum retention (~90 days) implies no early remote delete. First snapshot immutable object names under `production-snapshots/<backup-id>/`. No lifecycle automation in this gate.

## 21. Trial Expiration Risk

Before trial end: user either continues paid **manually** or downloads needed artefacts and winds down. Agent must not renew/purchase.

## 22. Production Runner Guards

`Invoke-BoundLoreProductionSnapshot.ps1` defaults: PreflightOnly + Synthetic + NoNetwork. Live intent requires every confirmation switch and still stops in W5-P1 with `STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED`.

## 23. Stopcodes

Includes production authorization, wrong/staging project, release gate, unknown schema/bucket, unsafe output, free space, missing DB/storage/Wasabi/recipient credentials, encryption failures, plaintext upload, incomplete dump/export, inventory drift, remote scope/upload, credential persistence risk, local cleanup failure (see `_lib/stop_codes.py` + runner).

## 24. Synthetic Offline Test

Mock DB + three buckets + encrypted manifest shape + local rclone copyto + decrypt verify + cleanup. External/Wasabi/Supabase requests: **0**.

## 25. Static QA

`qa/p5-production-snapshot-preflight-static-check.py`

## 26. Runtime QA

`qa/p5-production-snapshot-preflight-runtime-check.py` (preflight, negatives, synthetic offline). W4 Wasabi runner **not** re-executed.

## 27. User Decisions Required

1. Wasabi production target (dedicated bucket recommended) + new production principal (not trial).  
2. Production age key custody (manual generation + two offline copies + recovery plan).  
3. Local encrypted artefact path (out of repo; sufficient free space).  
4. Trial end: paid continuation **or** controlled wind-down.

No secrets or key material requested in this document.

## 28. Manual Preparation Gate

Next: **P5-E.10B-W5-M1 — Manual Production Key Custody and Wasabi Backup Scope Preparation** (user-only actions).

## 29. Actual Snapshot Authorization Boundary

Still forbidden until a later explicit gate: production dump, storage download, Wasabi production upload, restore, Supabase write.

## 30. Restore Dependency

Restore remains a separate design/test track: local package verify first; isolated target only; never overwrite staging as production stand-in without explicit isolation gate.

## 31. Architecture Preservation

No application/Supabase/Cloudflare/dependency/SQL changes.

## 32. Known Limitations

- Live dump/export/upload not implemented (intentional)
- Production key and Wasabi production scope not created
- Free-plan Supabase managed backup limits unchanged
- Schema allowlist may need expansion after live discovery

## 33. Changed Files

- `tools/backup/Invoke-BoundLoreProductionSnapshot.ps1`
- `tools/backup/_lib/stop_codes.py`
- `qa/p5-production-snapshot-preflight-static-check.py`
- `qa/p5-production-snapshot-preflight-runtime-check.py`
- `docs/architecture/p5-production-backup-snapshot-key-custody-preflight.md`

## 34. Commands Executed

- Git preflight + branch create
- Local `--version` / help for age, rclone, pg_* (no connections)
- Synthetic/negative offline runner invocations
- Static/runtime QA; existing backup QA (offline)
- Diff/secret control + local commit

## 35. Safety Attestation

Production DB/storage accessed: **NO**. Dump/backup/Wasabi/credentials/production key/restore/billing/push/deploy/launch: **NO**.

## 36. Final Decision

**`PASS_PRODUCTION_SNAPSHOT_PREFLIGHT_READY_FOR_MANUAL_PREPARATION`**

## 37. Next Gate

**P5-E.10B-W5-M1 — Manual Production Key Custody and Wasabi Backup Scope Preparation**
