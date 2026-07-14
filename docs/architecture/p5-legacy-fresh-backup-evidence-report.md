# P5-E.9E.5D — Legacy Fresh Backup Evidence Report

**Gate:** P5-E.9E.5D — Legacy Fresh Backup Evidence  
**Datum:** 2026-07-14  
**HEAD (Start):** `c8966c6` — Fix QA matrix next gate references after 5C  
**Verdict:** **PASS** — frischer Legacy-Backup-Nachweis; Restore bleibt **OPEN**

---

## Executive Verdict

Ein **frischer, verifizierter Legacy-Backup-Nachweis** wurde erzeugt:

- **Methode:** `pg_dump` Custom Format (`--format=custom --no-owner --no-privileges`)
- **Ziel:** Legacy `ohkoojpzmptdfyowdgog` via Session-Pooler (IPv4, eu-central-1)
- **Artefakt:** Gitignored unter `backups/legacy/` — **nicht** committed
- **Verifikation:** SHA256 + `pg_restore --list` — 11/11 Core-Tabellen mit `TABLE DATA` im Archive-Listing

**Legacy Fresh Backup Evidence** darf als **PASS** gewertet werden. **Restore Evidence** und **Production Backup Schedule** bleiben **OPEN**.

**Nächster Gate (post-5I):** **P5-E.9E.5J** — S-06 Final Closure Dossier.

---

## HEAD / Working Tree

| Prüfung | Ergebnis |
|---------|----------|
| HEAD vor Gate | `c8966c6` |
| Working Tree vor Start | Sauber; untracked: `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| Backup committed | **Nein** |
| `.env` geändert | **Nein** |
| Runtime unverändert | **Ja** — `js/supabase-config.js` → `jzzgoiwfbuwiiyvwgwri` |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5D frei — Legacy Fresh Backup Evidence für `ohkoojpzmptdfyowdgog`, Backup-Export only, kein Restore, kein SQL Apply, kein Legacy-Write außer Backup-Export, kein Staging-Write, kein Runtime-Switch, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Target Project Ref** | `ohkoojpzmptdfyowdgog` — **verifiziert** |
| **Projektname** | TheOverseer47's Project |
| **Region** | eu-central-1 |
| **DB Version** | PostgreSQL 17.6 |
| **Staging Ref `jzzgoiwfbuwiiyvwgwri`** | **Nicht verwendet** |
| **Production / boundlore.com** | **Nicht verwendet** |
| **Runtime Config** | Unverändert — Staging aktiv |
| **Connection Strings in diesem Dokument** | **Nein** |

---

## Backup Method

| Feld | Wert |
|------|------|
| Tool | PostgreSQL 18.4 `pg_dump.exe` |
| Format | Custom (`.dump`) |
| Flags | `--format=custom --no-owner --no-privileges` |
| Verbindung | Session-Pooler `aws-0-eu-central-1.pooler.supabase.com:5432` |
| User | `postgres.ohkoojpzmptdfyowdgog` |
| Database | `postgres` |
| Legacy-Identität | Ref in `SUPABASE_LEGACY_DB_URL` + `SUPABASE_LEGACY_CONFIRM_IS_LEGACY=true` (Shell-Validierung; `.env.legacy` nicht via Read-Tool geöffnet) |
| Staging-String in URL | **Abgelehnt** — Hard-Stop bei Staging-Ref |
| DB-Write durch Export | **Nein** — read-only `pg_dump` |

---

## Backup Artifact

| Feld | Wert |
|------|------|
| Dateiname | `p5-e9e5d-legacy-prewrite-20260714-152031.dump` |
| Pfad | `backups/legacy/` (gitignored) |
| Erstellt (lokal) | `2026-07-14T15:20:31` |
| Größe | **433,643 bytes** (~423 KiB) |
| SHA256 | `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| Archive-Listing (lokal) | `p5-e9e5d-legacy-prewrite-20260714-152031.dump.archive-list.txt` (gitignored) |

---

## SHA256 / Size / TOC Evidence

