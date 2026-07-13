# P5-E.9B Backup/Restore Evidence Plan

**Gate:** P5-E.9B — Backup/Restore Evidence Plan (Planung/Abnahme only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `bdb58bc` — Add local runtime XSS evidence fixture  
**Verdict:** **PASS** (Planungs-Gate) — Backup/Restore Evidence bleibt **OPEN**

---

## Executive Verdict

BoundLore hat **Staging-Backup-Tooling** nachgewiesen (P5-STAGING.3: `pg_dump` via Pooler, gitignored Dump), aber **keinen vollständigen Backup-/Restore-Nachweis**:

- Kein dokumentierter **Restore-Drill** (weder Staging noch Production)
- Kein **Production-Backup-Schedule** verifiziert
- Kein **PITR/Snapshot-Inventar** als operativer Runbook-Stand
- Kein **Cleanup-Nachweis** nach kontrollierten Testdaten

**Dieser Plan** definiert Scope, Risiken, Restore-Strategien, Cleanup für spätere S+-03-Staging-Payloads und Folge-Gates — **ohne** Backup, Dump, Restore, SQL Apply oder DB-Write.

**P5-E.9A.2** (Staging Stored XSS Payloads) bleibt **BLOCKED / STOPP**, bis **P5-E.9B.2** (frischer Backup-Nachweis) und Cleanup-Freigabe erfüllt sind.

**P5-E.9B.1** (Staging Backup Inventory) — **PASS** — siehe `p5-staging-backup-inventory.md`.

**Product Activation** und **Public Launch** bleiben **FAIL / NO-GO**.

---

## Working Tree / No-Apply-Bestätigung

| Prüfung | Ergebnis |
|---------|----------|
| HEAD (Start) | `bdb58bc` |
| SQL Apply / DB-Write | **Nein** |
| Storage-Apply | **Nein** |
| Backup erstellt | **Nein** |
| Dump gezogen | **Nein** |
| Restore ausgeführt | **Nein** |
| Gespeicherte Payloads | **Nein** |
| Push / Deploy / Launch / Production | **Nein** |
| boundlore.com | **Nicht verwendet** |
| Legacy-Ref `ohkoojpzmptdfyowdgog` | **Nicht verwendet** |
| `.env*` / `backups/` geöffnet oder committed | **Nein** |
| Secrets in diesem Dokument | **Nein** |

---

## Current Status

| Dimension | Status |
|-----------|--------|
| **Backup Evidence** | **OPEN** — Tooling PASS (P5-STAGING.3); kein operativer Schedule + kein Restore-Nachweis |
| **Restore Evidence** | **OPEN** — kein Drill dokumentiert |
| **Staging Payload Tests (P5-E.9A.2)** | **BLOCKED** — bis P5-E.9B.2 (frischer Backup) + Freigabe |
| **S+-03 Staging Runtime** | **OPEN / STOPP** |
| **S-07 Backup/Restore (Ops)** | **OPEN_BLOCKING** |
| **Production Closure** | **NOT CLOSED** |
| **Product-Activation-Ready** | **FAIL** |
| **Public-Launch-Ready** | **NO-GO** |

---

## Bestehende Referenzen (read-only Review)

| Dokument / Artefakt | Rolle | Evidence-Stand |
|---------------------|-------|----------------|
| `docs/architecture/p5-staging-tooling-backup-dry-run.md` | P5-STAGING.3 — `pg_dump` Staging | **PASS** (Tooling); Dump gitignored |
| `supabase/PRE_RELEASE_RESET_README.md` | Launch-Window Reset-Runbook | Plan only; **niemals** ohne Gate ausführen |
| `supabase/pre_release_reset_dry_run.sql` | Read-only Counts vor Reset | Safe anytime (SELECT only) |
| `supabase/pre_release_test_data_reset.sql` | Destructive Reset (guarded) | **STOPP** — Launch window only |
| `docs/architecture/p5-runtime-closure-plan.md` §4 | Ops-Gap Backup/Restore | **NOT TESTED** (Restore) |
| `docs/architecture/p5-production-closure-plan.md` | S-07 OPEN_BLOCKING | Plan → Drill |
| `docs/architecture/p5-splus03-runtime-xss-evidence-plan.md` | 9A.2 Abhängigkeit P5-E.9B | **BLOCKED** |

---

## Fehlende Nachweise (Gap-Analyse)

| # | Fehlender Nachweis | Schwere | Blockiert |
|---|-------------------|---------|-----------|
| 1 | Staging **Backup-Inventar** (welche Methoden: `pg_dump`, Dashboard Snapshot, PITR) | Hoch | P5-E.9A.2, S-07 | **PASS** (P5-E.9B.1) — frischer Dump weiterhin offen |
| 2 | **Restore-Drill** in isolierter Umgebung | Hoch | S-07, Launch |
| 3 | **RPO/RTO-Ziele** dokumentiert und mit Drill abgeglichen | Mittel | Launch |
| 4 | Production **automatische Backups** verifiziert | Hoch | Launch |
| 5 | **Storage-Objekt-Backup** (`discovery-uploads`, `report-screenshots`) | Mittel | Storage-Unlock, Launch |
| 6 | **Cleanup + Readback** nach kontrollierten Testposts | Hoch | P5-E.9A.2 |
| 7 | `release_gate` / `release_gate_audit` in Backup/Restore-Scope | Mittel | S+-01 Prod-Closure |
| 8 | Auth/Users-Risiko abgegrenzt (kein User-Restore ohne Gate) | Mittel | Alle Write-Gates |

---

## Backup Scope Matrix

| Bereich | Datenklasse | Risiko bei Testdaten | Vor Payload-/Runtime-Test sichern? | Restore-Komplexität | Cleanup möglich? | SQL? | Storage? | Admin? | Explizite Freigabe? |
|---------|-------------|----------------------|-----------------------------------|---------------------|------------------|------|----------|--------|----------------------|
| **posts** | User-Content (HTML, BLMETA) | **Hoch** — XSS-Payloads, Test-Slugs | **Ja** | Mittel (FK-Kaskaden) | Ja (slug-basiert) | Ja | Nein | Nein* | **Ja** |
| **wiki_entities** | Strukturierte Discovery-Daten | Mittel — verknüpft mit Posts | **Ja** | Hoch (Graph) | Teilweise | Ja | Nein | Nein* | **Ja** |
| **wiki_entity_relations** | Graph-Kanten | Mittel — Orphans bei Post-Löschung | **Ja** | Hoch | Teilweise | Ja | Nein | Nein* | **Ja** |
| **wiki_observations** | Observation Records | Mittel — `source_post_id` FK | **Ja** | Mittel | Ja (post-bezogen) | Ja | Nein | Nein* | **Ja** |
| **wiki_observation_entities** | Observation-Entity-Links | Mittel | **Ja** | Mittel | Ja | Ja | Nein | Nein* | **Ja** |
| **wiki_entity_aliases** | Entity-Aliase | Niedrig–Mittel | Empfohlen | Mittel | Ja | Ja | Nein | Nein* | **Ja** |
| **wiki_discovery_evidence** | Discovery-Evidence | Niedrig–Mittel | Empfohlen | Mittel | Ja | Ja | Nein | Nein* | **Ja** |
| **notifications** | User-Benachrichtigungen | Mittel — `target_url` XSS-Vektor | **Ja** | Niedrig | Ja (URL/slug) | Ja | Nein | Nein* | **Ja** |
| **profiles** | User-Profile, Rollen | **Hoch** — echte Identitäten | **Ja** (Snapshot) | Niedrig | **Nein** (nicht löschen) | Ja | Nein | Nein | **Ja** |
| **comments** | Post-Kommentare | Mittel — XSS in Text | **Ja** | Niedrig | Ja (post_id) | Ja | Nein | Nein* | **Ja** |
| **post_reactions** | Reaktionen | Niedrig | Empfohlen | Niedrig | Ja | Ja | Nein | Nein* | **Ja** |
| **reports** | Support-Meldungen | Mittel — Screenshots-Refs | Empfohlen | Mittel | Ja | Ja | Teilweise | Nein* | **Ja** |
| **user_submission_acks** | Tutorial-Gate State | Niedrig | Nein (erhalten) | Niedrig | **Nein** | Ja | Nein | Nein | **Ja** |
| **release_gate** | Lock-Konfiguration | **Hoch** — Security-State | **Ja** | Niedrig | **Nein** (nur Restore) | Ja | Nein | **Ja** | **Ja** |
| **release_gate_audit** | Unlock/Relock Audit | Mittel — Compliance | **Ja** | Niedrig | Append-only | Ja | Nein | **Ja** | **Ja** |
| **admin_actions** | Admin-Audit-Log | Mittel | **Ja** | Niedrig | Append-only | Ja | Nein | **Ja** | **Ja** |
| **wiki_patch_mode** | Patch-Mode Config | Mittel | **Ja** | Niedrig | **Nein** | Ja | Nein | **Ja** | **Ja** |
| **storage: discovery-uploads** | Datei-Uploads | Mittel — fehlt auf Staging | **Ja** (wenn Bucket existiert) | Hoch | Ja (Objekt-Pfad) | Nein | **Ja** | Nein | **Ja** |
| **storage: report-screenshots** | Support-Screenshots | Niedrig (Support disabled) | Später | Mittel | Ja | Nein | **Ja** | Nein | **Ja** |
| **auth.users** (Supabase Auth) | Identitäten, Sessions | **Kritisch** | Snapshot-Pflicht | **Sehr hoch** | **Verboten** ohne Gate | Ja** | Nein | **Ja** | **Ja** |

\* „Admin" = normale Admin-UI-Aktionen; Release-Gate-Änderungen separat.  
\** Auth-Schema nur über Supabase-Dashboard/Backup — kein manuelles SQL auf `auth.*` in Gates.

---

## Restore Scope Matrix

| Umgebung | Akzeptable Restore-Strategie | Nicht akzeptabel | Voraussetzungen | Freigabe |
|----------|------------------------------|------------------|----------------|----------|
| **Staging** | Vollständiger `pg_dump`-Restore in **neues isoliertes** Supabase-Branch-Projekt oder temporären Clone; alternativ Point-in-Time Recovery (PITR) auf Staging | Restore über **Produktions**-Projekt; Restore in **Legacy** `ohkoojpzmptdfyowdgog` | Backup-Inventar (9B.1); dokumentierter Drill-Plan (9B.2) | **Ja** — vor jedem Drill |
| **Staging (Cleanup-only)** | Gezieltes DELETE/soft-delete nur für `qa-splus03-xss-*` Posts + verknüpfte Rows | `pre_release_test_data_reset.sql` ohne Launch-Freigabe | Pre-Cleanup Backup; Dry-run Counts | **Ja** — P5-E.9B.3 |
| **Production** | Supabase automatische Backups + dokumentierter PITR-Prozess; Restore nur in **separates** Recovery-Projekt | Jeder Restore in Live-Production ohne Rollback-Plan | Production Backup Schedule verifiziert; IR-Runbook | **Ja** — P5-E.9B.4 **STOPP** |
| **Lokal (Operator)** | Gitignored `backups/staging/*.sql` — nur für Operator-Review, **nicht** committen | Dump-Inhalte in Docs/Repo | P5-STAGING.3 Runbook | N/A |

### RPO / RTO (Zielwerte — zu verifizieren in Drill)

| Metrik | Staging (Ziel) | Production (Ziel) | Aktuell |
|--------|----------------|-------------------|---------|
| **RPO** (max. Datenverlust) | ≤ 24 h (täglicher Dump) oder PITR-fähig | ≤ 24 h (Supabase Pro PITR) | **NOT DEFINED** |
| **RTO** (max. Wiederherstellungszeit) | ≤ 4 h (manueller Drill) | ≤ 8 h (mit Runbook) | **NOT TESTED** |

---

## Cleanup-Strategie für P5-E.9A.2 (S+-03 Staging Stored Payloads)

**Status:** Nur Plan — **nicht ausgeführt**. Jede Write-/Cleanup-Aktion erfordert separate Nutzerfreigabe.

### Pre-Conditions (alle erforderlich)

| # | Bedingung |
|---|-----------|
| 1 | P5-E.9B.1 **PASS** — Backup-Inventar dokumentiert |
| 2 | Frischer Staging-Backup-Nachweis (Timestamp, Methode, Pfad gitignored) |
| 3 | Explizite Nutzerfreigabe für P5-E.9A.2 |
| 4 | Nur Staging `jzzgoiwfbuwiiyvwgwri` — **kein** Production, **kein** Legacy |
| 5 | Dedizierte Testuser (`p5_e5_user_a@example.com` o.ä.) — **keine** echten Userdaten |

### Testdaten-Regeln

| Regel | Detail |
|-------|--------|
| Slug-Prefix | `qa-splus03-xss-*` (eindeutig, grep-fähig) |
| BLMETA | `content_origin: "test"` + Gate-Tag `splus03_xss_evidence` |
| Payload-Korpus | Subset aus `qa/p5-sanitization-security-fixtures.js` UNSAFE_HTML_CASES |
| Anzahl | Minimal (3–5 Posts), je Surface ein Post |
| Kein boundlore.com | Nur Staging-URL |
| Keine Auth/Admin-Aktionen | Außer authentifizierter Testuser-Create (im Sub-Gate definiert) |

### Cleanup-Skizze (SQL nur als Plan — nicht ausführen)

```sql
-- PLAN ONLY — P5-E.9A.2 Cleanup nach Evidence-Gate
-- Voraussetzung: Backup + Dry-run Counts + explizite Freigabe

-- 1) Identifiziere QA-XSS-Posts
-- SELECT id, slug FROM posts WHERE slug LIKE 'qa-splus03-xss-%';

-- 2) Verknüpfte Rows (analog pre_release_reset_dry_run.sql §6)
-- comments, post_reactions, notifications (target_url), wiki_observations, wiki_entities, wiki_entity_relations

-- 3) Soft-delete bevorzugt (wenn deleted_at/status vorhanden)
-- UPDATE posts SET deleted_at = now(), status = 'archived' WHERE slug LIKE 'qa-splus03-xss-%';

-- 4) Hard-delete nur mit Freigabe + Readback
-- DELETE FROM ... WHERE post_id IN (...);

-- 5) Readback-Verifikation
-- SELECT COUNT(*) FROM posts WHERE slug LIKE 'qa-splus03-xss-%' AND deleted_at IS NULL;
-- Browser: /wiki/post/?slug=qa-splus03-xss-* → "Post not found"
```

### Post-Cleanup Acceptance

| Check | Erwartung |
|-------|-----------|
| QA-Slugs nicht öffentlich erreichbar | 404 / "Post not found" |
| Verknüpfte Rows | Count = 0 (oder soft-archived) |
| `release_gate` State | Unverändert (locked) |
| Keine Orphan-Notifications | `target_url` ohne QA-Slug |
| Audit-Report | `p5-splus03-runtime-xss-staging-evidence-report.md` |

---

## Staging-safe Testdaten-Regeln (allgemein)

| Regel | Detail |
|-------|--------|
| Isolation | Nur dedizierte QA-Slugs und Testuser |
| Erkennbarkeit | BLMETA `content_origin: "test"` |
| Keine Produktionsdaten | Kein Import aus Prod/Legacy |
| Backup vor Write | Immer — gitignored, nicht committen |
| Dry-run vor Cleanup | `pre_release_reset_dry_run.sql` oder gezielte SELECTs |
| Kein Reset-Script | `pre_release_test_data_reset.sql` **verboten** außer Launch-Window |
| Storage | Keine Uploads während Storage DEFERRED (P5-E.8C) |

---

## Production-Verbot

| Aktion | Status |
|--------|--------|
| Production Backup ziehen | Nur mit **P5-E.9B.4** Freigabe |
| Production Restore | **VERBOTEN** ohne separates Gate + IR-Plan |
| Production Payload-Tests | **VERBOTEN** |
| `pre_release_test_data_reset.sql` auf Production | **VERBOTEN** |
| boundlore.com Tests | **VERBOTEN** in allen Gates bis Launch-Freigabe |

---

## Stop Conditions

| # | Bedingung |
|---|-----------|
| 1 | P5-E.9A.2 starten ohne Backup-Inventar (9B.1) |
| 2 | Restore in Live-Production ohne Rollback-Plan |
| 3 | `pre_release_test_data_reset.sql` ohne Launch-Freigabe ausführen |
| 4 | Backup-Dumps committen oder in Docs einbetten |
| 5 | Legacy-Ref `ohkoojpzmptdfyowdgog` für Backup/Restore verwenden |
| 6 | Auth/Users manuell löschen oder importieren |
| 7 | S-07 als CLOSED markieren nur mit Tooling-Dry-Run (ohne Restore-Drill) |
| 8 | Cleanup ohne Readback-Verifikation |

---

## Required Future Gates

### P5-E.9B.1 — Staging Backup Inventory

| Item | Detail |
|------|--------|
| **Ziel** | Read-only Inventar: `pg_dump`, Dashboard Snapshot, PITR, Reset-Skripte, Tooling |
| **Erlaubt** | Docs lesen; `rg`; keine DB-Verbindung |
| **Verboten** | Dump; Restore; SQL; `.env*` öffnen |
| **Akzeptanz** | `p5-staging-backup-inventory.md` mit Inventory Matrix |
| **Freigabe** | Nein (read-only) |
| **Status** | **PASS** |

### P5-E.9B.2 — Staging Backup Evidence

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9B.2 DARF NICHT OHNE EXPLIZITE FREIGABE STARTEN    ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Frischer Backup-/Snapshot-/Dump-Nachweis für Staging |
| **Erlaubt** | `pg_dump` via Pooler **oder** Dashboard Snapshot (mit Freigabe) |
| **Verboten** | Production; Legacy; Dump committen |
| **Akzeptanz** | Timestamp + Größe + Methode dokumentiert |
| **Freigabe** | **Ja** — vor jedem Dump |

### P5-E.9B.3 — Isolated Restore Drill

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9B.3 DARF NICHT OHNE EXPLIZITE FREIGABE STARTEN   ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Restore in isoliertes Branch/Clone-Projekt |
| **Verboten** | Live-Production-Restore; Live-Staging-Overwrite |
| **Akzeptanz** | Restore PASS + Verifikations-Queries; RPO/RTO |
| **Freigabe** | **Ja** — vor Drill |

### P5-E.9B.4 — Staging Cleanup Drill

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9B.4 DARF NICHT OHNE EXPLIZITE FREIGABE STARTEN   ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Cleanup von `qa-splus03-xss-*` nach 9A.2; Readback PASS |
| **Erlaubt** | Gezieltes DELETE/soft-delete nur QA-Slugs |
| **Verboten** | Breiter Reset; Production; Legacy; echte Userdaten |
| **Akzeptanz** | Counts = 0; Slugs unreachable; Backup vorher dokumentiert |
| **Freigabe** | **Ja** — separat von 9A.2 |

### P5-E.9B.5 — Production Backup/Restore Verification

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9B.5 PRODUCTION NUR MIT SEPARATER FREIGABE         ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Production Backup Schedule + Recovery-Drill in isoliertem Projekt |
| **Erlaubt** | Dashboard-Review; PITR-Dokumentation |
| **Verboten** | Restore in Live-Production |
| **Akzeptanz** | Ein erfolgreicher Recovery-Drill dokumentiert |
| **Freigabe** | **Ja** — Launch-Voraussetzung |

### Abhängigkeitskette

```
P5-E.9B (Plan)                              [PASS]
    ↓
P5-E.9B.1 Staging Backup Inventory          [PASS]
    ↓
P5-E.9B.2 Staging Backup Evidence           [STOPP — frischer Dump/Snapshot]
    ↓
P5-E.9A.2 Staging XSS Payload Evidence      [STOPP — braucht 9B.2 + Freigabe]
    ↓
P5-E.9B.4 Staging Cleanup Drill             [STOPP — nach 9A.2]
    ↓
P5-E.9B.3 Isolated Restore Drill            [STOPP — nach 9B.2]
    ↓
P5-E.9B.5 Production Backup/Restore           [STOPP]
```

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9B (Planungs-Gate)** | **PASS** |
| **P5-E.9B.1 (Inventory)** | **PASS** |
| Backup Evidence | **OPEN** |
| Restore Evidence | **OPEN** |
| P5-E.9A.2 Staging Payloads | **BLOCKED** |
| S-07 Backup/Restore | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

**P5-E.9B.2** — Staging Backup Evidence (**STOPP** — frischer Dump/Snapshot)

Alternativ parallel (Plan only): **P5-E.9C** — Monitoring/Error Tracking Plan

**P5-E.9A.2** erst nach **9B.2 PASS** + expliziter Nutzerfreigabe.

Weiterhin: **kein Push, kein Deploy, kein Launch, kein Restore, keine Dumps.**

---

*Dokumentversion: P5-E.9B PASS + P5-E.9B.1 PASS. Keine Secrets. Kein DB-Zugriff.*
