# P5 Runtime Closure Plan

**Gate:** P5-E.8D — Runtime Closure Plan (Planung/Review only)  
**Datum:** 2026-07-14  
**HEAD:** `4291075`  
**Bezug:** `p5-product-activation-gap-review.md`  
**Verdict:** **PASS** (Planungsdokument) — keine Runtime-Änderungen in diesem Gate

---

## 1. Zweck

Dieser Plan beschreibt, welche **Runtime-, Ops- und Produkt-Gates** vor **Product Activation** und vor **Public Launch** geschlossen werden müssen — basierend auf dem Stand nach P5-E.8C.

**Nicht in diesem Plan:** SQL Apply, Deploy, Production-Touch, Launch.

---

## 2. Runtime-Gates vor Product Activation

| Priorität | Gate | Ziel | DB-Touch | Aktueller Status |
|-----------|------|------|----------|------------------|
| **P0** | Release Lock locked auf Zielumgebung | Keine User-Writes ohne Admin-Unlock | Staging: applied | **CLOSED** (staging) |
| **P0** | Upload-Pfade disabled | Kein Storage-Upload im locked MVP | Nein | **CLOSED** (P5-E.8C) |
| **P0** | S+-01 Core Writes (Posts + RPC) | Server-side fail-closed | Staging live | **CLOSED** (staging) |
| **P1** | S+-02 Notification RLS | Foreign `user_id` blockiert | Staging live | **CLOSED** (staging) |
| **P1** | S+-04 Observation RPC | Anon/no-ack/locked blockiert | Staging live | **CLOSED** (staging) |
| **P1** | S+-03 Runtime Sanitization | Gespeicherte XSS in App | Staging smoke | **PARTIAL** — Fixture only |
| **P2** | Production Closure Plan | Roadmap Production-Apply | Plan only | **OPEN** → P5-E.9 |
| **P2** | Storage DB Closure | Vor Unlock erforderlich | Staging (später) | **DEFERRED** |
| **P3** | Admin unlock/relock journey | Audit + reason required | Staging test | **NOT TESTED** |

### Product-Activation-Minimum (locked state)

Für **Product Activation im read-only / locked MVP** reicht nach aktuellem Befund:

- P0 + P1 staging CLOSED
- Upload disablement CLOSED
- Storage DB **explizit DEFERRED** und dokumentiert akzeptiert
- S+-03 Runtime als **bekanntes PARTIAL** mit Plan

**Nicht ausreichend für Product Activation heute:** Production Closure, S-07/S-08, S+-03 Runtime ungeprüft.

---

## 3. Monitoring / Error Tracking Gap

| Item | Ist-Zustand | Ziel vor Launch | Launch Blocking? |
|------|-------------|-----------------|-------------------|
| Client Error Tracking (Sentry o.ä.) | **Nicht im Repo** | JS-Fehler + API-Fehler erfassen | **Ja** |
| Server/Edge Monitoring | **Nicht vorhanden** (static site) | Uptime + 5xx wenn Hosting-Edge | **Ja** |
| Supabase Dashboard Alerts | **NOT TESTED** | DB-Fehler, Auth-Anomalien | **Ja** (wenn Supabase prod) |
| Release-Gate-Anomalien | Client fail-closed | Alert wenn Gate unknown locked spike | Nein (nice-to-have) |

**Empfohlener Gate:** **OPS-1** — Monitoring/Error-Tracking Architecture (Plan + Toolwahl, kein Deploy in Gate).

---

## 4. Backup / Restore Evidence Gap

| Item | Ist-Zustand | Ziel vor Launch | Launch Blocking? |
|------|-------------|-----------------|-------------------|
| Staging Backup Dry-Run | **PASS** (P5-STAGING.3) | Tooling nachgewiesen | Nein (Staging only) |
| Production Backup Schedule | **NOT TESTED** | Automatische DB-Backups dokumentiert | **Ja** |
| Restore Drill | **NOT TESTED** | Einmaliger Restore-Nachweis | **Ja** |
| `pre_release_test_data_reset.sql` | Im Repo, **niemals ausführen** ohne Gate | Separater Reset-Window | N/A |

**Empfohlener Gate:** **OPS-2** — Backup/Restore Evidence (Staging restore drill zuerst, dann Production-Plan).

---

## 5. Incident Response Gap

| Item | Ist-Zustand | Ziel vor Launch |
|------|-------------|-----------------|
| Security Incident Runbook | **Fehlt** | Meldeweg, Rollback, Kommunikation |
| Release-Gate Emergency Relock | UI vorbereitet | Dokumentierter Admin-Pfad |
| Datenleck / RLS-Bypass | Kein IR-Doc | Eskalation + Supabase-Support-Pfad |
| Storage Policy Owner-Fehler | Dokumentiert (P5-E.8A) | Support-Ticket-Vorlage |

**Empfohlener Gate:** **OPS-3** — Incident Response Runbook (Docs only).

---

