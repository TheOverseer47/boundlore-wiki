# P5-E.9G.8E.3/E.4 - Existing Discovery Policy Edit and Verification

**Date:** 2026-07-16

**Production target:** `ohkoojpzmptdfyowdgog` (`TheOverseer47's Project`)

**Final decision:** `PASS_EXISTING_DISCOVERY_POLICY_RELEASE_LOCK_APPLIED`

## 1. Executive result

After exact user authorization, the existing Production Storage policy
`discovery_upload_authenticated` was updated through one Supabase Dashboard
`Save policy` action using the previously reviewed `ALTER POLICY` statement.

The user reported the Dashboard notification `successfully saved policy` and
provided a post-save policy-overview screenshot. Immediate read-only catalog
verification proves that the intended release-gate condition is present and
all required invariants are preserved.

The last known server-side Storage bypass for the central contribution lock is
now structurally closed. Runtime denial evidence and the complete S+-01/S-10
re-audit remain separate later gates.

## 2. Authorization

The user explicitly authorized:

- Production project `ohkoojpzmptdfyowdgog` only;
- existing policy `discovery_upload_authenticated` only;
- exactly one Dashboard `Save policy` action;
- exactly the reviewed SQL transformation;
- no other policy, SQL, Storage, lock, Git, deploy, or launch action.

No broader authorization was inferred.

## 3. Pre-save identity and review evidence

### 3.1 Project identity

User-confirmed Dashboard URL:

```text
https://supabase.com/dashboard/project/ohkoojpzmptdfyowdgog/storage/files/policies
```

This exactly matches the intended Production project. Staging
`jzzgoiwfbuwiiyvwgwri` was not used.

### 3.2 Existing-policy editor

The no-save editor screenshot proved:

- existing policy name `discovery_upload_authenticated`;
- target role `authenticated`;
- full catalog-normalized current `WITH CHECK` expression;
- separate `Review` action.

### 3.3 Generated SQL review

The no-save review screenshot proved one transaction containing one statement:

```sql
ALTER POLICY "discovery_upload_authenticated"
ON "storage"."objects"
WITH CHECK (
  (
    (bucket_id = 'discovery-uploads'::text)
    AND
    (split_part(name, '/'::text, 1) = (auth.uid())::text)
  )
  AND
  public.bl_can_create_user_content(auth.uid())
);
```

The Dashboard wrapped the statement in `BEGIN` and `COMMIT`. It contained no
second policy, policy drop/create, bucket change, owner change, grant, function
change, release unlock, or Storage object operation.

## 4. Save action

| Item | Result |
|---|---|
| Save authorization | exact and explicit |
| Save actions | 1, user-attested |
| Dashboard result | `successfully saved policy` |
| Retry | none |
| Other Dashboard mutation | none reported or observed |

The post-save overview continued to show exactly one
`discovery_upload_authenticated` policy under `DISCOVERY-UPLOADS`, with command
`INSERT` and role `authenticated`.

## 5. Immediate read-only E.4 verification

All queries in this section were `SELECT`-only and targeted exclusively
`ohkoojpzmptdfyowdgog`.

### 5.1 Target policy identity

| Field | Verified value | Result |
|---|---|---|
| Matching policy count | 1 | PASS |
| Name | `discovery_upload_authenticated` | PASS |
| Table | `storage.objects` | PASS |
| Behavior | `PERMISSIVE` | PASS |
| Command | `INSERT` | PASS |
| Roles | `{authenticated}` | PASS |
| `USING` | null | PASS |
| Release helper occurrences | 1 | PASS |

### 5.2 Exact effective `WITH CHECK`

Catalog result:

```sql
(
  (bucket_id = 'discovery-uploads'::text)
  AND
  (split_part(name, '/'::text, 1) = (auth.uid())::text)
  AND
  bl_can_create_user_content(auth.uid())
)
```

Verified semantics:

