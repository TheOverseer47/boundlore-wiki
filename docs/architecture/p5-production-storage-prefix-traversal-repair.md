# P5 Production Storage Prefix Traversal Repair

## Status

Offline gate only. No Production access, snapshot retry, VeraCrypt mount, or
`.bat` automation in this change.

**Correct claim:** The locally confirmed prefix/path defect was repaired and
tested offline comprehensively. A complete Production storage export and
encrypted Production upload are **not** thereby proven.

## Observed live stop

After `DATABASE_EXPORT_PASS`:

```text
STOP_STORAGE_EXPORT_INCOMPLETE
phase=object-download
http=400
bucket=discovery-uploads
kind=HTTPError
```

Artefacts: database files present; storage `0`; no manifest; no `.age`; no
Wasabi upload. VeraCrypt unmounted after the consumed live attempt.

## Why Auth / TLS / bucket reachability are unlikely as the primary cause

- Bucket listing (`phase=bucket-list`) succeeded earlier in the same child.
- Object listing reached `discovery-uploads` (failure only at `object-download`).
- An auth failure would typically surface as `401`/`403` at list time, not a
  single-bucket `400` on GET object.
- Envelope fields show an HTTP application error on a download path, not a
  transport/TLS class (`URLError` / `SSLError` / `TimeoutError`).

## Confirmed defects (pre-repair)

### 1. Slash-only prefix detection

Folders were recognized only via `str(name).endswith("/")`.

Supabase virtual folders typically appear as:

```json
{ "name": "user-prefix", "id": null, "metadata": null }
```

without a trailing slash. Those entries were inventarised as files and
downloaded as `GET /storage/v1/object/<bucket>/<prefix>` → HTTP 400.

### 2. Fragile `prefix + name` join

Recursive path building used string concatenation / `startswith` heuristics,
e.g. `user-a` + `image.png` → `user-aimage.png`. The recursion path was often
unreachable until prefix detection worked, so this was a latent second bug.

## New classification rule

`is_prefix_entry(entry)`:

| Result | Rule |
|--------|------|
| Prefix (`True`) | Mapping with non-empty name, `id is None`, `metadata is None` (trailing `/` allowed as compatibility signal under the same field rule) |
| Object (`False`) | Non-null `id` (metadata may be null/empty/`size=0`) **or** null `id` with a `dict` metadata payload |
| Fail-closed (`None`) | Non-dict, empty/NUL name, backslash/drive/UNC shapes, trailing `/` with object identity, non-dict metadata |

Never classify by size alone, missing mimetype, or missing timestamps.

## Canonical path join

`join_storage_path(prefix, name)`:

- Always `/` (never `os.path.join` / Windows `\`)
- Empty prefix → `name`
- Non-empty → `prefix/name`
- No double slashes; strip leading/trailing slashes before join
- Reject `.`, `..`, empty segments, NUL

## Recursion model

1. List one prefix (API prefix ends with `/` when non-empty).
2. Paginate with a **per-prefix** offset starting at `0` (`limit=100`).
3. Split prefixes vs objects via `is_prefix_entry`.
4. Fully qualify remote paths with `join_storage_path`.
5. Recurse child prefixes in sorted order.
6. `visited` set prevents cycles (fail-closed `kind=RuntimeError`).
7. `MAX_PREFIX_DEPTH = 64` (fail-closed beyond).

Duplicate relative names within a prefix page sequence → fail-closed.

## Pagination

Offsets are not shared across prefixes. Empty final pages end the loop.
Exact multiples of the page limit do not invent phantom objects.

## URL encoding

Download URLs encode the remote path **once** with `urllib.parse.quote(..., safe='/')`.
No object paths or full URLs appear in envelopes.

## Local path traversal defence

- `validate_remote_object_path` rejects `..`, absolute, drive, UNC, backslash, trailing `/`.
- Local dest must resolve under the bucket output directory (`assert_dest_under_bucket_root`).
- On-disk names remain SHA-256 hex digests + `.bin` (no remote names on disk).

## Red / Green proof

**RED (legacy slash-only):** `{name: user-a, id: null, metadata: null}` treated as
object → download target `user-a` → structural HTTP 400.

**GREEN (repair):** same entry is a prefix; inventory is only
`user-a/image.png`; no download for `user-a`.

## Offline test matrix

`qa/p5-production-storage-prefix-traversal-check.py` covers empty/mixed buckets,
nesting (2/3/10/64/over-max), cycle guard, classification edge cases, joins,
URL encoding, pagination (99/100/101/250), download envelopes
(400/401/403/404/Timeout/SSL/OSError), inventory counts/bytes/drift, and
secret/path non-leak assertions. Ends with `NO_REAL_NETWORK_INVOKED_PASS`.

## Boundaries of this gate

- No Production / Staging / network / DNS / HTTP
- No snapshot retry, dump, Storage/Wasabi access, VeraCrypt, SQL
- No `.bat` automation, DPAPI secrets, or V: writes
- No S3 key creation; Option B (Supabase S3 + rclone) remains a **fallback**
  only under the previously defined switch triggers (repeated unexplained
  live transport failure, scale, or fixture mismatch)
- Existing Production export artefacts untouched

## Later automation (not this gate)

`.bat` orchestration starts only after a future, separately authorized manual
Production snapshot that reaches:

`STORAGE_EXPORT_PASS` → `MANIFEST_PASS` → `AGE_ENCRYPT_PASS` →
`LOCAL_ENCRYPTED_COPY_PASS` → `UPLOAD_PASS`.

## Next live run

Requires a **new explicit user authorization** after this offline gate is green.
This commit does not authorize any live attempt.
