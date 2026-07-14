# P5-E.9E.5I — Legacy Runtime Config Cutover Dry Run Report

**Gate:** P5-E.9E.5I — Legacy Runtime Config Cutover Dry Run. **PASS**.

**HEAD vor Gate:** `bea85f3` — Verify legacy RPC search

**Arbeitsmodus:** Lokaler temporärer Runtime-Dry-Run auf `ohkoojpzmptdfyowdgog`. Read-only Verification. Kein produktiver Switch. Kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5I** | **PASS** |
| **Legacy Runtime Cutover Dry Run** | **DRY_RUN_PASS** |
| **Legacy Local Runtime Search** | **PASS** (32/32 fixture + wiki/search smoke) |
| **Legacy Runtime Safety** | **PASS** |
| **Legacy Runtime Output Contract** | **PASS** |
| **Final Runtime Config Status** | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| **Legacy RPC-first Search Verification (5H)** | **INTACT** |
| **Legacy Search Index State** | **POPULATED** (6) |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Temporärer lokaler Legacy-Runtime-Dry-Run (uncommitted, revertiert) beweist: Config-Umschaltung technisch möglich, RPC-first Client funktioniert gegen Legacy, Core/Safety-Matrix PASS, keine Leaks. Final committed Runtime bleibt Staging.

---

## HEAD / Working Tree

| Prüfung | Ergebnis |
|---------|----------|
| HEAD vor Gate | `bea85f3` |
| Temporäre Patches | **Revertiert** — `js/supabase-config.js`, `js/search.js` |
| Final Runtime Config | **Staging** — kein Diff |
| `.env` geändert | **Nein** |
| `.env.legacy` geöffnet | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5I frei — Legacy Runtime Config Cutover Dry Run auf `ohkoojpzmptdfyowdgog`, read-only/plan-only Verification, kein produktiver Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Dry-Run Target Ref** | `ohkoojpzmptdfyowdgog` — **verifiziert** |
| **Staging Ref** | **Nicht aktiv nach Revert** |
| **boundlore.com** | **Nicht verwendet** |
| **Publishable Key** | Via Supabase MCP `get_publishable_keys` — **nicht in Docs/Repo** |

---

## Baseline Evidence

| Gate | Status |
|------|--------|
| 5D Backup | Dokumentiert, gitignored |
| 5F Backup | Dokumentiert, gitignored |
| 5G Backup | Dokumentiert, gitignored |
| 5E Security | **INTACT** |
| 5F Search DB/FTS | **INTACT** |
| 5G Rebuild | **PASS** (6 docs) |
| 5H RPC Verification | **PASS** |

---

## Temporary Runtime Config Method

| Schritt | Methode |
|---------|---------|
| 1 | Working-Tree-Patch `js/supabase-config.js` → Legacy URL/Ref, `LEGACY_DRY_RUN_VERIFIED`, `legacy_dry_run_verification` |
| 2 | Publishable Key via MCP (kein `.env.legacy`) |
| 3 | Temporäre Erweiterung `isRpcAvailable()` in `js/search.js` für Dry-Run-Status (**revertiert**) |
| 4 | Lokaler Server `http://127.0.0.1:8099` |
| 5 | Fixture + `/wiki/search/` Verification |
| 6 | **Git checkout revert** beider JS-Dateien |

**Wichtig:** Cutover-Delta dokumentiert — produktiver Legacy-Switch erfordert koordinierte Config- **und** Client-Guard-Anpassung (derzeit staging-only by design in P5-E.9E.4B).

---

## Local Dry-Run Environment

| Item | Wert |
|------|------|
| Server | Python `ThreadingHTTPServer` auf `127.0.0.1:8099` |
| Host | localhost only |
| Fixture | `qa/p5-legacy-runtime-cutover-dry-run-fixtures.html` |
| Wiki Search Smoke | `/wiki/search/?q=ogre` |

---

## Runtime Config Verification

| Check | Dry-Run | Nach Revert |
|-------|---------|-------------|
| Project Ref | `ohkoojpzmptdfyowdgog` | `jzzgoiwfbuwiiyvwgwri` |
| Config Status | `LEGACY_DRY_RUN_VERIFIED` | `STAGING_REF_VERIFIED` |
| Runtime Mode | `legacy_dry_run_verification` | `staging_verification` |
| Supabase Client | Initialisiert | Initialisiert (Staging) |
| Production/Launch Marker | **Nein** | **Nein** |

---

## Client RPC-first Verification

| Check | Ergebnis |
|-------|----------|
| `BoundLoreSearch.callSearchRpc` | **Ja** — via Fixture |
| `SEARCH_RPC_NAME` | `bl_search_public_content` |
| `.from('posts')` Primärpfad | **Nein** |
| Direkter SELECT `search_documents` | **Nein** |
| Wiki Search UI `/wiki/search/?q=ogre` | **Ogre Mage** Treffer |

