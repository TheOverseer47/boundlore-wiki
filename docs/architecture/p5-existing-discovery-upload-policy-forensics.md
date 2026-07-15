# P5-E.9G.8E.1 - Existing Discovery Upload Policy Read-only Forensics

**Gate:** P5-E.9G.8E.1

**Date:** 2026-07-16

**Production target:** `ohkoojpzmptdfyowdgog` (`TheOverseer47's Project`)

**Decision:** `SAFE_TO_AUTHOR_EXISTING_POLICY_RELEASE_LOCK_TRANSFORMATION`

## 1. Executive result

The existing permissive INSERT policy `discovery_upload_authenticated` can be
safely extended in principle by preserving its complete current predicate and
adding the canonical fail-closed release-gate helper with `AND` semantics.

Read-only production catalog evidence proves:

- the canonical release gate exists exactly once and remains locked;
- the helper chain is fail-closed for null actors, missing gate state, null gate
  state, and helper errors;
- the admin bypass is based on the authenticated actor's persisted
  `profiles.role = 'admin'` state;
- exactly one permissive INSERT policy can admit rows into
  `discovery-uploads`;
- the existing policy preserves both exact bucket scope and first-folder UID
  ownership;
- the other INSERT policies are limited to `avatars` and
  `report-screenshots` and do not create a parallel discovery bypass;
- the frontend has one discovery-bucket upload implementation, and every path
  it creates begins with the current session user's UUID.

The database and application evidence supports authoring the exact
existing-policy transformation. Subsequent user-provided no-save Dashboard
evidence proved that the production project's existing-policy editor exposes
the complete current expression and generates a lossless `ALTER POLICY` review
before a separate Save action.

No SQL, policy, function, bucket, storage object, application file, remote Git
ref, deployment, runtime configuration, or release-gate state was changed in
this gate.

## 2. Authorization and boundaries

Authorized and performed:

- local Git and repository inspection;
- production project identity lookup;
- production `SELECT`-only catalog queries;
- exact function-definition export without executing the functions;
- policy, bucket, RLS, ownership, and aggregate-count inspection;
- static repository search and frontend flow analysis;
- this documentation-only local change.

Not authorized and not performed:

- policy create, replace, alter, drop, or save;
- SQL Editor DDL or MCP migration apply;
- helper/RPC invocation;
- storage upload, update, or delete;
- release-gate unlock or toggle;
- user creation or authenticated runtime test;
- owner, role, grant, or managed-schema changes;
- push, merge, deploy, custom-domain change, indexing, or launch.

The prohibited reset file `supabase/pre_release_test_data_reset.sql` was not
executed.

## 3. Git and bundle preflight

The source checkout was materialized from a user-created Git bundle containing
the complete history of the expected local review branch.

| Item | Evidence | Result |
|---|---|---|
| Source branch | `review/p5-e9g8d-r3-discovery-storage-policy-ui` | MATCH |
| Source HEAD | `92c032a8c4aae0eb3c422b11347f180c9b048a77` | MATCH |
| Source commit | `92c032a Verify discovery storage dashboard policy` | MATCH |
| Bundle ref | source branch -> `92c032a8c4aae0eb3c422b11347f180c9b048a77` | MATCH |
| Bundle history | complete | PASS |
| Bundle hash algorithm | SHA-1 | PASS |
| Bundle SHA-256 | `0e5a8a11602b62da694cfe37bc79cc8aa8a44624f35e6110ea8705f7efd3072c` | RECORDED |
| Tracked source tree | clean before E.1 branch creation | PASS |
| E.1 branch | `review/p5-e9g8e1-discovery-policy-forensics` | CREATED LOCALLY |

The user's source preflight reported only the known protected untracked local
artifacts. They are not present in the bundle and were not read, copied,
changed, staged, or committed.

## 4. Supabase project identity

The connected project list was read before any catalog query.

| Role | Name | Project ref | Status | Accessed for SQL |
|---|---|---|---|---|
| Production | `TheOverseer47's Project` | `ohkoojpzmptdfyowdgog` | `ACTIVE_HEALTHY` | YES, SELECT-only |
| Staging | `boundlore-staging` | `jzzgoiwfbuwiiyvwgwri` | `ACTIVE_HEALTHY` | NO |

All SQL evidence in this document came exclusively from
`ohkoojpzmptdfyowdgog`.

## 5. Canonical release-gate state

Read-only result:

| Check | Result |
|---|---|
| Total `public.release_gate` rows | 1 |
| Canonical rows with `id = 1` | 1 |
| `contribution_locked` | `true` |
| All observed gate rows locked | `true` |

