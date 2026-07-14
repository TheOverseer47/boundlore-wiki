# P5-E.9E.4M — S-06 Staging Search Evidence Closure Dossier

**Gate:** P5-E.9E.4M — S-06 Staging Search Evidence Closure Dossier. **PASS** (Dokumentation only).

**HEAD vor Gate:** `536a45f` — Deindex staging seed marker

**Arbeitsmodus:** Nur lokales Repo. Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write/Supabase/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4M** | **PASS** (Dossier) |
| **S-06 Staging Evidence** | **STAGING_CLOSED** |
| **S-06 Final Status** | **OPEN_BLOCKING** (Production-Pfad) |
| **Search DB/FTS Runtime Evidence** | **STAGING_PASS** |
| **MARKER_SEARCHABLE_RISK** | **CLOSED_STAGING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Die Search-Evidence-Kette auf Staging `jzzgoiwfbuwiiyvwgwri` ist vollständig dokumentiert und **STAGING_CLOSED**. RPC-first Client, Postgres FTS, persistenter 12-Canonical-Corpus, Query-Matrix, Safety/No-Leak und Marker-Deindex sind auf Staging verifiziert. **S-06 Final Closure** bleibt **OPEN_BLOCKING**, weil Production Content Migration, Production Search Evidence und Launch-Kriterien (S-05) fehlen.

---

## HEAD / Working Tree / No-Write-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `536a45f` |
| SQL ausgeführt / SQL Apply | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Supabase-Verbindung | **Nein** |
| Inserts / Updates / Deletes / Rebuild | **Nein** |
| Staging/Production Write | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |

---

## Evidence Timeline

