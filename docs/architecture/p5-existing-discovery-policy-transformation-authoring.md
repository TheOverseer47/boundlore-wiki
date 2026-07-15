# P5-E.9G.8E.2 - Existing Discovery Policy Transformation Authoring

**Date:** 2026-07-16

**Status:** `LOCAL_AUTHORING_PASS_NO_PRODUCTION_APPLY`

## 1. Scope

This gate authors the narrow transformation approved conditionally by
P5-E.9G.8E.1. It does not apply SQL, edit a Dashboard policy, upload an object,
toggle the release gate, push, or deploy.

The only production object a later authorized gate may change is the existing
policy:

`storage.objects.discovery_upload_authenticated`

## 2. Preserved invariants

| Field | Required value |
|---|---|
| Policy name | `discovery_upload_authenticated` |
| Table | `storage.objects` |
| Behavior | `PERMISSIVE` |
| Command | `INSERT` |
| Role | `authenticated` |
| `USING` | none |
| Bucket scope | `bucket_id = 'discovery-uploads'` |
| UID/path scope | `split_part(name, '/', 1) = auth.uid()::text` |
| New condition | `public.bl_can_create_user_content(auth.uid())` |

No policy, role, operation, bucket, UID/path rule, helper, function, owner,
grant, or storage object may be added or changed outside this list.

## 3. Exact before and after

### Before - production catalog export

```sql
(
  (bucket_id = 'discovery-uploads'::text)
  AND
  (split_part(name, '/'::text, 1) = (auth.uid())::text)
)
```

### After - required effective expression

```sql
(
  bucket_id = 'discovery-uploads'
  AND split_part(name, '/', 1) = auth.uid()::text
  AND public.bl_can_create_user_content(auth.uid())
)
```

Postgres or the Dashboard may normalize casts and parentheses. It must not
remove or change any predicate or replace an `AND` with `OR`.

## 4. Authored transformation

File:

`supabase/release_gate_existing_discovery_policy_transform.sql`

The artifact uses one `ALTER POLICY` statement inside one transaction. This is
deliberate:

- it targets the existing policy rather than adding a parallel permissive
  policy;
- it does not delete and recreate the policy;
- policy behavior and command remain unchanged because `ALTER POLICY` changes
  only role/expressions;
- the role is restated as `authenticated`;
- the complete bucket and UID/path expression is restated before adding the
  release helper.

The hosted SQL Editor is not an approved apply path because
`storage.objects` is owned by `supabase_storage_admin`. The file is the exact
review comparator and source artifact for a later Dashboard edit, not
authorization to bypass managed ownership.

## 5. Source-of-truth regression protection

`supabase/discovery_storage.sql` previously recreated the policy without the
release helper. It is updated locally so future provisioning or reapplication
does not silently remove the lock condition.

This source update adds only:

```sql
and public.bl_can_create_user_content(auth.uid())
```

to the existing policy and documents the helper precondition. Bucket metadata,
public-read policy, update policy, delete policy, MIME types, and limits remain
unchanged.

## 6. Rollback basis

Rollback is not authorized by this gate. If a later apply produces an
unexpected result, the project stop rule is to collect read-only evidence and
not automatically roll back.

The exact catalog-exported rollback expression retained for a separately
authorized recovery gate is:

```sql
alter policy "discovery_upload_authenticated"
on storage.objects
to authenticated
with check (
  bucket_id = 'discovery-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);
```

This block is documentation only and is intentionally absent from the
executable transformation artifact.

## 7. Static QA

File:

`qa/p5-existing-discovery-policy-transform-check.py`

The check requires:

- exactly one `ALTER POLICY`;
- exact policy name and table;
- role `authenticated`;
- bucket, UID/path, and release-helper predicates;
- conjunction-only semantics;
- a single transaction;
- the same three conditions in the provisioning source.

It rejects:

- policy create/drop;
- owner, table, role-escalation, grant, or revoke operations;
- Storage object writes;
- release unlock literals;
- broadening through `OR`.

Run locally:

```text
python qa/p5-existing-discovery-policy-transform-check.py
```

## 8. Dashboard worksheet - no save in E.2

Target project must visibly be:

`ohkoojpzmptdfyowdgog` - `TheOverseer47's Project`

Open the existing policy under:

Storage -> Policies -> `storage.objects` ->
`discovery_upload_authenticated`

Required visible values before editing:

| Field | Required value |
|---|---|
| Existing policy selected | `discovery_upload_authenticated` |
| Behavior | `PERMISSIVE` |
| Operation | `INSERT` |
| Role | `authenticated` |
| Existing bucket condition | complete and unchanged |
| Existing UID/path condition | complete and unchanged |

Required final `WITH CHECK` input:

```sql
bucket_id = 'discovery-uploads'
and split_part(name, '/', 1) = auth.uid()::text
and public.bl_can_create_user_content(auth.uid())
```

Before any later Save, the complete generated review must be captured. It must
show only the existing policy transformation and must preserve every invariant
in section 2.

Hard stop before Save if:

- the project ref is not exact;
- the existing expression is truncated or hidden;
- the editor creates a second policy;
- behavior, role, operation, bucket, or UID/path scope changes;
- grouping is ambiguous;
- SQL review is incomplete;
- any other object is included.

## 9. Post-edit verification contract for E.3/E.4

A separately authorized later gate must verify immediately after exactly one
Save:

1. policy exists exactly once;
2. name, behavior, command, role, bucket, and UID scope are unchanged;
3. release helper is present exactly once;
4. no other policy changed;
5. release gate remains locked;
6. bucket metadata and aggregate object counts remain unchanged.

No runtime upload test and no production unlock belong to the edit gate.

## 10. Attestation

| Action | Status |
|---|---|
| Production SQL apply | NOT PERFORMED |
| Dashboard edit/save | NOT PERFORMED |
| Storage object operation | NOT PERFORMED |
| Release-gate toggle | NOT PERFORMED |
| Owner/grant/role change | NOT PERFORMED |
| Push/deploy/launch | NOT PERFORMED |
