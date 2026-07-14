# P5-E.9E.5A — Production / Legacy Target & Cutover Plan

**Gate:** P5-E.9E.5A — Production / Legacy Target & Cutover Plan. **PASS** (Plan-only).

**HEAD vor Gate:** `1b7c11c` — Document S06 staging search closure evidence

**Arbeitsmodus:** Nur lokales Repo. Planung/Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write/Supabase/Runtime-Switch/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5A** | **PASS** (Plan-only) |
| **P5-E.9E.5C** | **PASS** (Plan-only Decision) |
| **Production / Legacy Target Decision** | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| **Final Target Ref** | `ohkoojpzmptdfyowdgog` (conditional — nicht aktiv) |
| **S-06 Staging Evidence** | **STAGING_CLOSED** |
| **S-06 Final Status** | **CLOSED_SEARCH_EVIDENCE** |
| **S-06 Search Recall** | **CLOSED** |
| **Legacy Search Runtime Readiness** | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| **Empfohlener nächster Gate** | **P5-E.9F.1** — S-05 SEO/CSR Entity Pages Closure Plan |
| **Legacy Fresh Backup Evidence (5D)** | **COMPLETE** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Staging Search **STAGING_CLOSED**. Legacy `ohkoojpzmptdfyowdgog` ist **LEGACY_CONDITIONAL_TARGET_CANDIDATE** (5C) — primärer Upgrade-Pfad, aber **kein** Runtime-Switch vor 5D–5J. Staging-Promotion abgelehnt; neuer Ref bleibt Fallback.

---

## HEAD / Working Tree / No-Access-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `1b7c11c` |
| SQL ausgeführt / SQL Apply | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Supabase-Verbindung | **Nein** |
| Legacy/Production Zugriff | **Nein** |
| Runtime-Switch | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |
| Secrets/Backups geöffnet | **Nein** |

---

## Current State