No unlock was performed. No release-gate function was invoked.

## 6. Helper-definition forensics

All definitions below were exported through `pg_get_functiondef`; none was
executed.

### 6.1 `bl_is_release_unlocked()`

Properties:

- `STABLE SECURITY DEFINER`
- `search_path = public, pg_temp`
- reads only canonical row `release_gate.id = 1`
- missing row returns `false`
- null `contribution_locked` is treated as locked by
  `coalesce(v_locked, true)`
- every caught error returns `false`

Relevant body:

```sql
begin
  begin
    select rg.contribution_locked
    into v_locked
    from public.release_gate rg
    where rg.id = 1;
    if not found then
      return false;
    end if;
    return not coalesce(v_locked, true);
  exception
    when others then
      return false;
  end;
end;
```

### 6.2 `bl_can_create_user_content(uuid)`

Properties:

- `STABLE SECURITY DEFINER`
- `search_path = public, pg_temp`
- null actor returns `false`
- admin actor returns `true`
- non-admin actor returns `true` only when the canonical gate helper reports
  unlocked
- otherwise returns `false`

Relevant body:

```sql
select case
  when p_actor_id is null then false
  when public.bl_can_bypass_release_gate(p_actor_id) then true
  when public.bl_is_release_unlocked() then true
  else false
end;
```

The proposed policy passes `auth.uid()` directly. No row value, request body,
file name, client query parameter, or client-selected actor ID controls this
argument.

### 6.3 `bl_assert_can_create_user_content(text)`

Properties:

- `SECURITY DEFINER`
- `search_path = public, pg_temp`
- calls `bl_can_create_user_content(auth.uid())`
- raises SQLSTATE `42501` when access is denied

Relevant body:

```sql
begin
  if not public.bl_can_create_user_content(auth.uid()) then
    raise exception 'User content submissions are locked before release'
      using errcode = '42501';
  end if;
end;
```

### 6.4 Admin-bypass chain

`bl_can_bypass_release_gate(p_actor_id)` delegates to
`bl_is_admin_actor(p_actor_id)`. The latter returns `false` for a null actor and
otherwise requires an existing `public.profiles` row whose primary actor ID
equals `p_actor_id` and whose persisted role is exactly `admin`:

```sql
select case
  when p_actor_id is null then false
  else exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.role = 'admin'
  )
end;
```

The transformation therefore retains the deliberate admin bypass while
denying locked uploads for ordinary authenticated users.

## 7. Existing discovery INSERT policy - exact catalog state

| Field | Exact production value |
|---|---|
| Schema/table | `storage.objects` |
| Policy name | `discovery_upload_authenticated` |
| Behavior | `PERMISSIVE` |
| Command | `INSERT` |
| Roles | `{authenticated}` |
| `USING` | null / not applicable to INSERT |
| `WITH CHECK` | `((bucket_id = 'discovery-uploads'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))` |

Semantic decomposition:

1. `bucket_id = 'discovery-uploads'` prevents this policy from admitting rows
   into any other bucket.
2. `split_part(name, '/', 1) = auth.uid()::text` requires the first object-path
   segment to equal the authenticated actor's UUID.
3. The policy targets only the `authenticated` Postgres role.
4. An unauthenticated request has no applicable policy role; additionally,
   `auth.uid()` would be null and the equality would not evaluate to true.
5. Empty, foreign, malformed, or null first path segments do not satisfy the
   UID equality.

The repository definition in `supabase/discovery_storage.sql` matches the
production bucket and UID semantics. Its blob hash at the inspected HEAD is
`8cf8e9a23409052f192b535e37f51dc4f51e9c9b`.

## 8. Complete `storage.objects` INSERT-policy inventory

Production has exactly three INSERT policies and no `ALL` policy that adds an
INSERT path:

| Policy | Behavior | Roles | Exact/bounded reach | Discovery reachable? |
|---|---|---|---|---|
| `Authenticated users can upload report screenshots` | PERMISSIVE | `{public}` | `bucket_id = 'report-screenshots'` and legacy authenticated-role check | NO |
| `avatars_upload_own` | PERMISSIVE | `{public}` | `bucket_id = 'avatars'` and first folder equals `auth.uid()` | NO |
| `discovery_upload_authenticated` | PERMISSIVE | `{authenticated}` | `bucket_id = 'discovery-uploads'` and first path segment equals `auth.uid()` | YES |

There is no broad `true` INSERT policy, no multi-bucket INSERT policy, and no
second permissive policy whose expression can admit a `discovery-uploads` row.

