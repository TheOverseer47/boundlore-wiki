# P5-E.9E.5C — Final Target Decision

**Gate:** P5-E.9E.5C — Final Target Decision. **PASS** (Plan-only).

**HEAD vor Gate:** `705747f` — Inventory production legacy target

**Arbeitsmodus:** Nur lokales Repo. Planung/Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write/Supabase/Runtime-Switch/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5C** | **PASS** (Plan-only Decision) |
| **Final Target Decision** | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| **Final Target Ref** | `ohkoojpzmptdfyowdgog` (conditional — nicht aktiv) |
| **Staging Ref** | `jzzgoiwfbuwiiyvwgwri` (weiterhin Runtime + Evidence) |
| **Legacy Target Suitability (5B)** | **NEEDS_MIGRATION_DECISION** → aufgelöst als **CONDITIONAL** |
| **Empfohlener nächster Gate** | **P5-E.9E.5D** — Legacy Fresh Backup Evidence |
| **S-06 Staging Evidence** | **STAGING_CLOSED** (unverändert) |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Auf Basis des 5B-Inventars wird `ohkoojpzmptdfyowdgog` als **conditional final target candidate** weitergeführt — **nicht** sofort aktiviert, **kein** Runtime-Switch. Staging-Promotion (B) wird abgelehnt; neuer Project-Ref (C/D) bleibt **Fallback**, falls Legacy-Härtung scheitert. Vor jedem Legacy-Write: Backup (5D) → Security Hardening (5E) → Search Apply (5F) → Content/Rebuild (5G) → Verification (5H) → Runtime Dry Run (5I) → S-06 Final (5J).

---

## HEAD / Working Tree / No-Access-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `705747f` |
| SQL ausgeführt / SQL Apply | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Supabase-Verbindung | **Nein** |
| Legacy/Production Write | **Nein** |
| Runtime-Switch | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |
| Secrets/Backups geöffnet | **Nein** |

---

## Input Evidence (aus P5-E.9E.5B)

| Kategorie | Befund |
|-----------|--------|
| **Legacy Ref** | `ohkoojpzmptdfyowdgog` |
| **Projektname** | TheOverseer47's Project |
| **Schema** | 24 Base Tables + 1 View; RLS auf Core-Tabellen aktiv |
| **Extensions** | `pg_trgm`, `pgcrypto`, `uuid-ossp` |
| **Search MVP** | **Fehlt vollständig** — kein `search_documents`, `bl_search_public_content`, `bl_rebuild_search_documents` |
| **Release Gate** | **Fehlt** — kein `release_gate`, `release_gate_audit` |
| **Content** | 26 posts total; 9 published; 1 pending; 16 deleted |
| | 13 `Contribution:` Titel; 15 QA/test/fixture/seed Slugs; 3 published QA-Slugs |
| | **6 canonical candidates**; 14 `wiki_entities`; 0 published entity views |
| **Kritische Findings** | `profiles_select_all` (`qual=true`); `anon SELECT` auf `profiles`; `posts_select_approved` mit `profiles`-Subquery |
| **5B Suitability** | **NEEDS_MIGRATION_DECISION** |

**Quelle:** `docs/architecture/p5-production-legacy-readonly-inventory-report.md`

---

## Final Target Options

| Option | Beschreibung | Vorteile | Risiken | Entscheidung |
|--------|--------------|----------|---------|--------------|
| **A. Legacy upgraden** | `ohkoojpzmptdfyowdgog` nach Härtung als Final Target | Echte Daten; Schema upgrade-fähig; keine Voll-Migration nötig | `profiles` Public-Leak; Search MVP fehlt; Release Gate fehlt; Content klein/QA-kontaminiert; S-05 offen | **CONDITIONAL_ACCEPT** — primärer Pfad |
| **B. Staging promoten** | `jzzgoiwfbuwiiyvwgwri` als Production | Search technisch bewiesen | Nur Test-/Seed-Corpus; kein Production-Kontext | **REJECT_FOR_NOW** |
| **C. Neuer Production Ref** | Frische Supabase-Instanz | Sauberer Neustart; Trennung Legacy/Staging | Migration aufwändig; neue Backup/RLS/Env-Gates | **FALLBACK_OPTION** |
| **D. Content-Migration Legacy → neu** | Selective Import in neuen Target | Sauberer Zielzustand; echte Inhalte übernehmbar | Bereinigung + Migrationskomplexität | **SECONDARY_OPTION** |
| **E. Staging-only** | Kein Cutover | Kein Production-Risiko | Kein Launch-Pfad | **TEMPORARY_ONLY** |