| Item | Status |
|------|--------|
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` — Search **STAGING_CLOSED** (4A–4M) |
| Legacy / alte DB Ref | `ohkoojpzmptdfyowdgog` — **read-only inventarisiert** (5B) |
| Search DB/FTS auf Staging | **Applied + verified** |
| Search DB/FTS auf Legacy/Production | **NOT APPLIED** |
| Persistenter Staging-Corpus | 12 Canonicals (`-p5e9e4i`) |
| RPC-first Client | **Integrated** (Staging config) |
| Production-/Legacy-Writes | **Keine** |
| boundlore.com | **Tabu** bis Launch-Gate |
| Public Launch | **NO-GO** |

---

## Terminology: Staging vs Legacy vs Production

| Begriff | Definition | Ref / Kontext |
|---------|------------|---------------|
| **Staging** | Isolierte Verifikations-DB für kontrollierte Gates | `jzzgoiwfbuwiiyvwgwri` |
| **Legacy / alte DB** | Ursprüngliche Supabase-Instanz; historischer Datenbestand | `ohkoojpzmptdfyowdgog` |
| **Production** | Live-Betrieb für Endnutzer; **noch nicht final geschlossen** | boundlore.com — **tabu** |
| **Final DB Target** | `ohkoojpzmptdfyowdgog` — **LEGACY_CONDITIONAL_TARGET_CANDIDATE** (5C); Runtime bleibt Staging |
| **Cutover** | Kontrollierter Wechsel der Runtime-Config auf Final Target **nach** Backup, Apply, Verification | Separates Gate (5H+) |
| **Launch** | Public Go-Live — **nicht** automatisch durch Cutover; eigener Launch-Gate | **NO-GO** |

**Regel:** Legacy ≠ automatisch Production. Staging ≠ automatisch Production. Cutover ≠ Launch.

---

## Why We Do Not Switch Back Yet

| Blocker | Detail |
|---------|--------|
| Alte DB nicht inventarisiert | Schema, RLS, Content, Search-Readiness unbekannt |
| Kein frischer Backup-Nachweis Final Target | Pflicht vor jedem Write |
| Search DB/FTS nur auf Staging | Nicht auf Legacy/Production migriert |
| Production Content Migration offen | Kein finaler published Corpus |
| Final Target nicht entschieden | **Aufgelöst** — LEGACY_CONDITIONAL (5C); Härtung/Apply offen |
| S-06 Final | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Fazit:** Zurück auf `ohkoojpzmptdfyowdgog` **jetzt** würde unbewiesene Search-Features, ungeklärte RLS/Grants und fehlende Backup-Grenzen riskieren.

---

## Target Options Matrix

| Option | Beschreibung | Vorteile | Risiken | Empfehlung |
|--------|--------------|----------|---------|------------|
| **A. Alte DB als Final Production-Target** | `ohkoojpzmptdfyowdgog` erhält Search DB/FTS + Content | Bestehender Content, eine Instanz | Unbekannter Schema-Drift, RLS/Grant-Lücken, BLMETA/QA-Leaks möglich | **Nach 5B Inventory** — nicht sofort |
| **B. Staging als Production-Target** | `jzzgoiwfbuwiiyvwgwri` wird promoted | Search bereits bewiesen | Nur 12 Seed-Canonicals; kein echter Production-Content | **Nein** als Dauerlösung — nur Test |
| **C. Neuer Production-Project-Ref** | Frische Supabase-Instanz | Sauberer Start, klare Grenzen | Migrationsaufwand, doppelte Ops | **Option** wenn A untauglich |
| **D. Content-Migration alte DB → neuer Target** | Selective Import public-safe Canonicals | Trennung Legacy-Daten vs. neuer Stack | Komplexität, Rollback | **Nach 5C Decision** |
| **E. Staging-only bleiben** | Kein Cutover | Sicher, bewiesen | Kein Production-Pfad | **Aktuell** — bis 5B/5C |

**Empfehlung:** **Nicht sofort** auf alte DB zurück. **Zuerst P5-E.9E.5B** read-only Inventory von `ohkoojpzmptdfyowdgog`. **Dann P5-E.9E.5C** Final Target Decision. Cutover erst nach Backup (5D), Apply (5E), Content (5F), Verification (5G), Runtime Dry Run (5H).

---

## Recommended Cutover Path (updated 5C)

| # | Gate | Modus | Scope |
|---|------|-------|-------|
| 1 | ~~P5-E.9E.5A~~ | Plan | Cutover Plan — **PASS** |
| 2 | ~~P5-E.9E.5B~~ | Read-only | Legacy Inventory — **PASS** |
| 3 | ~~P5-E.9E.5C~~ | Plan-only | Final Target Decision — **PASS** |
| 4 | ~~P5-E.9E.5D~~ | Backup Evidence | **PASS** — 433,643 bytes |
| 5 | **P5-E.9E.5E** | Apply (Freigabe) | Profile/RLS Security Hardening + Posts-RLS-Fix |
| 6 | **P5-E.9E.5F** | Apply (Freigabe) | Search DB/FTS MVP analog Staging |
| 7 | **P5-E.9E.5G** | Apply (Freigabe) | Content Cleanup + Rebuild |
| 8 | **P5-E.9E.5H** | Verification | RPC Query Matrix, Safety, No-Leak |
| 9 | **P5-E.9E.5I** | Runtime Dry Run | Lokal auf Legacy — kein Deploy |
| 10 | **P5-E.9E.5J** | Dossier | S-06 Final Closure |
| 11 | **S-05** | Separat | SEO/CSR |
| 12 | **Launch** | Explizit | Product Activation + alle Blocker |

---

## Recommended Cutover Path (historical 5A)

**STOPP zwischen jedem Gate ohne Nutzerfreigabe.**

---

## Required Pre-Cutover Evidence

| Evidence | Erforderlich vor |
|----------|------------------|
| Read-only Inventory (5B) | Final Target Decision |
| Final Target Decision (5C) | Backup/Apply |
| Frischer Backup (5D) | Jeder Write |
| Search DB/FTS Apply Report (5E) | Content/Rebuild |
| Content Migration Plan + Manifest | Rebuild (5F) |
| Query Matrix PASS (5G) | Runtime Switch (5H) |
| S-06 Final Dossier (5I) | Launch-Diskussion |
| S-05 Closure oder explizite Deferral | Launch |

---

## Search Feature Promotion Plan

Final Target muss erhalten (analog Staging 4A):

| Komponente | Anforderung |
|------------|-------------|
| `search_documents` | Tabelle + RLS, kein anon SELECT |
| `bl_search_public_content` | Public RPC, whitelisted Output |
| `bl_rebuild_search_documents` | Admin/service_role Rebuild |
| RPC-first Client | `js/search.js` — kein `.from('posts')` Primärpfad |
| Kein `profiles` anon/public Grant | Fail-closed |
| Output-Whitelist | title, slug/url, excerpt, category/type, score — **kein** search_text/search_vector/BLMETA/PII |
| Query Matrix | Core + Safety PASS |
| Marker/QA | Keine Audit-Marker in indexierten Feldern |

**Promotion-Pfad:** Staging-SQL-Draft (9E.3A/3B) → Final Target Apply (5E) → Content Rebuild (5F) → Verification (5G).

---

## Content Migration / Content Source Decision

**Offene Fragen (beantworten in 5B/5C/5F):**

| Frage | Status |
|-------|--------|
| Kommt finaler Content aus alter DB? | **Offen** — 5B Inventory |
| Wird Staging-Seed (`-p5e9e4i`) verworfen oder ersetzt? | **Offen** — Staging-Seed ist Verifikation, nicht Production-Content |
| Echte Canonicals bereits in alter DB? | **Offen** — 5B |
| Draft/Pending/QA/Test ausgeschlossen? | **Pflicht** — published-only |
| BLMETA oder interne Marker in Content? | **Pflicht-Ausschluss** |
| Canonical Slugs definiert? | **Pflicht-Manifest** vor Rebuild |
| Welche Inhalte dürfen published sein? | Public-safe Contract (4H) |

---

## Runtime Config Switch Plan

| Regel | Detail |
|-------|--------|
| Kein Switch ohne Final Target Decision (5C) | **STOPP** |
| Kein Switch ohne Backup (5D) + Verification (5G) | **STOPP** |
| `js/supabase-config.js` | Config Guard — kein heimliches Legacy |
| Jeder Switch braucht | Ziel-Ref, STAGING_REF_VERIFIED-Äquivalent, Fixtures PASS, Query Matrix PASS, No-Leak PASS, Rollback-Plan |
| boundlore.com | **Tabu** bis Launch-Gate |
| Rollback | Zurück auf Staging-Config oder prior Backup — dokumentiert |

**Dry Run (5H):** Lokal only, kein Deploy, kein boundlore.com.

---

## Backup / Rollback / Restore Boundaries

| Regel | Detail |
|-------|--------|
| Backup vor jedem Write | **Pflicht** — pg_dump Custom Format bevorzugt |
| Rollback bevorzugt | Enge SQL-Strategie (Slug-Liste, scoped DELETE) — nicht Full Restore |
| Restore | Nur separates Restore-Gate — **verboten** in 5A–5G |
| Backup-Dateien | Gitignored unter `backups/` — **nicht committen** |
| Dokumentation | SHA256 + Größe — **keine** Dateninhalte in Docs |

---

## Security / RLS / Privacy Considerations

| Check | Pflicht Final Target |
|-------|---------------------|
| Kein `profiles` anon/public SELECT | Ja |
| Public Search nur published/public-safe | Ja |
| Draft/Pending/QA/Test ausgeschlossen | Ja |
| Kein BLMETA, PII, E-Mail in Output | Ja |
| `Contribution:` Titel ausgeschlossen | Ja |
| `exclude_public` Tags ausgeschlossen | Ja |
| RLS + Grants inventarisiert (5B) | Ja |
| RPC public-safe (SECURITY DEFINER hardened) | Ja |

---

## SEO / SSG Interaction

| Item | Detail |
|------|--------|
| Search-Cutover | **Löst S-05 nicht** |
| Entity Detail SEO/CSR | **Separater Blocker** (S-05 OPEN_BLOCKING) |
| SSG/Prerender/Sitemap | Weiterführung in 9D-Gates |
| Public Launch | **NO-GO** auch wenn S-06 später geschlossen — solange S-05 offen |

---

## Required Future Gates

| Gate | Typ | Freigabe |
|------|-----|----------|
| **P5-E.9E.5B** | Read-only Inventory Legacy | **Ja** — explizit |
| **P5-E.9E.5C** | Final Target Decision | Plan + Freigabe |
| **P5-E.9E.5D–5I** | Backup/Apply/Verify/Cutover/Closure | Je Gate |
| **S-05** | SEO/CSR | Separat |
| **Launch** | Public Go-Live | Alle Blocker |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5A | **PASS** |
| P5-E.9E.5B | **PASS** (Read-only Inventory) |
| Production / Legacy Inventory | **COMPLETE** |
| P5-E.9E.5C | **PASS** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Legacy Target Suitability | **CONDITIONAL** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

## P5-E.9E.5C Follow-up (PASS — Final Target Decision)

**Gate:** P5-E.9E.5C. **PASS** (Plan-only).

| Item | Ergebnis |
|------|----------|
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Staging als Production | **REJECT_FOR_NOW** |
| Neuer Ref Fallback | **FALLBACK_OPTION** |
| SQL Apply / Write | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5D** |

**Report:** `docs/architecture/p5-final-target-decision.md`

---

## P5-E.9E.5B Follow-up (PASS — Read-only Legacy Inventory)

**Gate:** P5-E.9E.5B. **PASS** (Read-only).

| Item | Ergebnis |
|------|----------|
| Inventory Status | **COMPLETE** |
| Final Target Suitability | **NEEDS_MIGRATION_DECISION** |
| Search-Objekte auf Legacy | **Fehlen** |
| `profiles_select_all` | **Kritisch** (`qual=true`) |
| Published canonical candidates | **6** |
| SQL Apply / Write | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5C** |

**Report:** `docs/architecture/p5-production-legacy-readonly-inventory-report.md`

---

## Nutzerfreigabe für P5-E.9E.5B (erfüllt)

> „Ja, ich gebe P5-E.9E.5B frei — Production/Legacy Read-only Inventory gegen `ohkoojpzmptdfyowdgog`, read-only only, kein SQL Apply, kein Write, kein Staging-Write, kein Production-Write, kein Legacy-Write, kein Runtime-Switch, kein Push, kein Deploy, kein Launch.“

---

## P5-E.9E.5D Follow-up (PASS — Legacy Fresh Backup Evidence)

**Gate:** P5-E.9E.5D. **PASS** (Backup-Export only).

| Item | Ergebnis |
|------|----------|
| Backup-Pfad | `backups/legacy/p5-e9e5d-legacy-prewrite-20260714-152031.dump` |
| Größe / SHA256 | 433,643 bytes / `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| TOC | **701** |
| Restore / SQL Apply | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5F** |