- exact discovery bucket restriction retained;
- exact first-segment UID ownership restriction retained;
- release helper added once with `AND`;
- no `OR` broadening;
- no other bucket newly admitted.

PostgreSQL deparsed the stored helper without a schema qualifier. A separate
`pg_depend` query proves that the policy is OID-bound to:

| Referenced schema | Function | Arguments |
|---|---|---|
| `auth` | `uid` | none |
| `public` | `bl_can_create_user_content` | `p_actor_id uuid` |

The effective helper is therefore exactly the intended
`public.bl_can_create_user_content(auth.uid())`.

### 5.3 Parallel policy inventory

All three Storage INSERT policies remain present with their original names,
roles, commands, and bucket scopes:

| Policy | Bucket scope | Role | Result |
|---|---|---|---|
| `discovery_upload_authenticated` | `discovery-uploads` | authenticated | intended helper added |
| `avatars_upload_own` | `avatars` | public + UID predicate | unchanged |
| `Authenticated users can upload report screenshots` | `report-screenshots` | public + authenticated-role predicate | unchanged |

No new broad INSERT policy or restrictive companion policy exists. Existing
discovery SELECT, UPDATE, and DELETE policies remain present with their prior
bucket/UID scopes.

### 5.4 Release-gate preservation

| Check | Result |
|---|---|
| Total `release_gate` rows | 1 |
| Canonical `id = 1` rows | 1 |
| `contribution_locked` | `true` |

No unlock or lock mutation occurred.

### 5.5 Storage table and RLS

| Check | Result |
|---|---|
| Owner | `supabase_storage_admin` |
| RLS enabled | `true` |
| FORCE RLS | `false` |

Ownership, grants, and managed-schema configuration were not changed.

### 5.6 Bucket metadata and aggregate counts

| Bucket | Public | Limit | MIME configuration | Object count | Result |
|---|---:|---:|---|---:|---|
| `avatars` | true | null | null | 0 | unchanged |
| `discovery-uploads` | true | 20,971,520 | JPEG, PNG, WebP, PDF, ZIP, plain text | 20 | unchanged |
| `report-screenshots` | true | null | null | 0 | unchanged |

No object path, owner UUID, object content, or personal data was queried.

## 6. Security result

For an ordinary authenticated non-admin actor, the effective policy now
requires all three conditions:

1. target bucket is `discovery-uploads`;
2. first path segment equals the actor's `auth.uid()`;
3. the central fail-closed helper permits user-content creation.

With `contribution_locked = true`, condition 3 is false for ordinary users.
Admin bypass behavior remains deliberate and does not override bucket or path
ownership.

The policy-level structural result is:

`DISCOVERY_UPLOAD_RELEASE_LOCK_STRUCTURALLY_CLOSED`

This is not yet runtime denial evidence and does not by itself close the full
S+-01/S-10 audit gates.

## 7. Remaining gates

### P5-E.9G.8E.5 - Runtime denial evidence

Requires separate explicit user authorization.

- Staging: locked denied, unlocked allowed, relocked denied, missing gate
  denied, foreign UID denied.
- Production: locked-denial test only, using a dedicated test user and harmless
  tiny file, followed by proof that no object was created.
- Production must never be unlocked for this test.

### P5-E.9G.8E.6 - S+-01/S-10 final re-audit

Full read-only review of release gate, posts, reactions, comments,
observations, RPCs, profiles, Storage policies, grants, SECURITY DEFINER
functions, and parallel-policy bypasses.

## 8. Final attestation

| Boundary | Status |
|---|---|
| Authorized existing-policy Save | PERFORMED ONCE |
| Additional policy/SQL mutation | NOT PERFORMED |
| Storage upload/update/delete | NOT PERFORMED |
| Runtime denial test | NOT PERFORMED |
| Release unlock/toggle | NOT PERFORMED |
| Staging mutation | NOT PERFORMED |
| Git push/merge | NOT PERFORMED |
| Deploy/domain/indexing/launch | NOT PERFORMED |