Postgres combines applicable permissive policies with `OR`. Because exactly
one applicable policy can admit the discovery bucket, placing the release-gate
condition inside this policy provides the required conjunction without relying
on an owner-only `AS RESTRICTIVE` companion policy.

## 9. Storage ownership, RLS, buckets, and aggregate integrity

### 9.1 Table

| Check | Result |
|---|---|
| Table | `storage.objects` |
| Owner | `supabase_storage_admin` |
| RLS enabled | `true` |
| FORCE RLS | `false` |

The managed owner state confirms why the earlier MCP and SQL Editor DDL paths
could not add the restrictive policy. No owner or grant change is proposed.

### 9.2 Bucket metadata

| Bucket | Public | File-size limit | MIME allowlist |
|---|---:|---:|---|
| `avatars` | true | null | null |
| `discovery-uploads` | true | 20,971,520 bytes | JPEG, PNG, WebP, PDF, ZIP, plain text |
| `report-screenshots` | true | null | null |

### 9.3 Aggregate object counts

| Bucket | Count |
|---|---:|
| `avatars` | 0 |
| `discovery-uploads` | 20 |
| `report-screenshots` | 0 |

No object names, paths, owners, user UUIDs, or content were queried or exposed.

## 10. Frontend upload-path inventory

Repository-wide searches covered:

- `discovery-uploads`
- `supabase.storage`
- `storage.from(`
- `.upload(`
- `DISCOVERY_STORAGE_BUCKET`
- file inputs and `postMedia`
- `release_gate`, `contribution_locked`, and
  `bl_can_create_user_content`

### 10.1 Discovery-bucket implementation

There is exactly one implementation:

| Item | Evidence |
|---|---|
| Module | `js/create-post.js` |
| Function | `uploadDiscoveryFiles(userId, files)` |
| Bucket constant | `DISCOVERY_STORAGE_BUCKET = "discovery-uploads"` |
| Upload mode | `.upload(path, file, { upsert: false })` |
| Path construction | `userId + "/" + timestamp + "-" + random + "-" + cleanedName` |
| Public URL | same bucket and same generated path |
| Caller | `handleSubmit()` |
| Actor source | authenticated Supabase session user ID |

`handleSubmit()` obtains a current Supabase session, rejects missing sessions,
refreshes the session for the tutorial check, and supplies
`sessionData.session.user.id` as the upload path prefix. The path therefore
matches the production policy's first-segment UID model.

### 10.2 Functional scope

The shared file block runs after post-type payload construction. Consequently,
the same `discovery-uploads` path is used for optional attachments to:

- normal guide submissions;
- discovery submissions;
- admin-created wiki submissions.

This broader frontend use does not weaken the proposed transformation. The
central release lock is intended to block ordinary user-content creation across
all contribution types. Admin uploads retain the deliberate helper bypass.

### 10.3 Alternative upload paths

The only other `.upload()` call in the repository is in `js/support.js` and is
hard-coded to `report-screenshots`. It is an intentionally separate moderation
and support path and is outside this discovery-lock transformation.

No anonymous discovery upload path, alternative discovery bucket name,
computed bucket selector, service-role upload, Edge Function upload, or direct
Storage REST upload was found.

### 10.4 Current UI lock state

`wiki/create-post/index.html` exposes the optional `postMedia` file input and
loads `js/create-post.js`. It does not load a patch-mode or release-gate client
guard, and `js/create-post.js` contains no `release_gate`,
`contribution_locked`, or `bl_can_create_user_content` check.

Therefore:

- the upload UI is not currently disabled by the release state;
- a locked post INSERT can occur only after the attachment upload attempt;
- without the Storage policy transformation, a successful upload could remain
  even when the later post INSERT is denied;
- frontend hiding alone cannot close the bypass.

The server-side existing-policy transformation is mandatory. Client UX can be
addressed later under S-09, but it is not a substitute for Storage RLS.

## 11. Exact theoretical transformation

### 11.1 Before - exact current `WITH CHECK`

```sql
(
  (bucket_id = 'discovery-uploads'::text)
  AND
  (split_part(name, '/'::text, 1) = (auth.uid())::text)
)
```

### 11.2 After - design only, not authored or applied in E.1

```sql
(
  (
    (bucket_id = 'discovery-uploads'::text)
    AND
    (split_part(name, '/'::text, 1) = (auth.uid())::text)
  )
  AND
  public.bl_can_create_user_content(auth.uid())
)
```

Required invariants:

