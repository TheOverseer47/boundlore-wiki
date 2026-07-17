# P5 Production Remote Upload Diagnostics Repair

## Status

Offline gate only. No Production, Wasabi, network, upload, or `.bat` automation
in this change.

**Correct claim:** The upload path was hardened diagnostically and prepared for a
write-only Production principal. A successful Production Wasabi upload is **not**
thereby proven.

## Observed live stop

After `LOCAL_ENCRYPTED_COPY_PASS`:

```text
STOP_REMOTE_UPLOAD_NOT_AUTHORIZED: upload failed (no retry)
```

Local artefacts (DB, storage, manifest, age, D: copy) were complete. Encrypted
archive size ≈ 15.6 MiB `< --s3-upload-cutoff 100Mi` → **Single-Part** for that run.

## Why the old stopcode was semantically wrong

`Invoke-RcloneEphemeral` captured rclone stdout/stderr, then the failure path
discarded both and emitted a fixed string. Any failure (403, DNS, TLS, signature,
bucket, HEAD denial, timeout) collapsed to an authorization claim the code did
not prove.

## Fable-5 HEAD / write-only hypothesis

**Status: HIGH_CONFIDENCE (not CONFIRMED — stderr was discarded).**

Write-only principal (PutObject + ListBucket; no GetObject) + rclone destination
stat / post-upload HEAD + `--immutable` without write-only-compatible HEAD
suppression → rclone exit ≠ 0. Pre-HEAD failure ⇒ nothing uploaded; post-HEAD
failure ⇒ object may already exist (`REMOTE_OBJECT_STATUS=POSSIBLY_UPLOADED`).

## Trial vs Production

| | Trial | Production |
|---|---|---|
| Principal | Read-back (GetObject) | Write-only |
| Ambient AWS scrub | yes | **was missing** (now fixed) |
| Endpoint/region/provider | identical | identical |
| Post-upload verify | download | `lsl` + size |

## Local rclone evidence (this machine)

- Version: **rclone v1.74.4**
- `--s3-no-head` / `no_head`: *If set, don't HEAD uploaded objects to check integrity.*
- Env: `RCLONE_S3_NO_HEAD` / remote `RCLONE_CONFIG_<NAME>_NO_HEAD`
- Decision: **enable `--s3-no-head`** (CLI + env) for Production upload.
- Decision: **remove `--immutable`** — it requires destination existence checks
  incompatible with write-only IAM; collision safety via unique timestamped
  backup-id + ListBucket count/size verify. No overwrite/delete strategy.

## BL_UPLOAD_STOP

```text
BL_UPLOAD_STOP|<STOPCODE>|phase=<PHASE>|exit=<N>|http=<N>|kind=<KIND>|retryable=<true|false>|remote_state=<STATE>
```

Allowlists live in `tools/backup/_lib/UploadDiagnostics.ps1`.

**Remote states:** `NOT_UPLOADED` | `POSSIBLY_UPLOADED` | `UPLOADED_UNVERIFIED` | `UNKNOWN`

**Upload vs verify:** `phase=object-upload` vs `phase=remote-size-verify`. After
`WASABI_PRODUCTION_UPLOAD_PASS`, verify failures use `UPLOADED_UNVERIFIED`.

**Legacy:** `STOP_REMOTE_UPLOAD_NOT_AUTHORIZED` remains in `stop_codes.py` for
static/mock compatibility but is **not** the primary live Stop-Code.

## Ambient environment scrub

Child process only: remove AWS_* / RCLONE_S3_* / foreign RCLONE_CONFIG_* then set
explicit `RCLONE_CONFIG_BOUNDLOREPROD_*` including `NO_HEAD=true`.

## Cleanup

Temp empty rclone config directory removed in `finally` on all paths. Cleanup
failure emits `STOP_UPLOAD_CONFIG_CLEANUP_FAILED` without erasing a prior upload
pass marker semantics (`remote_state=UPLOADED_UNVERIFIED` when applicable).

## Offline QA

- `tools/backup/Test-BoundLoreUploadDiagnostics.ps1 -OfflineSelfTest`
- `qa/p5-production-remote-upload-diagnostics-check.py`
- `qa/fake-rclone/fake_rclone.py` (NETWORK_FORBIDDEN on URL args)

Marker: `NO_REAL_NETWORK_INVOKED_PASS`

## Next steps (separately authorized; not this gate)

1. ListBucket-only remote-state check of the last backup key.
2. Only if object missing: upload-only of the existing `.age` (not a full snapshot).
3. Launcher `.bat` only after a verified Production upload.

## Boundaries

No Production/Staging/network/snapshot/retry/dump/Storage/Wasabi/VeraCrypt/SQL/
`.bat`/Push/Deploy/Launch in this gate. Existing Production archives untouched.