---

## Query Matrix Results

**Fixture:** **32/32 PASS** (10 config + 12 core + 10 safety)

### Core (12/12)

| Query | Hits | Top Slug | Expected OK |
|-------|------|----------|-------------|
| ogre / mage | 1 | `ogre-mage-9651e6` | Ja |
| campfire / near campfire | 2 | `near-a-campfire-787bbd19` | Ja |
| swamp / swamplands | 2–3 | `swamplands-94dadc07` | Ja |
| boundlore / best wiki | 1 | `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Ja |
| staff / fire / staff fire | 2–3 | `staff-of-fire-2f316b0d` | Ja |
| smought | 1 | `smought-835df97a` | Ja |

### Safety (10/10) — alle 0 Treffer, RPC used, no leak

`zzzxxy-no-hit`, unsafe HTML, 160+ chars, `Contribution`, `qa-test`, `fixture`, `seed`, `P5E9E4I`, `deleted`, `pending`

---

## Safety / Exclusion Results

| Check | Ergebnis |
|-------|----------|
| No-hit / unsafe / long | 0 Treffer, fail-closed |
| Contribution/QA/fixture/seed | 0 Treffer |
| Unsafe HTML ausgeführt | **Nein** |
| UI Crash | **Nein** |
| Console Error (RPC) | **Nein** |

---

## Output Contract Results

| Check | Ergebnis |
|-------|----------|
| `search_text` sichtbar | **Nein** |
| `search_vector` Wert sichtbar | **Nein** |
| BLMETA | **Nein** |
| Profile-PII / E-Mail | **Nein** |
| Wiki Search Snippet | Public-safe („Ogre Mage in Swamplands near a Campfire“) |

---

## Fail-Closed / Error Handling

| Check | Ergebnis |
|-------|----------|
| Unsafe Query normalisiert zu leer | **Ja** |
| Long Query capped | **Ja** (120 chars client-side) |
| RPC fail-closed bei Fehler | **Ja** |
| Kein posts-Fallback | **Ja** |

---

## No-Regression Checks

| Check | Vor/Nach 5I |
|-------|-------------|
| `search_documents` rows | **6** |
| Published posts | **9** |
| Rebuild | **Nein** |
| Content/Policy Writes | **Nein** |
| `anon SELECT profiles/search_documents` | **false** |

---

## Revert Confirmation

| Check | Ergebnis |
|-------|----------|
| `git diff -- js/supabase-config.js` | **Kein Diff** |
| `git diff -- js/search.js` | **Kein Diff** |
| Aktive URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Legacy URL aktiv im Repo | **Nein** |

---

## No Productive Runtime Switch Confirmation

| Check | Ergebnis |
|-------|----------|
| Produktiver Switch | **Nein** |
| Legacy Config committed | **Nein** |
| Push / Deploy / Launch | **Nein** |

---

## Residual Risks

| Risiko | Status |
|--------|--------|
| `isRpcAvailable()` staging-only (P5-E.9E.4B) | **Cutover-Delta** — muss bei produktivem Switch gelöst werden |
| Dünne Content-Basis (6 Docs) | **Akzeptiert** |
| S-06 Final Closure | **Offen** — Gate 5J |

---

## Required Future Gates

| Gate | Scope |
|------|-------|
| **P5-E.9E.5J** | S-06 Final Closure Dossier |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5I | **PASS** |
| Legacy Runtime Cutover Dry Run | **DRY_RUN_PASS** |
| Legacy Local Runtime Search | **PASS** |
| Legacy Runtime Safety | **PASS** |
| Legacy Runtime Output Contract | **PASS** |
| Final Runtime Config Status | **STAGING** |
| Legacy Search Index State | **POPULATED** (6) |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| S-06 Search Recall | **CLOSED** |
| Legacy Search Runtime Readiness | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** P5-E.9F.1 — S-05 SEO/CSR Entity Pages Closure Plan

---

## P5-E.9E.5J Follow-up (PASS — S-06 Final Search Closure Dossier)

**Gate:** P5-E.9E.5J. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `68c92b1` |
| Arbeitsmodus | Nur lokales Repo. Dossier/Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write |
| Staging Evidence (4M) | **STAGING_CLOSED** |
| Legacy Evidence (5D–5I) | **COMPLETE** — widerspruchsfrei |
| S-06 Search Recall | **CLOSED** |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| Legacy Search Runtime Readiness | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| Final Runtime Config | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| Produktiver Runtime-Switch / Push / Deploy / Launch | **Nein** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Empfohlener nächster Gate | **P5-E.9F.1** |

**Report:** `docs/architecture/p5-s06-final-search-closure-dossier.md`

---

*Dokumentversion: P5-E.9E.5I + 5J PASS. Temporäre Patches revertiert. Keine Secrets. Final Runtime Staging. S-06 CLOSED_SEARCH_EVIDENCE.*
