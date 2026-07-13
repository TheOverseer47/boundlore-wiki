# P5-E.9C Monitoring / Error Tracking Plan

**Gate:** P5-E.9C — Monitoring / Error Tracking Plan (Planung/Abnahme only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `6be960d` — Inventory staging backup evidence before payload testing  
**Verdict:** **PASS** (Planungs-Gate) — Monitoring Evidence bleibt **OPEN**

---

## Executive Verdict

BoundLore hat **keine aktive Monitoring- oder Error-Tracking-Integration** im Repo:

- Kein Sentry, Datadog, LogRocket o.ä.
- Kein globales `window.onerror` / `unhandledrejection`-Capture
- Fehler werden punktuell per `console.error` und `alert()` behandelt
- `BoundLoreReleaseGateClient` fail-closed mit `lastReadError` — aber **nicht** an externes Monitoring gebunden
- Supabase-Dashboard-Alerts **nicht** konfiguriert oder dokumentiert als aktiv
- Kein Incident-Response-Runbook

**Dieser Plan** definiert Monitoring-Scope, Fehlerklassen, Alert-Matrix, Minimal-Pre-Launch vs. Full-Launch-Anforderungen, Privacy-Constraints und Folge-Gates — **ohne** Provider-Aktivierung, SDK-Installation, Keys oder Deploy.

**P5-E.9C.2** (Local Error Capture Stub) — **PASS** — `js/error-reporter.js` + QA-Fixture 21/21.

---

## Working Tree / No-Apply-Bestätigung

| Prüfung | Ergebnis |
|---------|----------|
| HEAD (Start) | `6be960d` |
| Monitoring-Provider aktiviert | **Nein** |
| SDKs installiert | **Nein** |
| Keys erzeugt / committed | **Nein** |
| `.env*` geändert | **Nein** |
| SQL Apply / DB-Write | **Nein** |
| Storage-Apply | **Nein** |
| Push / Deploy / Launch / Production | **Nein** |
| boundlore.com | **Nicht verwendet** |
| Secrets in diesem Dokument | **Nein** |

---

## Current Status

| Dimension | Status |
|-----------|--------|
| **Monitoring Evidence** | **LOCAL_STUB_PASS** |
| **Monitoring Local Stub** | **PASS** (21/21) |
| **Error Tracking** | **OPEN** — keine Provider-Integration |
| **Error Tracking** | **OPEN** |
| **Alerting** | **OPEN** |
| **Incident Response** | **OPEN** (kein Runbook) |
| **S-08 (Ops)** | **OPEN_BLOCKING** |
| **Production Closure** | **NOT CLOSED** |
| **Product-Activation-Ready** | **FAIL** |
| **Public-Launch-Ready** | **NO-GO** |

---

## Repo-Inventar (read-only)

### Bestehende Fehlerbehandlung im Code

| Datei / Modul | Muster | Monitoring-Hook? |
|---------------|--------|------------------|
| `js/release-gate-client.js` | `lastReadError`, fail-closed `read_error`/`missing_config` | Nein — nur intern |
| `js/create-post.js` | `console.error` bei Submit/Upload-Fehlern | Nein |
| `js/post-detail.js` | `console.error` + `alert` bei RLS/Reaction/Comment | Nein |
| `js/search.js` | `console.error("Search failed")` | Nein |
| `js/support.js` | UI-Status `error` bei Report/Upload | Nein |
| `js/notifications.js` | Silent fail (`return 0` / `{ ok: false }`) | Nein |
| `js/content-safety.js` | Keine Exceptions, kein Logging | N/A |
| `js/auth-nav.js` | `console.error` Ban-Check | Nein |
| `js/homepage-stats.js` | `console.error` Counter-Fallback | Nein |
| `js/supabase-config.js` | Hardcoded Legacy-Ref (Prod-Wiring) | Kein Error-Capture |

### Fehlende globale Hooks

| Hook | Im Repo? |
|------|----------|
| `window.onerror` | **Nein** |
| `unhandledrejection` | **Nein** |
| Sentry/Datadog SDK | **Nein** |
| Structured error envelope | **Nein** |
| Central `BoundLoreErrorReporter` | **Nein** |

### Bestehende Docs-Referenzen

| Dokument | Inhalt |
|----------|--------|
| `p5-runtime-closure-plan.md` §3 | Monitoring-Gap; OPS-1 empfohlen |
| `p5-production-closure-plan.md` | S-08 OPEN_BLOCKING; P5-E.9C Spezifikation |
| `p5-product-activation-gap-review.md` | S-08 + Incident Response BLOCKING |

---

## Monitoring Scope Matrix

| Bereich | Signal | Warum wichtig | Minimal Pre-Launch | Full Launch | Alert nötig? | Provider/Tool später | Freigabe nötig? |
|---------|--------|---------------|---------------------|-------------|--------------|----------------------|-----------------|
| **Frontend Runtime Errors** | `window.onerror`, uncaught exceptions | Unbemerkte UI-Brüche vor Launch | JS-Capture-Stub + manuelles Log | Vollständiges Error-Tracking | **Ja** | Sentry / OpenTelemetry Browser | **Ja** (9C.3+) |
| **Unhandled Promise Rejections** | `unhandledrejection` | Async-Fehler (Supabase-Calls) unsichtbar | Stub-Capture | SDK + Aggregation | **Ja** | Wie oben | **Ja** |
| **Release Gate State / Lock Drift** | `locked`/`known`/`source` aus `release-gate-client.js` | S+-01 — unerwartetes Unlock = kritisch | Täglicher Smoke + `getDiagnostics()` | Alert bei `locked=false` ohne Audit | **Ja** | Custom metric + Supabase row watch | **Ja** |
| **Failed Release-Gate Reads** | `lastReadError`, `source=read_error` | Fail-closed maskiert DB-Ausfälle | Smoke-Check + Console-Klassifikation | Alert bei Spike | **Ja** | Client event + Supabase health | **Ja** |
| **Supabase Auth Errors** | 401/403, session refresh fail | Login/Session-Brüche | Manueller Auth-Smoke | Auth-error rate alert | **Ja** | Supabase Auth logs + client | **Ja** |
| **Supabase RLS Denials** | Policy violation messages (z. B. reactions) | S+-01/02 — stille Sicherheitslücken | QA-Fixture-Regression | RLS-denial spike alert | **Ja** (Launch) | Supabase logs / Logflare | **Ja** |
| **Failed RPC Calls** | `bl_register_observation` errors | S+-04 Gate bypass risk | Staging negative tests | RPC error rate | **Ja** | Supabase RPC logs | **Ja** |
| **Storage Upload while deferred** | `assertCanUploadStorage` blocks | P5-E.8C — Upload-Pfad offen? | Fixture 24/24 + grep | Alert wenn Upload-Call durchkommt | **Ja** | Client event | Nein (lokal testbar) |
| **Sanitizer/XSS Guard Failures** | `sanitizeRichTextHtml` returns empty; CS missing | S+-03 — XSS bei fehlendem CS | Fixture 45/45 + 25/25 runtime mock | Runtime XSS smoke alert | **Ja** | Custom security event | Nein (Fixture) |
| **Notification Guard Rejections** | `assertNotificationInsert` / URL safety block | S+-02 injection | Fixture 24/24 | Foreign-insert attempt alert | **Ja** (Launch) | DB audit + client | **Ja** |
| **Search zero-results / errors** | `Search failed`, 0 results für Kernbegriffe | S-06 Recall-Gap | Manueller Smoke (`monster`) | Recall-Metrik + error rate | Teilweise | Custom + search telemetry | Nein (Smoke) |
| **404 / broken internal links** | Route 404, fehlende Slugs | UX + SEO | Pre-launch link crawl | Uptime-Monitor pro Route | **Ja** (Launch) | UptimeRobot / hosting edge | **Ja** |
| **Admin access denied spikes** | Admin-Panel 403 | Kompromittierungs-Indikator | Manuell | Alert bei Anomalie | **Ja** (Launch) | Access logs | **Ja** |
| **Report/support submissions** | `reports` insert fail / spike | Abuse / Support-Pfad | Support disabled (P5-E.8C) | Abuse-spike alert | Später | DB + client | **Ja** |
| **Backup/restore reminders** | Backup-Alter > Schwellwert | S-07 Ops | Manueller Kalender | Freshness alert | **Ja** | Ops calendar / PagerDuty | **Ja** |
| **Security incident signals** | RLS bypass, XSS execution flag | S+ Critical | Manual incident log | Pager + IR-Runbook | **Ja** | SIEM / manual triage | **Ja** |
| **Performance / Core Web Vitals** | LCP, INP, CLS | Launch UX | Lighthouse manuell | RUM monitoring | Nein (Pre) / **Ja** (Launch) | web-vitals + analytics | **Ja** (Consent) |
| **Uptime / route availability** | HTTP 200 auf Kern-Routen | Site erreichbar | Täglicher Smoke (8080/8081) | Externer Uptime-Check | **Ja** | UptimeRobot / hosting | **Ja** |

---

## Error Classes

| Klasse | ID | Beispiele | Schwere | Pre-Launch sichtbar? | Launch-Alert? |
|--------|-----|-----------|---------|----------------------|---------------|
| **Client Runtime** | E-01 | Uncaught TypeError, render crash | Hoch | **Ja** | **Ja** |
| **Async Rejection** | E-02 | Unhandled Supabase promise | Hoch | **Ja** | **Ja** |
| **Release Gate** | E-03 | `read_error`, unexpected unlock | **Kritisch** | **Ja** | **Ja** |
| **Auth/Session** | E-04 | Ban check fail, session expired | Hoch | **Ja** | **Ja** |
| **RLS/Policy** | E-05 | Reaction blocked by RLS | Hoch | Manuell | **Ja** |
| **RPC Security** | E-06 | Observation RPC denied | Hoch | Fixture | **Ja** |
| **Sanitizer** | E-07 | CS missing → submit blocked | Hoch | Fixture | **Ja** |
| **Storage Deferred** | E-08 | Upload reached while deferred | **Kritisch** | Fixture | **Ja** |
| **Search** | E-09 | Search query fail, recall gap | Mittel | Smoke | Teilweise |
| **Network/API** | E-10 | Supabase 5xx, timeout | Hoch | **Ja** | **Ja** |
| **Admin/Moderation** | E-11 | Admin action fail | Mittel | Manuell | **Ja** |
| **Ops/Backup** | E-12 | Backup stale, restore untested | Hoch | Kalender | **Ja** |

---

## Alert Matrix

| Alert | Trigger (Beispiel) | Kanal (später) | Pre-Launch | Full Launch | Freigabe |
|-------|-------------------|----------------|------------|-------------|----------|
| Site down | Kern-Route ≠ 200 > 5 min | E-Mail / Pager | Manuell | Automatisch | **Ja** |
| JS error spike | > N errors / 15 min | Error-Tracker | Stub only | Automatisch | **Ja** |
| Release gate unknown | `source=read_error` sustained | Ops channel | Täglicher Smoke | Automatisch | **Ja** |
| Unexpected unlock | `locked=false` ohne Audit-Row | **Kritisch** Pager | — | Automatisch | **Ja** |
| RLS denial spike | > threshold / hour | Supabase logs | — | Automatisch | **Ja** |
| Backup stale | > 7 Tage ohne Dump | Ops calendar | Manuell | Automatisch | **Ja** |
| XSS runtime hit | `__boundloreXssRuntimeHit=true` (test) | Security channel | Fixture only | N/A (test) | N/A |

**Alert-Ziel (festgelegt, keine Credentials):** Primär E-Mail an Ops-Verteiler; sekundär optional Slack/Discord-Webhook — **erst in P5-E.9C.3 mit Freigabe**.

---

## Minimal Pre-Launch Monitoring (locked / read-only MVP)

Für **Product Activation** im locked-state reicht **nicht** der heutige Stand. Minimal akzeptabel **nach Implementierung** (P5-E.9C.1 → 9C.2):

| # | Komponente | Beschreibung |
|---|------------|--------------|
| 1 | **Frontend JS Error Capture** | `BoundLoreErrorReporter` Stub — `onerror` + `unhandledrejection` → strukturiertes In-Memory-Log + optional `localStorage` Ring-Buffer (kein Provider) |
| 2 | **Route Uptime Checks** | Tägliche Smoke-Liste: `/`, `/wiki/`, `/search/`, `/wiki/post/`, QA-Fixture-URLs — HTTP 200 |
| 3 | **Release-Gate Visibility** | `BoundLoreReleaseGateClient.getDiagnostics()` in Smoke-Check; `locked=true` erwartet |
| 4 | **Supabase Error Classification** | Client-Hook: Supabase-Response `error` → Klasse E-10/E-05 loggen (ohne PII) |
| 5 | **Security Console Classification** | E-03/E-07/E-08 in Stub kategorisieren |
| 6 | **Manual Incident Log** | `docs/ops/incident-log.md` (Template) — Datum, Klasse, Impact, Maßnahme |
| 7 | **Pre-Launch Smoke Checklist** | Erweiterung `qa/e2e-content-matrix.md` — Monitoring-Smoke vor Deploy |
| 8 | **Alert Destination** | Ops-E-Mail dokumentiert — **keine** Webhook-URL im Repo |

### Darf nicht enthalten (Pre-Launch)

| Verboten | Grund |
|----------|-------|
| Analytics ohne Consent-Konzept | DSGVO |
| User-Content / PII in Logs | Privacy |
| Provider-Keys im Repo | Security |
| Silent Production-Aktivierung | Governance |
| Vollständiges RUM ohne Consent-Banner | DSGVO |

---

## Full Community Launch Monitoring

Zusätzlich zu Minimal — **vor Public Launch**:

| # | Komponente |
|---|------------|
| 1 | Externer Uptime-Monitor (5+ Routen, 1-min interval) |
| 2 | Production Error-Tracking SDK (Sentry o.ä.) mit Source Maps |
| 3 | Supabase Dashboard Alerts (DB errors, Auth anomalies, disk) |
| 4 | RLS-denial + RPC-error Rate Dashboards |
| 5 | Report/abuse submission spike alerts |
| 6 | Upload-abuse alerts (wenn Storage unlocked) |
| 7 | Notification foreign-insert attempt monitoring |
| 8 | Rate-limit Metriken (wenn implementiert) |
| 9 | Moderation queue backlog alert |
| 10 | Backup freshness alert (< 24 h) |
| 11 | Restore drill schedule (quarterly) |
| 12 | Incident escalation contacts + IR-Runbook |
| 13 | Admin action audit weekly review |
| 14 | Core Web Vitals RUM (mit Consent) |

---

## Privacy / PII / GDPR Constraints

| Regel | Detail |
|-------|--------|
| Kein Post-Body in Error-Reports | Nur Hash/Slug-Länge |
| Keine E-Mail/User-ID in Client-Logs | Nur anonyme Session-ID (random, nicht auth.uid) |
| Keine Passwörter/Tokens | Strip vor Log |
| IP-Adressen | Nur wenn Provider DPA vorhanden |
| Consent vor Analytics/RUM | Cookie-Banner oder strictly-necessary only |
| EU-Region | Supabase `eu-central-1` — Provider ebenfalls EU bevorzugen |
| Recht auf Löschung | Error-Tracker Retention ≤ 30 Tage (Ziel) |
| Admin-Audit | `admin_actions` — separater Zugriff, nicht in Client-Logs |

---

## Provider-neutraler Implementierungsplan

| Phase | Gate | Lieferung | Provider-Key? |
|-------|------|-----------|---------------|
| 1 | **P5-E.9C.1** | Provider-Entscheidung — **PASS** — Sentry (EU) primär; siehe `p5-monitoring-provider-decision.md` | **Nein** |
| 2 | **P5-E.9C.2** | `BoundLoreErrorReporter` Stub — lokal, Ring-Buffer, Klassifikation | **Nein** |
| 3 | **P5-E.9C.3** | Staging-Integration mit Provider DSN | **Ja** — STOPP |
| 4 | **P5-E.9C.4** | Production-Verifikation + Alert-Routing | **Ja** — STOPP |
| 5 | Post-Launch | IR-Runbook + Escalation + Quarterly Review | **Ja** |

### Provider-Entscheidung (P5-E.9C.1 — PASS)

Siehe **`p5-monitoring-provider-decision.md`** für vollständige Matrix. Kurz:

| Kandidat | Rolle |
|----------|-------|
| **Sentry (EU)** | **Primär** — Frontend Error Tracking |
| **Supabase Dashboard/Alerts** | DB/Auth/RLS |
| **Better Stack / UptimeRobot** | Uptime (ab 9C.3) |
| **BoundLoreErrorReporter Stub** | Übergang (9C.2) |
| **OpenTelemetry** | Deferred / Exit-Strategie |

---

## Stop Conditions

| # | Bedingung |
|---|-----------|
| 1 | Provider-Keys in Repo committen |
| 2 | Monitoring-SDK ohne P5-E.9C.3 Freigabe auf Staging deployen |
| 3 | Production-Monitoring ohne P5-E.9C.4 Freigabe aktivieren |
| 4 | User-Content/PII in Error-Payloads |
| 5 | S-08 als CLOSED markieren nur mit Plan (ohne Integration) |
| 6 | Analytics ohne Consent auf Production |
| 7 | Silent Aktivierung auf boundlore.com |

---

## Required Future Gates

### P5-E.9C.1 — Monitoring Provider Decision

| Item | Detail |
|------|--------|
| **Ziel** | Toolwahl-Dokument; Kosten; DSGVO; Alert-Kanäle |
| **Erlaubt** | Vergleichs-Matrix; keine Keys |
| **Verboten** | SDK-Install; Deploy |
| **Akzeptanz** | Provider + Kanal dokumentiert |
| **Freigabe** | Nein (Plan only) |

### P5-E.9C.2 — Local Error Capture Stub

| Item | Detail |
|------|--------|
| **Ziel** | `BoundLoreErrorReporter` — `onerror`, `unhandledrejection`, Klassifikation E-01…E-12 |
| **Erlaubt** | Lokale JS-Datei; QA-Fixture für Capture |
| **Verboten** | Provider-Key; Deploy |
| **Akzeptanz** | Stub fängt Testfehler; keine PII |
| **Freigabe** | Nein |

### P5-E.9C.3 — Staging Monitoring Integration

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9C.3 DARF NICHT OHNE EXPLIZITE FREIGABE STARTEN   ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Provider DSN in Staging-Deploy; Alerts an Ops-Kanal |
| **Verboten** | Production; Keys im Repo |
| **Akzeptanz** | Test-Error sichtbar im Provider-Dashboard |
| **Freigabe** | **Ja** |

### P5-E.9C.4 — Production Monitoring Verification

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9C.4 PRODUCTION NUR MIT SEPARATER FREIGABE         ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Production Error-Tracking + Uptime + Supabase Alerts live |
| **Verboten** | Aktivierung ohne Launch-Freigabe |
| **Akzeptanz** | End-to-end Alert-Test dokumentiert |
| **Freigabe** | **Ja** — Launch-Voraussetzung |

### Abhängigkeitskette

```
P5-E.9C (dieses Gate) — Plan                         [PASS]
    ↓
P5-E.9C.1 Provider Decision                          [PASS]
    ↓
P5-E.9C.2 Local Error Capture Stub                   [PASS]
    ↓
P5-E.9C.3 Staging Integration                        [STOPP]
    ↓
P5-E.9C.4 Production Verification                    [STOPP]
```

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9C.1 (Provider Decision)** | **PASS** |
| Monitoring Provider Decision | **DECISION DOCUMENTED** |
| Monitoring Evidence | **LOCAL_STUB_PASS** |
| Monitoring Local Stub | **PASS** |
| Error Tracking | **OPEN** |
| Error Tracking | **OPEN** |
| Alerting | **OPEN** |
| S-08 (Ops) | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

~~**P5-E.9B.2** — Staging Backup Evidence~~ **PASS**

~~**P5-E.9C.1** — Monitoring Provider Decision~~ **PASS** — `p5-monitoring-provider-decision.md`

~~**P5-E.9C.2** — Local Error Capture Stub~~ **PASS** — `js/error-reporter.js` (21/21)

**P5-E.9C.3** — Staging Monitoring Integration (**STOPP**)

Alternativ Ops-Pfad: **P5-E.9A.2** (STOPP) oder **P5-E.9B.3** Restore Drill

Weiterhin: **kein Push, kein Deploy, kein Launch, keine Provider-Keys.**

---

*Dokumentversion: P5-E.9C PASS + P5-E.9C.1 PASS + P5-E.9C.2 PASS. Keine Secrets. Keine Provider-Aktivierung.*
