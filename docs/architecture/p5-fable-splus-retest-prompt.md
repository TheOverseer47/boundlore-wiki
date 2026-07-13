# P5-F.2 — Fable S+ Security Retest Prompt (Copy-Paste)

**Verwendung:** Gesamten Inhalt des Abschnitts „Prompt“ unten kopieren und an Fable übergeben.  
**Handoff-Referenz:** `docs/architecture/p5-fable-splus-retest-handoff.md`  
**HEAD zum Handoff-Zeitpunkt:** `8e6a257`

---

## Prompt

```
Du bist ein unabhängiger Security-/Launch-Readiness-Auditor für BoundLore Wiki.

## Auftrag

Führe einen **S+ Security Retest** auf Repository-/lokaler Ebene durch.
Dies ist **kein** vollständiger Launch-Audit, **kein** Product-Activation-Gate und **kein** DB/Staging-Gate.

## Repository

- Pfad: C:\Users\Julius\Documents\GitHub\boundlore-wiki
- Branch: main
- Erwarteter HEAD: 8e6a257 — Document combined S+ security retest
- Working Tree: sauber außer qa/e2e-baseline-bmeta.snapshot.json (untracked, nicht committen)

## Aktueller Stand (vom Team dokumentiert, von dir zu verifizieren)

- P5-A accepted
- P5-B Notification Injection: baseline accepted
- P5-C Observation RPC Gate: baseline accepted
- P5-D HTML Sanitization: baseline accepted
- P5-E Release Gate: baseline accepted
- P5-F.1 Combined S+ Retest: PASS (repo/lokal)
- Foundation-Ready: PASS
- Product-Activation-Ready: FAIL
- Public-Launch-Ready: NO-GO
- S+ production closure: NOT TESTED / NOT CLOSED
- Deployment Freeze: aktiv
- boundlore.com: unangetastet

## Scope — nur diese vier Findings

1. S+-01 Server-side Release Lock
2. S+-02 Notification Injection
3. S+-03 HTML Sanitization / Stored-XSS
4. S+-04 Observation RPC Gate Bypass

## Harte Verbote

- Kein SQL ausführen
- Keine DB-Migration anwenden
- Kein Supabase Deploy
- Keine Supabase Writes
- Keine Datenänderung (keine Posts, Notifications, Queue-Aktionen)
- Kein Approve/Reject/Delete/Repair
- Kein Admin-Unlock/Re-Lock
- Kein Push
- Kein Deploy
- Kein Launch
- Keine Auth-Umgehung
- Keine service_role im Client einführen oder nutzen
- qa/e2e-baseline-bmeta.snapshot.json nicht committen

## URL-Basis

Nur http://localhost:8080 verwenden (nicht 127.0.0.1).

## Pflicht: Dokumente lesen

- docs/architecture/p5-fable-splus-retest-handoff.md (authoritative handoff)
- docs/architecture/p5-splus-combined-retest.md (P5-F.1 Ergebnisse)
- docs/architecture/p5-splus-remediation-plan.md
- docs/architecture/p5-release-lock-plan.md
- docs/architecture/current-code-gap-notes.md
- qa/e2e-content-matrix.md

## Pflicht: Evidence-Dateien prüfen

S+-02:
- supabase/admin_dashboard_notifications.sql
- js/notification-url-safety.js
- js/auth-nav.js
- js/notifications.js
- qa/p5-notification-security-fixtures.html
- qa/p5-notification-security-fixtures.js

S+-04:
- supabase/phase_a_observations_foundation.sql
- qa/p5-observation-rpc-security-fixtures.html
- qa/p5-observation-rpc-security-fixtures.js

S+-03:
- js/content-safety.js
- js/post-detail.js
- js/create-post.js
- js/edit-post.js
- js/avatar-utils.js
- wiki/admin/index.html
- qa/p5-sanitization-security-fixtures.html
- qa/p5-sanitization-security-fixtures.js

S+-01:
- supabase/release_gate_lock.sql
- js/release-gate-client.js
- js/create-post.js
- js/edit-post.js
- js/support.js
- wiki/create-post/index.html
- wiki/edit-post/index.html
- wiki/support/index.html
- wiki/admin/index.html
- qa/p5-release-lock-db-security-fixtures.html
- qa/p5-release-lock-db-security-fixtures.js
- qa/p5-release-lock-ui-fixtures.html
- qa/p5-release-lock-ui-fixtures.js

## Pflicht: Lokale Fixtures ausführen

No-cache Server auf localhost:8080 starten, dann mit Hard Refresh (Ctrl+F5) prüfen:

| Fixture | URL | Erwartung |
|---------|-----|-----------|
| Notification | /qa/p5-notification-security-fixtures.html | 24/24 PASS |
| Observation RPC | /qa/p5-observation-rpc-security-fixtures.html | 17/17 PASS |
| Sanitization | /qa/p5-sanitization-security-fixtures.html | 45/45 PASS |
| Release Lock DB | /qa/p5-release-lock-db-security-fixtures.html | 34/34 PASS |
| Release Lock UI | /qa/p5-release-lock-ui-fixtures.html | 30/30 PASS |

Erwartung: allPass true, failCount 0, keine Console Errors aus P5-Baselines, keine Datenwrites.

## Pflicht: Statische Security-Checks

- Notification: notifications_insert_authenticated → user_id = auth.uid()
- Notification: shouldAllowUnsafeNotificationUrl() fail-closed; keine javascript: URLs
- Observation RPC: user_submission_acks vor Write; bl_assert_can_create_user_content vor posts INSERT
- Sanitization: BoundLoreContentSafety vor innerHTML-Sinks; kein postBody.innerHTML = cleanContent
- Release Lock: release_gate default locked; missing config locked; shouldAllowClientBypass() === false
- Global: kein service_role im Client; kein release-bypass via localStorage/query/localhost
- Global: kein auto-publish/auto-approve als Runtime-Aktion

## Pflicht: Standard-Regression (Route Smoke)

- /
- /wiki/browse/
- /wiki/search/?q=monster (bekannter S-06 Recall-Gap, kein Crash)
- /wiki/search/?q=ogre
- /wiki/search/?q=%3Cimg%20src=x%20onerror=alert(1)%3E
- /wiki/post/?slug=qa-ogre-mage-1103f2
- /wiki/post/?slug=qa-staff-of-fire-2b742628
- /wiki/post/?slug=qa-ember-shard-511160
- /wiki/post/?slug=does-not-exist-99999
- /wiki/create-post/ (Lock UX)
- /wiki/admin/ (anon: Access Denied / Login)

## Verdict-Disziplin

Unterscheide strikt:
- repo baseline accepted (Datei/Fixture/Static-Evidence im Git)
- staged accepted (nur nach P5-E.5+ mit expliziter Freigabe)
- production closed (nur nach angewendetem SQL + Live-Negativtests)
- launch ready (nicht in diesem Retest behaupten)

## Pflicht-Berichtsformat

### Gesamt
- S+ repo baseline retest: PASS / PARTIAL / FAIL
- S+ production closure: NOT TESTED (außer du hast explizit freigegebenes Staging-DB-Apply durchgeführt — dann separat dokumentieren)

### Pro Finding (S+-01, S+-02, S+-03, S+-04)
- Repo-Baseline-Verdict: PASS / PARTIAL / FAIL
- Production Closure: NOT TESTED / NOT CLOSED
- Kurze Begründung + Dateizeilen/Evidence

### Evidence
- Gelesene Dateien
- Ausgeführte Fixtures (URL + Pass-Count)
- Statische Checks (Pass/Fail)
- Regression-Routen (Pass/Fail)
- Console Errors (falls vorhanden)

### Verbleibende Blocker (auch bei PASS auflisten)
- Live-RLS
- Live-RPC
- Storage enforcement (live)
- Kein server-side Sanitizer
- Keine Migration historischer Inhalte
- Production headers
- Backup/restore
- Monitoring
- Auth/admin authenticated journeys

### Final
- Product-Activation-Ready: FAIL (außer du hast neue staged Evidence — dann begründen)
- Public-Launch-Ready: NO-GO

## Explizite Nicht-Behauptungen des Teams (nicht übernehmen ohne eigene Evidence)

- Keine Production Closure
- Kein angewendetes SQL
- Kein funktionierendes Live-RLS/Live-RPC/Storage live
- Kein server-side Sanitizer
- Keine Content-Migration
- Keine Product Activation
- Kein Launch Ready

## Nach deinem Verdict

- Bei PASS (repo): Empfehlung P5-E.5 Staged DB Application nur mit expliziter User-Freigabe
- Bei PARTIAL/FAIL: Rückkehr in betroffenes P5-Subgate (B/C/D/E)
- Kein Push/Deploy/Launch empfehlen ohne LAUNCH-0
```

---

*Prompt version: P5-F.2. Docs-only. No retest executed in handoff gate.*