---

## Decision

| Feld | Wert |
|------|------|
| **Final Target Decision** | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| **Final Target Ref** | `ohkoojpzmptdfyowdgog` |
| **Aktive Runtime** | `jzzgoiwfbuwiiyvwgwri` (Staging — **unverändert**) |
| **Sofort-Cutover** | **VERBOTEN** |
| **Legacy-Write vor Backup** | **VERBOTEN** |
| **Staging als Production** | **ABGELEHNT** |
| **Fallback bei Härtungs-FAIL** | Option C/D neu evaluieren |

**Bedingungen für Aktivierung als Final Target:**

1. Frischer Backup-Nachweis (5D)
2. Profile-/RLS-Security-Härtung (5E)
3. Posts-RLS-Dependency-Fix (5E)
4. Search DB/FTS Apply (5F)
5. Content-Cleanup oder kuratierte Canonical-Auswahl (5G)
6. `search_documents` Rebuild (5G)
7. RPC-first Query-Matrix PASS (5H)
8. Runtime Config Cutover Dry Run (5I)
9. S-06 Final Closure Dossier (5J)
10. S-05 SEO/CSR Entscheidung (separat)

---

## Rationale

| Faktor | Bewertung |
|--------|-----------|
| Schema-Kompatibilität | **Ja** — Wiki-Fundament vorhanden, `pg_trgm` da |
| Echter Content | **Ja, aber dünn** — 6 canonical candidates reichen für MVP-Search-Test, nicht für Launch |
| Search Readiness | **Nein** — vollständiger MVP Apply nötig |
| Security Readiness | **Nein** — `profiles_select_all` + anon grants kritisch |
| Ops-Einfachheit | **Ja** vs. Neumigration — ein Project, bekannte Ref |
| Staging Evidence | Nutzbar als **Apply-Blueprint**, nicht als Production-Target |
| Launch Readiness | **Nein** — S-05, Product Activation, Release Gate offen |

**Fazit:** Legacy ist der **effizienteste primäre Pfad**, aber nur **conditional** — Härtung und Verification sind nicht optional. Staging bleibt Evidence- und Runtime-Kontext bis 5I PASS.

---

## Required Security Fixes Before Cutover

| Fix | Pflicht | Gate |
|-----|---------|------|
| `profiles_select_all` entfernen oder einschränken | **Ja** | 5E |
| Kein `anon SELECT` auf `profiles` | **Ja** | 5E |
| Kein `profiles` public/anon Grant | **Ja** | 5E |
| Posts-Policies ohne anon-evaluierte `profiles`-Subquery (analog 4D) | **Ja** | 5E |
| Keine Draft/Pending/QA/Test in Public Search | **Ja** | 5G + Rebuild-Filter |
| Keine BLMETA/PII/search_text/search_vector in RPC-Output | **Ja** | 5F + 5H |
| `Contribution:` Titel ausgeschlossen | **Ja** | 5G |
| Release Gate / Locking | **Separat bewerten** — `release_gate` fehlt auf Legacy | P5-E.10+ |

---

## Required Search Promotion Steps

| Schritt | Detail | Gate |
|---------|--------|------|
| `search_documents` Tabelle + RLS | Analog Staging 4A | 5F |
| `bl_search_public_content` RPC | Public-safe Output-Whitelist | 5F |
| `bl_rebuild_search_documents` | service_role/admin only | 5F |
| Sichere Grants | Kein anon SELECT auf `search_documents` | 5F |
| RPC-first Client | `js/search.js` — kein `.from('posts')` Primärpfad | 5H |
| Query Matrix | Core + Safety + No-Leak PASS | 5H |
| Rebuild | Nach Content-Auswahl | 5G |

**Regel:** Runtime darf erst nach 5H PASS auf Legacy zeigen (5I Dry Run).

---

## Required Content Work

| Item | Befund / Pflicht |
|------|------------------|
| Canonical candidates (5B) | **6** — Basis für MVP-Rebuild |
| QA/test/fixture/seed Slugs | **Ausschließen** — 3 published QA-Slugs nicht indexieren |
| `Contribution:` Titel | **13 total** — aus Public Search ausschließen |
| `exclude_public` Tags | Legacy-Schema hat kein `tags`-Feld — Filter über Titel/Slug-Manifest |
| BLMETA in Content | 26/26 Posts — Rebuild-Filter Pflicht, nicht blind indexieren |
| Entity views published | **0** — SEO/SSG-Pfad separat (S-05) |
| Content-Dichte | **Dünn** — ggf. kuratierten Canonical Import in 5G oder später |