| Phase | Gate | Ergebnis | Quelle |
|-------|------|----------|--------|
| Local recall baseline | **P5-E.9E.1** | Local Search Recall Fixture **PASS** | `p5-search-recall-plan.md`, QA fixtures |
| Client hardening | **P5-E.9E.2** | Client Search Recall **Hardened** (92/92) | `p5-search-recall-plan.md` |
| DB strategy | **P5-E.9E.3** | Search DB Strategy **DOCUMENTED** | `p5-search-db-strategy.md` |
| SQL draft | **P5-E.9E.3A** | SQL Draft **created** | `p5-search-sql-draft.md` |
| Static SQL review | **P5-E.9E.3B** | Static Review **PASS** (Fixes #2–#5) | `p5-search-sql-static-review.md` |
| Staging verification (Erstlauf) | **P5-E.9E.4** | **BLOCKED** | `p5-staging-search-verification-report.md` |
| Runtime config | **P5-E.9E.4B** | Staging Runtime Config **PASS** (21/21) | `p5-staging-runtime-config-report.md` |
| Re-run query matrix | **P5-E.9E.4 Re-run** | **PASS**; `42501` profiles/posts blocker | `p5-staging-search-verification-report.md` |
| Read path fix draft | **P5-E.9E.4C** | Read Path Fix Draft **PASS** | `p5-staging-search-read-path-fix-draft.md` |
| Posts RLS fix | **P5-E.9E.4D** | Posts RLS Dependency Fix **PASS**; `42501` behoben | `p5-posts-rls-policy-dependency-fix-report.md` |
| Controlled corpus | **P5-E.9E.4E** | Corpus Populate + Cleanup **PASS** | `p5-staging-search-corpus-populate-report.md` |
| Search DB/FTS apply | **P5-E.9E.4A** | Search DB/FTS **APPLIED_STAGING_PASS** | `p5-search-db-fts-staging-apply-report.md` |
| Client RPC integration | **P5-E.9E.4F** | RPC Client **INTEGRATED** (48/48) | `p5-search-client-rpc-integration-report.md` |
| RPC corpus verification | **P5-E.9E.4G** | RPC Corpus **VERIFIED_CLEANED** | `p5-staging-rpc-corpus-verification-report.md` |
| Migration plan | **P5-E.9E.4H** | Content Migration Plan **PASS** | `p5-search-production-content-migration-plan.md` |
| Persistent corpus seed | **P5-E.9E.4I** | **12 Canonicals PERSISTENT** | `p5-staging-persistent-canonical-corpus-seed-report.md` |
| Persistent re-run | **P5-E.9E.4J** | Query Matrix **27/27 PASS** | `p5-persistent-staging-search-rerun-report.md` |
| Marker mitigation plan | **P5-E.9E.4K** | Mitigation Plan **PASS** | `p5-marker-searchability-mitigation-plan.md` |
| Marker deindex fix | **P5-E.9E.4L** | Marker **CLOSED_STAGING** | `p5-staging-marker-deindex-fix-report.md` |
| **S-06 staging dossier** | **P5-E.9E.4M** | **STAGING_CLOSED** | Dieses Dokument |

---

## Closed Staging Findings

| Finding | Status | Evidence |
|---------|--------|----------|
| Runtime zeigt Staging `jzzgoiwfbuwiiyvwgwri` | **CLOSED** | `js/supabase-config.js`, 4B Fixtures 21/21 |
| Legacy `ohkoojpzmptdfyowdgog` nicht aktiv | **CLOSED** | Config guard, Staging verification |
| `posts` Read-Path ohne `42501` | **CLOSED** | P5-E.9E.4D RLS fix |
| Kein `profiles` anon/public SELECT | **CLOSED** | 4A/4D reports, ACL checks |
| `search_documents` existiert mit RLS | **CLOSED** | P5-E.9E.4A apply |
| Kein anon SELECT auf `search_documents` | **CLOSED** | 4A hardened RPC-only path |
| RPC-first Client aktiv | **CLOSED** | `js/search.js`, 4F/4J |
| Kein `.from('posts')` Runtime-Primärpfad | **CLOSED** | 4F fixtures, static review |
| 12 persistente Canonicals | **CLOSED** | P5-E.9E.4I |
| `bl_rebuild_search_documents()` → 12 Docs | **CLOSED** | 4I, 4L rebuild |
| Core Query-Matrix PASS | **CLOSED** | 4J (27/27), 4L (24 core) |
| unsafe/no-hit/long fail-closed | **CLOSED** | 4J, 4L safety queries |
| Kein BLMETA/search_text/search_vector/PII in UI | **CLOSED** | 4J, 4L safety |
| Marker-Vollstring nicht suchbar | **CLOSED** | 4L: `P5E9E4I_STAGING_PERSISTENT_CANONICAL` → 0 |
| MARKER_SEARCHABLE_RISK | **CLOSED_STAGING** | 4L deindex |

**Hinweis:** Query `P5E9E4I` (Kurzform) matcht Slug-Suffix `-p5e9e4i` — **Slug-Artefakt**, kein Marker-Leak. Production-Slugs ohne Gate-Suffix.

---

## Remaining Production Findings

| Finding | Status | Blocker für |
|---------|--------|-------------|
| Production Content Migration nicht durchgeführt | **OPEN** | S-06 Final |
| Kein Production Backup/Apply/Verification | **OPEN** | S-06 Final |
| Kein Production Search DB/FTS Evidence | **OPEN** | S-06 Final |
| Kein Production RPC-first Runtime Evidence | **OPEN** | S-06 Final |
| Kein Production S-06 Closure Gate | **OPEN** | Public Launch |
| S-05 SEO/CSR Entity Pages | **OPEN_BLOCKING** | Public Launch |
| Product Activation | **FAIL** | Public Launch |
| Public Launch | **NO-GO** | — |

---

## Search Architecture Current State

```
posts (published, public-safe)
    │
    ▼
bl_rebuild_search_documents()  [admin/service_role, staging verified]
    │
    ▼
search_documents (RLS, no anon SELECT)
    │
    ▼
bl_search_public_content(search_query, search_filters)  [SECURITY DEFINER, whitelisted output]
    │
    ▼
js/search.js — RPC-first BoundLoreSearch.runRpcSearch
    │
    ▼
/wiki/search/ UI (whitelisted fields only)
```

**Client-Ergänzung:** `BoundLoreSearchRecall` für QA-Fixtures; Runtime nutzt RPC, nicht direkte `posts`-Reads.

---

## Staging Corpus State

| Item | Wert |
|------|------|
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` |
| Published Canonicals | **12** (Suffix `-p5e9e4i`) |
| `search_documents` | **12** |
| Marker in `content` | **0** (nach 4L) |
| Cleanup | **Nein** — persistenter Corpus |
| Rollback | Exakte 12-Slug-Liste (Seed-Report) |

---

## RPC / FTS Evidence

| Check | Staging |
|-------|---------|
| `search_documents` + FTS | **Applied** (4A) |
| `bl_search_public_content` | **Exists**, whitelisted output |
| `bl_rebuild_search_documents` | **Verified** (4I, 4L) |
| Core recall (`monster`, `artifact`, …) | **PASS** |
| Safety (no-hit, unsafe, long) | **PASS** |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |

---

## Client Runtime Evidence

| Check | Ergebnis |
|-------|----------|
| Staging Runtime Config | **21/21 PASS** |
| Client Hardening | **92/92 PASS** |
| Search Recall Fixtures | **48/48 PASS** |
| RPC Integration | **48/48 PASS** |
| `/wiki/search/` loads | **No crash** |
| RPC-first path | **Active** |

---

## RLS / Privacy / No-Leak Evidence

| Check | Ergebnis |
|-------|----------|
| Kein `42501` auf Search-Pfad | **PASS** (post-4D) |
| Kein anon SELECT `profiles` | **PASS** |
| Kein anon SELECT `search_documents` | **PASS** |
| Kein BLMETA in UI | **PASS** |
| Kein `search_text` / `search_vector` in UI | **PASS** |
| Keine Profile-PII | **PASS** |
| Unsafe query fail-closed | **PASS** |

---

## Marker Risk Resolution

| Phase | Status |
|-------|--------|
| 4J: Marker in `content` RPC-suchbar | **Identified** — MARKER_SEARCHABLE_RISK |
| 4K: Mitigation Plan (Option A) | **PASS** |
| 4L: Marker aus `content` entfernt + Rebuild | **PASS** |
| Marker-Vollstring suchbar | **Nein** — CLOSED_STAGING |
| Slug-Suffix `-p5e9e4i` unter `P5E9E4I` | **Artefakt** — dokumentiert, kein Content-Leak |

---

## S-06 Closure Criteria (für Final Closure)

| Kriterium | Staging | Production (erforderlich) |
|-----------|---------|----------------------------|
| Ziel-Ref eindeutig verifiziert | **Ja** | **Offen** |
| Backup vor Write | **Ja** (4I, 4L) | **Offen** |
| Public-safe published Corpus | **Ja** (12 staging) | **Offen** |
| `search_documents` gefüllt | **Ja** (12) | **Offen** |
| RPC-first Client Production-Pfad | **N/A** (staging config) | **Offen** |
| Query-Matrix PASS | **Ja** | **Offen** |
| no-hit/unsafe/long PASS | **Ja** | **Offen** |
| Keine BLMETA/search_text/PII-Leaks | **Ja** | **Offen** |
| Kein `profiles` anon/public Grant | **Ja** | **Offen** |
| Keine Draft/Pending/QA/Test-Leaks | **Ja** | **Offen** |
| S-05 SEO/CSR nicht blockierend | **Nein** | **Offen** |

---

## Why S-06 Is Not Fully Closed Yet

1. **Scope-Grenze:** Alle Runtime-Evidence bezieht sich auf **Staging only** (`jzzgoiwfbuwiiyvwgwri`). Production Search wurde nicht verifiziert.
2. **Content-Gap:** Staging-Corpus (12 kuratierte Canonicals) ist kein Production-Content-Substitut.
3. **Launch-Blocker:** S-05 SEO/CSR bleibt **OPEN_BLOCKING** — unabhängig von Search, aber Launch-relevant.
4. **Product Activation:** **FAIL** — Search allein schließt Activation nicht.
5. **Explizite Gate-Trennung:** P5-E.9E.4M schließt **Staging Evidence**, nicht **S-06 Final**.

---

## Required Future Gates

| Gate | Zweck | Freigabe |
|------|-------|----------|
| **Production Content Migration** | Production published Corpus + Rebuild | Separater Write-Gate |
| **Production Search Verification** | RPC-first Query-Matrix auf Production | Read-only oder controlled |
| **S-06 Final Closure** | Alle Production-Kriterien erfüllt | Nach Production Evidence + S-05 Entscheid |
| **S-05 SEO/CSR Closure** | Entity pages / SSG | Parallel oder vor Launch |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4M | **PASS** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** |
| MARKER_SEARCHABLE_RISK | **CLOSED_STAGING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| P5-E.9E.5A | **PASS** (Plan-only) |
| Production / Legacy Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |

---

## P5-E.9E.5A Follow-up (PASS — Production / Legacy Target & Cutover Plan)

**Gate:** P5-E.9E.5A. **PASS** (Plan-only).

| Item | Ergebnis |
|------|----------|
| Production / Legacy Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Legacy `ohkoojpzmptdfyowdgog` angefasst | **Nein** |
| DB-Zugriff / SQL / Write | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** (unverändert) |
| Empfohlener nächster Gate | **P5-E.9E.5B** |

**Report:** `docs/architecture/p5-production-legacy-target-cutover-plan.md`

**Kernaussage:** Staging Evidence **STAGING_CLOSED** bleibt gültig. Cutover auf Production/Legacy ist **jetzt verboten** — zuerst read-only Inventory (5B), dann Final Target Decision (5C). **Launch ≠ Cutover.**

---

## P5-E.9E.5B Follow-up (PASS — Read-only Legacy Inventory)

**Gate:** P5-E.9E.5B. **PASS** (Read-only).

| Item | Ergebnis |
|------|----------|
| Legacy Inventory | **COMPLETE** |
| Final Target Suitability | **NEEDS_MIGRATION_DECISION** |
| Legacy read-only DB-Zugriff | **Ja** (kein Write) |
| S-06 Final Status | **OPEN_BLOCKING** (unverändert) |
| Empfohlener nächster Gate | **P5-E.9E.5C** |

## P5-E.9E.5C Follow-up (PASS — Final Target Decision)

**Gate:** P5-E.9E.5C. **PASS** (Plan-only).

| Item | Ergebnis |
|------|----------|
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Empfohlener nächster Gate | **P5-E.9E.5D** |

**Report:** `docs/architecture/p5-final-target-decision.md`

---

## P5-E.9E.5D Follow-up (PASS — Legacy Fresh Backup Evidence)

**Gate:** P5-E.9E.5D. **PASS** (Backup-Export only).

| Item | Ergebnis |
|------|----------|
| Legacy Fresh Backup Evidence | **COMPLETE** |
| Backup | 433,643 bytes; SHA256 dokumentiert; TOC **701** |
| Restore / SQL Apply | **Nein** |
| Empfohlener nächster Gate (historisch) | **P5-E.9E.5E** |

**Report:** `docs/architecture/p5-legacy-fresh-backup-evidence-report.md`

---

## P5-E.9E.5E Follow-up (PASS — Legacy Profile/RLS Security Hardening)

**Gate:** P5-E.9E.5E. **PASS** (Policy/Grant Apply).

| Item | Ergebnis |
|------|----------|
| `profiles_select_all` | **Entfernt** |
| Posts SELECT RLS Dependency | **Geschlossen** |
| Search Apply | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5G** |

**Report:** `docs/architecture/p5-legacy-search-db-fts-apply-report.md`

---

## P5-E.9E.5F Follow-up (PASS — Legacy Search DB/FTS Apply)

**Gate:** P5-E.9E.5F. **PASS** (Search DDL; empty index).

| Item | Ergebnis |
|------|----------|
| Search DB/FTS | **APPLIED_LEGACY_PASS** |
| Rebuild | **Nein** |
| `search_documents` rows | **0** |
| Empfohlener nächster Gate | **P5-E.9E.5G** |

---

## P5-E.9E.5G Follow-up (PASS — Legacy Content Filter + Rebuild)

**Gate:** P5-E.9E.5G. **PASS**.

| Item | Ergebnis |
|------|----------|
| Rebuild | **6** Zeilen |
| Index State | **POPULATED** |
| RPC Smoke | **PASS** |
| Content-Row-Writes | **Nein** |
| Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5H** |

**Report:** `docs/architecture/p5-legacy-content-filter-rebuild-report.md`

---

## P5-E.9E.5H Follow-up (PASS — Legacy RPC-first Search Verification)

**Gate:** P5-E.9E.5H. **PASS**.

| Item | Ergebnis |
|------|----------|
| Core Query Matrix | **12/12 PASS** |
| Safety / Exclusion | **10/10 PASS** |
| RPC Output Contract | **PASS** |
| Legacy RPC-first Search Verification | **VERIFIED_PASS** |
| `search_documents` rows | **6** (unverändert) |
| Rebuild / Writes / Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5I** |

**Report:** `docs/architecture/p5-legacy-rpc-first-search-verification-report.md`

---

*Dokumentversion: P5-E.9E.4M + 5A–5H PASS. Kein Content Row Write.*