- policy name remains `discovery_upload_authenticated`;
- behavior remains `PERMISSIVE`;
- command remains `INSERT`;
- role remains `authenticated`;
- `USING` remains absent;
- exact bucket predicate remains unchanged;
- exact UID/path predicate remains unchanged;
- only the release-gate helper conjunction is added;
- no other policy, bucket, object, owner, grant, or function changes.

The catalog may normalize casts or parentheses. Any UI preview must still be
structurally equivalent to the expression above. A missing predicate, changed
boolean operator, broadened role, or broadened bucket is a hard stop.

## 12. Boolean safety matrix

Unless noted, "actor" means an ordinary authenticated non-admin user.

| Case | Existing bucket/path predicate | Gate helper | Result |
|---|---:|---:|---|
| Own path + locked | true | false | DENY |
| Own path + unlocked | true | true | ALLOW |
| Foreign path + unlocked | false | true | DENY |
| Foreign path + locked | false | false | DENY |
| Missing canonical gate row | path-dependent | false | DENY |
| Null gate state | path-dependent | false | DENY |
| Helper error | path-dependent | false | DENY |
| Anonymous | policy role not applicable; UID null | false | DENY |
| Other bucket | false | any | NOT NEWLY ALLOWED |
| Admin + own path + locked | true | true by deliberate admin bypass | ALLOW |
| Admin + foreign path + locked | false | true | DENY |

The release helper cannot override bucket or path ownership because it is
combined with the complete existing predicate using `AND`.

## 13. Dashboard existing-policy edit assessment

### Proven from R3

- the Dashboard exposes Storage policies under `storage.objects`;
- the custom-policy flow shows policy name, command, roles, expression, and a
  generated SQL review;
- the new-policy flow generated `AS PERMISSIVE`, which correctly blocked the
  earlier restrictive-policy approach;
- zero save actions occurred and production remained unchanged.

### Proven by no-save existing-policy review

User-provided Dashboard evidence and URL confirmation proved:

- project URL targets exactly `ohkoojpzmptdfyowdgog`;
- `discovery_upload_authenticated` is directly editable;
- the editor displays the full catalog-normalized current `WITH CHECK`;
- target role remains `authenticated`;
- the helper conjunction is accepted without losing bucket/UID grouping;
- `Review` is separate from `Save policy`;
- generated SQL contains exactly one `ALTER POLICY` on
  `storage.objects.discovery_upload_authenticated`;
- generated SQL retains the complete original bucket/UID predicate and adds
  exactly `public.bl_can_create_user_content(auth.uid())` with `AND`;
- generated SQL is enclosed by `BEGIN` and `COMMIT`;
- no second policy, role change, owner change, grant, function change, bucket
  change, or object operation is present.

No Save action occurred while collecting this evidence.

## 14. Repository regression consideration for E.2

`supabase/discovery_storage.sql` currently recreates
`discovery_upload_authenticated` with the pre-lock expression. Reapplying that
file after a Dashboard transformation could remove the release-gate condition.

E.2 must therefore explicitly design a tracked source-of-truth update or a
guarded transformation artifact that prevents future policy regression. This
observation does not authorize editing `discovery_storage.sql` in E.1 and does
not broaden the one-policy production apply scope.

## 15. Decision

### `SAFE_TO_AUTHOR_EXISTING_POLICY_RELEASE_LOCK_TRANSFORMATION`

Database semantics, current production catalog state, helper fail-closed
behavior, parallel-policy inventory, bucket isolation, and all frontend upload
paths support the transformation.

The hosted Supabase Dashboard existing-policy editor and its complete lossless
review are proven. Authoring is safe and has been completed locally. This PASS
does not authorize a Production Save, runtime upload test, policy
delete/recreate, or release unlock.

## 16. Next gate boundary

The no-save Dashboard preflight succeeded. P5-E.9G.8E.2 local transformation
authoring may prepare:

- exact before/after policy text;
- one-policy transformation SQL or exact Dashboard worksheet;
- static QA for name, behavior, role, operation, bucket, UID path, and helper;
- rollback basis using the exact catalog-exported current expression;
- source-of-truth regression protection.

E.2 must not apply SQL or save a Dashboard policy. Any later production edit
requires a new explicit user authorization.

## 17. Final attestation

| Boundary | Status |
|---|---|
| Production SQL mutation | NOT PERFORMED |
| Policy save/create/drop/edit | NOT PERFORMED |
| Helper/RPC invocation | NOT PERFORMED |
| Storage object operation | NOT PERFORMED |
| Release unlock/toggle | NOT PERFORMED |
| Staging access | NOT PERFORMED |
| Git push/merge | NOT PERFORMED |
| Deploy/domain/indexing/launch | NOT PERFORMED |
| Local tracked change | this document only |