## 6. SEO / Search Gap

| ID | Gap | Evidence | Vor Launch? |
|----|-----|----------|-------------|
| **S-05** | CSR Entity Pages / SEO Shells | Keine prerender/SSR für Entity-URLs | **Ja** |
| **S-06** | Search Recall (`monster` → 0) | Smoke lädt; Recall-Gap bekannt | **Ja** |
| **robots.txt** | Vorhanden (`Allow: /`) | Statisch | Teilweise |
| **sitemap.xml** | Vorhanden | Nur Kategorie-URLs, keine dynamischen Posts/Entities | **Ja** (erweitern) |

**Empfohlener Gate:** **PROD-SEO-1** — Search/SEO Launch Readiness (nach S+ Security Closure).

---

## 7. Security Remaining Gaps

| Finding | Repo | Staging | Production | Vor Unlock? |
|---------|------|---------|------------|-------------|
| S+-01 Release Lock | CLOSED | CLOSED | NOT CLOSED | **Ja** |
| S+-02 Notification | CLOSED | CLOSED | NOT CLOSED | **Ja** |
| S+-03 Sanitization | CLOSED (fixture) | PARTIAL | NOT CLOSED | **Ja** |
| S+-04 Observation RPC | CLOSED | CLOSED | NOT CLOSED | **Ja** |
| Storage DB Policy | DEFERRED | NOT applied | NOT CLOSED | **Ja** |
| Upload Frontend | CLOSED | CLOSED (8C) | NOT deployed | Nein (mit Deploy) |
| `report-screenshots` bucket/policy | NOT IN REPO SQL | Unknown | NOT CLOSED | Nein (Support path disabled) |

---

## 8. Storage Deferred Acceptance Criteria

Storage bleibt **bewusst DEFERRED** für locked MVP, wenn:

1. `STORAGE_UPLOADS_DEFERRED = true` in `release-gate-client.js` (p5-e8c)
2. File-Inputs disabled + Notice sichtbar
3. `assertCanUploadStorage()` blockiert vor jedem Storage-Call
4. `release_gate_storage_policy_deferred.sql` **nicht** angewendet (DB-Layer offen)
5. `discovery-uploads` Bucket auf Staging **fehlt**

**Vor manuellem Release-Gate-Unlock zwingend:**

- Owner-capable Pfad (P5-E.8A.4)
- Bucket provisioning (P5-E.8A.3)
- Policy apply + negativer Upload-Test
- Fixture P5-E.8B (Storage checks von DEFERRED → PASS)

---

## 9. Was vor Launch zwingend ist

| Kategorie | Items |
|-----------|-------|
| **Security Production** | S+-01…04 auf Production angewendet + negative Live-Tests |
| **Storage (wenn Uploads)** | DB-Policy + Bucket + Frontend-Guards konsistent |
| **Runtime** | S+-03 stored-content XSS auf Production/Staging |
| **Ops** | Backup + Restore-Nachweis, Monitoring, Incident Response |
| **Product** | S-05 CSR/SEO, S-06 Search Recall |
| **Process** | Explizite Launch-Freigabe; Release Gate unlock nur mit Reason + Audit |

---

## 10. Was nach Launch vertretbar ist

| Item | Bedingung |
|------|-----------|
| `report-screenshots` vollständige Storage-Policy | Nur wenn Support-Uploads reaktiviert werden |
| `post_reactions` live negative test | Wenn Reactions-Feature launcht |
| Erweiterte SEO (dynamische Sitemap) | Wenn Traffic niedrig startet |
| Server-side HTML sanitizer | Wenn Client-Sanitizer ausreichend bewiesen |

---

## 11. Was bewusst deferred bleibt

| Item | Bis wann |
|------|----------|
| Storage DB Policy | Bis Owner-Pfad + Bucket Gate |
| Storage Fixture PASS (21–22) | Bis P5-E.8A erfolgreich |
| Production Closure | Bis P5-E.9 + explizite Apply-Gates |
| S-05/S-06 vollständige Remediation | Kann parallel zu Security Production, aber vor Public Launch |

---

## 12. Gate-Reihenfolge (empfohlen)

```
P5-E.9 Production Closure Plan (Plan only)
    ↓
S+-03 Runtime XSS Staging Gate
    ↓
OPS-1 Monitoring Plan + OPS-2 Backup/Restore + OPS-3 Incident Response
    ↓
Production Security Apply Gates (separate Freigaben je Finding)
    ↓
P5-E.8A.4 → P5-E.8A.3 → Storage Policy Apply (vor Unlock)
    ↓
PROD-SEO-1 / S-06 Search Gate
    ↓
Product-Activation Re-Review
    ↓
Public Launch Decision (explizite Freigabe)
```

---

## 13. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.8D Runtime Plan** | **PASS** (Dokumentation) |
| Runtime Closure (gesamt) | **OPEN** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

*Dokumentversion: P5-E.8D. Keine Secrets. Kein DB-Zugriff.*