**Report:** `docs/architecture/p5-legacy-fresh-backup-evidence-report.md`

---

## P5-E.9E.5E Follow-up (PASS — Legacy Profile/RLS Security Hardening)

**Gate:** P5-E.9E.5E. **PASS**.

| Item | Ergebnis |
|------|----------|
| `profiles_select_all` | **Entfernt** |
| `anon SELECT profiles` | **Entfernt** |
| Posts SELECT RLS Dependency | **Geschlossen** |
| Search Apply | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5F** |

**Report:** `docs/architecture/p5-legacy-profile-rls-security-hardening-report.md`

---

## P5-E.9E.5F Follow-up (PASS — Legacy Search DB/FTS Apply)

**Gate:** P5-E.9E.5F. **PASS**.

| Item | Ergebnis |
|------|----------|
| Search DB/FTS | **APPLIED_LEGACY_PASS** |
| Rebuild | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5G** |

**Report:** `docs/architecture/p5-legacy-search-db-fts-apply-report.md`

---

## P5-E.9E.5G Follow-up (PASS — Legacy Content Filter + Rebuild)

**Gate:** P5-E.9E.5G. **PASS**.

| Item | Ergebnis |
|------|----------|
| Content Filter/Rebuild | **REBUILD_PASS** |
| `search_documents` rows | **6** |
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

## P5-E.9E.5I Follow-up (PASS — Legacy Runtime Config Cutover Dry Run)

**Gate:** P5-E.9E.5I. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `bea85f3` |
| Fixture Matrix | **32/32 PASS** |
| Temporäre Patches revertiert | **Ja** |
| Cutover-Delta | Temporäre `isRpcAvailable()`-Erweiterung (revertiert) |
| Final Runtime Config | **STAGING** |
| Empfohlener nächster Gate | **P5-E.9E.5J** |

**Report:** `docs/architecture/p5-legacy-runtime-cutover-dry-run-report.md`

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

*Dokumentversion: P5-E.9E.5A–5I + 5J PASS. Kein Content Row Write. S-06 CLOSED_SEARCH_EVIDENCE.*
