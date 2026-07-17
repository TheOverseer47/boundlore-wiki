# P5-E.10B-W5-A1 — Storage Child Envelope Repair

## 1. Incident Chain

1. First storage failure after DB export: parent discarded child stdout/stderr → only `exit=1`.
2. Fix on `fb4d0d2`: streams captured + redacted legacy parsing.
3. Follow-up live run: `STOP_STORAGE_EXPORT_INCOMPLETE: unclassified storage child failure`
   because the child exited nonzero without a parent-recognized structured line (traceback /
   unstructured exception path).

## 2. Remaining Gap

Not missing stream capture — missing a **deterministic child→parent envelope** on every
exception path.

## 3. Envelope Format

Exactly one stderr line:

`BL_STORAGE_STOP|<STOPCODE>|phase=<PHASE>|http=<STATUS>|bucket=<ALLOWLISTED>|kind=<KIND>`

Only present allowlisted fields are appended. Field order in the parent message is always:
phase, http, bucket, kind.

## 4. Allowlists

**Stopcodes:** `STOP_LIVE_NETWORK_RESERVED`, `STOP_STORAGE_CREDENTIAL_MISSING`,
`STOP_WRONG_PROJECT`, `STOP_STAGING_TARGET`, `STOP_UNKNOWN_STORAGE_BUCKET`,
`STOP_INVENTORY_CHANGED_DURING_EXPORT`, `STOP_STORAGE_EXPORT_INCOMPLETE`

**Phases:** `startup`, `bucket-list`, `object-list`, `object-download`,
`inventory-compare`, `inventory-write`, `child-exception`

**Kinds:** `HTTPError`, `URLError`, `TimeoutError`, `SSLError`, `JSONDecodeError`,
`UnicodeDecodeError`, `OSError`, `ValueError`, `TypeError`, `RuntimeError`

**Buckets:** only `avatars`, `discovery-uploads`, `report-screenshots` may appear.
Unknown buckets never print the name (`STOP_UNKNOWN_STORAGE_BUCKET` alone).

## 5. Parent Behavior

1. Normalize streams (NUL/BOM/CRLF)
2. Prefer valid `BL_STORAGE_STOP` envelope
3. Else allowlisted legacy stopcodes (never free raw text)
4. Empty streams → `storage child exited with no diagnostic output` + byte metadata
5. Nonempty unclassified → `redacted unclassified storage child failure` + byte metadata

## 6. What This Does Not Prove

Envelope transport/classification is repaired. The next separately authorized live run can
surface a concrete class. Successful storage export is **not** automatically proven.

## 7. Safety

No Production/Staging/network/snapshot/retry during this gate. VeraCrypt unmounted.
Existing export artefacts untouched.

## 8. Final Decision

`PASS_STRUCTURED_STORAGE_CHILD_ENVELOPES_REPAIRED_OFFLINE` after offline QA + local commit.

## 9. Follow-on (prefix traversal)

A subsequent live run after envelopes surfaced:

`phase=object-download http=400 bucket=discovery-uploads kind=HTTPError`

That defect is addressed offline in
`docs/architecture/p5-production-storage-prefix-traversal-repair.md`
(Option A: prefix classification + slash-safe join). No live retry is implied by
this envelope gate alone.