| Check | Ergebnis |
|-------|----------|
| Datei existiert | **Ja** |
| Größe > 0 | **Ja** — 433,643 bytes |
| SHA256 | `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| `pg_restore --list` Exit | **0** |
| TOC Entries (Archive-Header) | **701** |
| Keine Dateninhalte ausgegeben | **Ja** — nur TOC |
| Restore ausgeführt | **Nein** |

### Archive-Listing Summary (Core Tables)

| Tabelle | Status im Dump |
|---------|----------------|
| `posts` | **PRESENT** — TABLE + TABLE DATA |
| `profiles` | **PRESENT** — TABLE + TABLE DATA |
| `wiki_entities` | **PRESENT** — TABLE + TABLE DATA |
| `wiki_entity_relations` | **PRESENT** — TABLE + TABLE DATA |
| `wiki_observations` | **PRESENT** — TABLE + TABLE DATA |
| `comments` | **PRESENT** — TABLE + TABLE DATA |
| `notifications` | **PRESENT** — TABLE + TABLE DATA |
| `reports` | **PRESENT** — TABLE + TABLE DATA |
| `post_reactions` | **PRESENT** — TABLE + TABLE DATA |
| `admin_actions` | **PRESENT** — TABLE + TABLE DATA |
| `wiki_patch_mode` | **PRESENT** — TABLE + TABLE DATA |
| `search_documents` | **NOT_PRESENT** (erwartet — 5B) |
| `release_gate` | **NOT_PRESENT** (erwartet — 5B) |
| `storage.objects` | **PRESENT** — Schema + TABLE DATA + Policies |

---

## Gitignore Confirmation

| Check | Ergebnis |
|-------|----------|
| `backups/` in `.gitignore` | **Ja** (`.gitignore:11`) |
| `git check-ignore backups/legacy/p5-e9e5d-*.dump` | **Ignored** |
| Backup in `git status` | **Nein** |
| Secrets committed | **Nein** |

---

## No-Restore Confirmation

| Check | Ergebnis |
|-------|----------|
| `pg_restore` ohne `--list` | **Nicht ausgeführt** |
| Restore in Test-DB | **Nein** |
| SQL Apply | **Nein** |
| DDL / DML | **Nein** |

---

## No-Apply / No-Write Confirmation

| Check | Ergebnis |
|-------|----------|
| SQL Apply | **Nein** |
| DDL / DML / Inserts / Updates / Deletes | **Nein** |
| Legacy-Write (außer Backup-Export) | **Nein** |
| Staging-Write | **Nein** |
| Runtime-Switch | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |
| `supabase/pre_release_test_data_reset.sql` | **Nicht berührt** |

---

## Backup Limitations

| Limitation | Detail |
|------------|--------|
| Nicht restored | Backup beweist **Exportfähigkeit**, nicht Wiederherstellbarkeit |
| Restore-Test | Braucht separaten Restore-Gate |
| Nicht committen | Backup-Datei darf **nicht** ins Repo |
| Keine Inhalte in Docs | Dump-Inhalte dürfen nicht kopiert werden |
| Voraussetzung, kein Ersatz | Backup ist Pflicht vor Write-Gates, ersetzt aber keine Apply-/Rollback-Planung |
| Search MVP fehlt im Dump | `search_documents` absent — erwartet; Apply in 5F |
| Release Gate fehlt | `release_gate` absent — erwartet |

---

## Restore Boundary

| Regel | Detail |
|-------|--------|
| Rollback bevorzugt | Enge SQL-Strategie — nicht Full Restore |
| Full Restore | Nur separates Restore-Gate mit expliziter Freigabe |
| Backup-Referenz für 5E+ | SHA256 + Pfad dokumentiert; Datei lokal gitignored |
| Kein automatischer Restore vor Hardening | 5E darf Backup-Referenz nutzen, Restore bleibt optional/separat |

---

## Required Future Gates

| Gate | Freigabe |
|------|----------|
| ~~**P5-E.9E.5E**~~ | Profile/RLS Security Hardening — **PASS** |
| ~~**P5-E.9E.5G**~~ | Content Cleanup + Rebuild — **PASS** |
| **P5-E.9E.5H–5J** | Je Gate explizit |
| **Restore Evidence** | Separates Gate |
| **S-05, Launch** | Separat |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5D | **PASS** |
| P5-E.9E.5G | **PASS** |
| P5-E.9E.5H | **PASS** |
| P5-E.9E.5I | **PASS** |
| Legacy Fresh Backup Evidence | **COMPLETE** |
| Legacy Search Index State | **POPULATED** (6 via 5G) |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Legacy Target Suitability | **CONDITIONAL** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** P5-E.9E.5J — S-06 Final Closure Dossier

---

## P5-E.9E.5H Follow-up (PASS — Legacy RPC-first Search Verification)

**Gate:** P5-E.9E.5H. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `454d052` |
| Core Query Matrix | **12/12 PASS** |
| Safety / Exclusion | **10/10 PASS** |
| RPC Output Contract | **PASS** |
| `search_documents` rows | **6** (unverändert) |
| Published posts | **9** (unverändert) |
| Rebuild / Writes / Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5I** |

**Report:** `docs/architecture/p5-legacy-rpc-first-search-verification-report.md`

---

## P5-E.9E.5G Backup Reference (PASS — Content Rebuild Prewrite)

**Gate:** P5-E.9E.5G. **PASS**.

| Item | Wert |
|------|------|
| Pfad | `backups/legacy/p5-e9e5g-content-rebuild-prewrite-20260714-154908.dump` |
| Größe | **451,890 bytes** |
| SHA256 | `CD0F19681B35DEE1ECD325DD9F7EA882A48306540D8B70F44877F06BA695BA42` |
| TOC Entries | **715** |
| Gitignored | **Ja** |
| Restore | **Nein** |
| Committed | **Nein** |

**Report:** `docs/architecture/p5-legacy-content-filter-rebuild-report.md`

---

## P5-E.9E.5I Follow-up (PASS — Legacy Runtime Config Cutover Dry Run)

**Gate:** P5-E.9E.5I. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `bea85f3` |
| Fixture Matrix | **32/32 PASS** |
| Temporäre Patches revertiert | **Ja** — Final Runtime **STAGING** |
| Cutover-Delta | Temporäre `isRpcAvailable()`-Erweiterung (revertiert) |
| Legacy RPC-first Search (5H) | **INTACT** |
| Rebuild / Writes / produktiver Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5J** |

**Report:** `docs/architecture/p5-legacy-runtime-cutover-dry-run-report.md`

---

*Dokumentversion: P5-E.9E.5D + 5G + 5H + 5I PASS. Backup-Export only. Keine Secrets. Kein Restore.*