**Manifest-Pflicht:** Vor Rebuild explizite Slug-Liste der erlaubten published Canonicals.

---

## Updated Gate Sequence (post-5B/5C)

| # | Gate | Modus | Scope |
|---|------|-------|-------|
| 1 | ~~P5-E.9E.5A~~ | Plan | Cutover Plan — **PASS** |
| 2 | ~~P5-E.9E.5B~~ | Read-only | Legacy Inventory — **PASS** |
| 3 | ~~P5-E.9E.5C~~ | Plan-only | Final Target Decision — **PASS** |
| 4 | **P5-E.9E.5D** | Backup Evidence | Frischer Backup `ohkoojpzmptdfyowdgog` — kein Restore |
| 5 | **P5-E.9E.5E** | Apply (Freigabe) | Profile/RLS Security Hardening + Posts-RLS-Fix — **kein Search Apply** |
| 6 | **P5-E.9E.5F** | Apply (Freigabe) | Search DB/FTS MVP analog Staging — **keine Content-Migration** |
| 7 | **P5-E.9E.5G** | Apply (Freigabe) | Content Cleanup / Canonical-Auswahl + Rebuild |
| 8 | **P5-E.9E.5H** | Verification | RPC-first Query Matrix, Safety, No-Leak |
| 9 | **P5-E.9E.5I** | Runtime Dry Run | Lokal auf Legacy — kein Deploy |
| 10 | **P5-E.9E.5J** | Dossier | S-06 Final Closure — nur wenn 5H PASS |
| 11 | **S-05** | Separat | SEO/CSR Entity Pages |
| 12 | **Launch** | Explizit | Product Activation + alle Blocker |

**STOPP zwischen jedem Gate ohne Nutzerfreigabe.**

---

## Runtime Switch Conditions

Runtime darf erst auf `ohkoojpzmptdfyowdgog` zeigen, wenn:

| Bedingung | Gate |
|-----------|------|
| 5D Backup PASS | 5D |
| 5E Security Hardening PASS | 5E |
| 5F Search Apply PASS | 5F |
| 5G Content/Rebuild PASS | 5G |
| 5H Search Verification PASS | 5H |
| Config Guard für finalen Target | 5I |
| Kein Legacy/Staging-Mix | 5I |
| Rollback-Pfad dokumentiert | 5D + 5E |
| **Kein Launch** ohne separaten Launch-Gate | — |

**Aktuell:** `js/supabase-config.js` → `jzzgoiwfbuwiiyvwgwri`. **Keine Änderung in 5C.**

---

## Rollback / Restore Boundaries

| Regel | Detail |
|-------|--------|
| Backup vor jedem Write | **Pflicht** — 5D vor 5E+ |
| Rollback bevorzugt | Enge SQL-Strategie — nicht Full Restore |
| Restore | Nur separates Restore-Gate |
| Backup-Dateien | Gitignored — nicht committen |
| Dokumentation | SHA256 + Größe — keine Dateninhalte |

---

## Why Launch Remains NO-GO

| Blocker | Status |
|---------|--------|
| Legacy Security nicht gehärtet | **Offen** |
| Search nicht auf Legacy applied/verified | **Offen** |
| S-06 Final | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Release Gate auf Legacy fehlt | **Offen** |
| Product Activation | **FAIL** |
| Production Closure | **NOT CLOSED** |
| Cutover ≠ Launch | **Explizit getrennt** |

---

## Required Future Gates

| Gate | Freigabe |
|------|----------|
| **P5-E.9E.5D** | Backup Legacy — **Ja** (Write-frei, nur Export) |
| **P5-E.9E.5E** | Security Hardening Legacy — **Ja** (Legacy-Write) |
| **P5-E.9E.5F–5J** | Je Gate explizit |
| **S-05, Launch** | Separat |

---

## Nutzerfreigabe für P5-E.9E.5D (STOPP bis Freigabe)

> „Ja, ich gebe P5-E.9E.5D frei — Legacy Fresh Backup Evidence für `ohkoojpzmptdfyowdgog`, Backup-Export only, kein Restore, kein SQL Apply, kein Legacy-Write außer Backup-Export, kein Staging-Write, kein Runtime-Switch, kein Push, kein Deploy, kein Launch.“

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5C | **PASS** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Legacy Target Suitability | **CONDITIONAL** (war NEEDS_MIGRATION_DECISION) |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

*Dokumentversion: P5-E.9E.5C PASS. Plan-only. Kein DB-Zugriff. Keine Secrets.*
