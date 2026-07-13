# P5-E.9C.1 Monitoring Provider Decision

**Gate:** P5-E.9C.1 — Monitoring Provider Decision (Planung/Abnahme only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `4fb07d6` — Document fresh staging backup evidence  
**Verdict:** **PASS** (Entscheidungs-Gate) — Monitoring Evidence bleibt **OPEN**

---

## Executive Verdict

BoundLore erhält eine **dokumentierte, provider-neutrale Monitoring-Entscheidung** ohne technische Integration.

**Empfehlung (Kurz):**

| Phase | Stack |
|-------|-------|
| **Minimal Pre-Launch (locked/read-only)** | `BoundLoreErrorReporter`-Stub + manuelles Incident-Log + Route-Smoke + Release-Gate-Diagnostics |
| **Frontend Errors (ab Staging-Integration)** | **Sentry** (EU-Region, DPA) — primär wegen JS SDK, Source Maps, Security-Event-Klassifikation |
| **Supabase-Signale** | Zunächst **Dashboard/Log Review**; später **Supabase Alerts + Logflare** für RLS/RPC/Auth |
| **Uptime** | **Better Stack** oder **UptimeRobot** — erst nach expliziter Freigabe (P5-E.9C.3+) |
| **Langfristig / Vendor-Exit** | OpenTelemetry-Export als **sekundärer** Pfad — nicht primär für MVP |

**Kein** Tracking/Analytics ohne separates Consent-Konzept. **Keine** Provider-Keys in diesem Gate.

---

## Working Tree / No-Apply-Bestätigung

| Prüfung | Ergebnis |
|---------|----------|
| HEAD (Start) | `4fb07d6` |
| Provider aktiviert | **Nein** |
| SDK installiert | **Nein** |
| Keys erzeugt / committed | **Nein** |
| `.env*` geändert | **Nein** |
| SQL / DB / Storage | **Nein** |
| Push / Deploy / Launch / Production | **Nein** |
| Restore / Payloads | **Nein** |
| Secrets in diesem Dokument | **Nein** |

---

## Current Status

| Dimension | Status |
|-----------|--------|
| **Monitoring Provider Decision** | **DECISION DOCUMENTED** |
| **Monitoring Evidence** | **OPEN** — keine Integration |
| **Error Tracking** | **OPEN** |
| **Alerting** | **OPEN** |
| **S-08 (Ops)** | **OPEN_BLOCKING** |
| **Restore Evidence** | **OPEN** |
| **P5-E.9A.2 Payloads** | **Separate Freigabe** |
| **Production Closure** | **NOT CLOSED** |
| **Product-Activation-Ready** | **FAIL** |
| **Public-Launch-Ready** | **NO-GO** |

---

## Provider Comparison Matrix

Bewertung: **5** = sehr gut, **3** = ausreichend, **1** = schwach, **—** = nicht zutreffend

| Kriterium | Sentry | OpenTelemetry (OTel) | Supabase Logs / Dashboard | UptimeRobot / Better Stack | Manuell (Smoke + Incident-Log) |
|-----------|--------|---------------------|---------------------------|----------------------------|--------------------------------|
| **Frontend Error Capture** | **5** | 4 (mit Collector) | 1 | — | 2 (nur bei manuellem Test) |
| **Unhandled Promise Rejections** | **5** | 4 | 1 | — | 2 |
| **Release-Gate / Security-Klassifikation** | 4 (custom tags) | 4 | 2 | — | 3 (Diagnostics manuell) |
| **Supabase / RLS / RPC-Sichtbarkeit** | 2 (nur Client) | 3 | **5** | — | 2 (Staging-Tests) |
| **Uptime-Monitoring** | 2 (Crons optional) | 2 | 2 | **5** | 3 (Smoke-Checklist) |
| **Privacy / GDPR-Risiko** | 3 (DPA nötig, EU-Region) | 4 (self-host möglich) | 4 (EU-Region) | **5** (minimal PII) | **5** |
| **Setup-Aufwand** | **4** (SDK + DSN) | 2 (Collector, Backend) | **5** (Dashboard) | **5** | **5** |
| **Laufende Kosten** | 3 (Free tier, dann $) | 2 (Infra) | 4 (im Supabase-Plan) | **5** (Free tier) | **5** |
| **Vendor Lock-in** | 3 | **5** (offen) | 4 | 4 | **5** |
| **Pre-Launch (locked MVP)** | 2 (Overkill ohne Stub) | 1 | **4** (Review only) | 3 | **5** |
| **Full Community Launch** | **5** | 4 | **4** (DB layer) | **5** (Uptime) | 1 (nicht skalierbar) |

### Gesamtbewertung nach Einsatz

| Einsatz | Empfehlung | Begründung |
|---------|------------|------------|
| **Sofort (ohne Keys)** | Manuell + Stub (9C.2) | Null Kosten, null PII-Risiko, sofort umsetzbar |
| **Staging Error-Tracking** | **Sentry** | Beste JS-Story; EU-DPA; bewährte Alerts |
| **DB/Auth/RLS** | **Supabase Dashboard + später Alerts** | Nativ; keine Extra-Infra |
| **Uptime** | **Better Stack** oder **UptimeRobot** | Einfach; getrennt von Error-Tracking |
| **Exit-Strategie** | OTel-Export aus Sentry/Custom | Langfristig; nicht MVP-kritisch |

---

## Recommended Minimal Pre-Launch Stack

Für **locked/read-only Pre-Launch** — **ohne** Provider-Keys:

| # | Komponente | Implementierung | Gate |
|---|------------|-----------------|------|
| 1 | **BoundLoreErrorReporter Stub** | `onerror` + `unhandledrejection`; Klassen E-01…E-12; Ring-Buffer | **P5-E.9C.2** |
| 2 | **Manuelles Incident-Log** | `docs/ops/incident-log.md` (Template) | 9C.2 oder parallel |
| 3 | **Route-Smoke-Checklist** | Erweiterung QA-Matrix: `/`, `/wiki/`, `/search/`, Fixtures | Laufend |
| 4 | **Release-Gate-Diagnostics** | `BoundLoreReleaseGateClient.getDiagnostics()` in Smoke | Laufend |
| 5 | **Supabase Log Review** | Wöchentlich Dashboard (Staging) — manuell | Ops |
| 6 | **Backup-Freshness-Reminder** | Kalender nach P5-E.9B.2 Dump | Ops |

**Nicht** in Minimal-Stack: Externes Uptime-Monitoring, Sentry DSN, Analytics/RUM, PagerDuty.

---

## Recommended Full Launch Stack

| Layer | Tool | Zweck | Freigabe-Gate |
|-------|------|-------|---------------|
| **Client Errors** | Sentry (EU) | JS errors, promise rejections, release-gate tags | P5-E.9C.3 → 9C.4 |
| **Uptime** | Better Stack oder UptimeRobot | 5+ Routen, 1-min interval | P5-E.9C.3+ |
| **DB/Auth/RLS** | Supabase Dashboard Alerts + Logflare | RPC errors, auth anomalies, disk | P5-E.9C.3+ |
| **Security Events** | Sentry custom events + Fixture-Regression | E-07/E-08 storage/sanitizer | 9C.2 + Fixtures |
| **Backup Freshness** | Ops-Alert (Kalender → später automatisieren) | S-07 | P5-E.9B.3+ |
| **Incident Response** | IR-Runbook + E-Mail/Slack Escalation | Ops | P5-E.9C.4+ |
| **CWV / RUM** | web-vitals + Consent-Banner | Launch UX | **Separates Consent-Gate** |

**Explizit ausgeschlossen bis Consent-Gate:** Google Analytics, Mixpanel, Hotjar o.ä.

---

## Privacy / PII / GDPR Guardrails

| Regel | Durchsetzung |
|-------|--------------|
| Kein Post-Body / Comment-Text in Reports | Sentry `beforeSend` scrub |
| Keine `auth.uid()` / E-Mail in Client-Events | Nur anonyme `session_id` (random UUID pro Tab) |
| Keine Tokens/Passwörter | Strip in Reporter + Sentry scrub |
| IP nur mit DPA | Sentry EU + DPA unterzeichnen vor 9C.3 |
| Retention ≤ 30 Tage | Sentry project settings |
| Kein Analytics ohne Consent | Separates Gate vor RUM |
| Admin-Audit (`admin_actions`) | Nicht in Client-Logs — nur DB-Review |
| Supabase Logs | Keine Query-Inhalte mit PII exportieren |

---

## Required Later Secrets / Env Variables

**Nicht in diesem Gate erzeugen.** Dokumentiert für P5-E.9C.3+:

| Variable (Beispiel) | Provider | Wo gespeichert | Gate |
|---------------------|----------|----------------|------|
| `SENTRY_DSN` | Sentry | Hosting env / CI secret — **nicht** im Repo | 9C.3 |
| `SENTRY_ENVIRONMENT` | Sentry | `staging` / `production` | 9C.3 |
| `UPTIME_API_KEY` | Better Stack / UptimeRobot | Hosting secret | 9C.3+ |
| `ALERT_WEBHOOK_URL` | Slack/Discord (optional) | Hosting secret | 9C.3+ |

**BoundLore-Konvention:** Keys nur in Deployment-Umgebung; `.env.staging` / Production-Env **nicht** committen.

---

## Klare Empfehlung

### Entscheidung

| Bereich | Gewählter Ansatz |
|---------|------------------|
| **Frontend Error Tracking** | **Sentry** (EU-Region, Team-Plan oder Developer Free für Staging) |
| **Error-Interface im Code** | **`BoundLoreErrorReporter`** — provider-neutral; Sentry als Backend in 9C.3 |
| **Supabase DB/Auth/RLS** | **Dashboard Review** → **Supabase Alerts** (kein separater Provider für MVP) |
| **Uptime** | **Better Stack** (primär) oder **UptimeRobot** (Fallback) — ab 9C.3 |
| **Übergang bis Integration** | **Manuelles Smoke + Incident-Log** (P5-E.9C.2 Stub) |
| **OpenTelemetry** | **Deferred** — Export-Hook in Reporter vorbereiten, nicht primär implementieren |
| **Analytics/RUM** | **Verboten** bis Consent-Gate |

### Begründung Sentry (primär)

1. BoundLore ist **static CSR** — Client-Errors sind der Haupt-Blindspot
2. `console.error` verteilt — kein zentrales Capture heute
3. Sentry: Source Maps, `unhandledrejection`, Custom Tags für Release-Gate (E-03)
4. EU-Hosting + DPA verfügbar — passt zu Supabase `eu-central-1`
5. Geringerer Ops-Aufwand als self-hosted OTel für kleines Team

### Begründung gegen OTel als Primär

- Höherer Setup-Aufwand (Collector, Backend, Storage)
- Für locked MVP **over-engineered**
- Als **Exit-Strategie** via Reporter-Interface offen halten

---

## Required Later Gates

### P5-E.9C.2 — Local Error Capture Stub

| Item | Detail |
|------|--------|
| **Ziel** | `BoundLoreErrorReporter` — einheitliches Interface; `onerror`/`unhandledrejection` |
| **Provider-Key** | **Nein** |
| **Deploy** | **Nein** |
| **Akzeptanz** | QA-Fixture fängt Testfehler; Klassifikation E-01…E-12 |

### P5-E.9C.3 — Staging Monitoring Integration

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9C.3 DARF NICHT OHNE EXPLIZITE FREIGABE STARTEN   ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Voraussetzungen** | 9C.1 PASS + 9C.2 PASS + Sentry DSN + DPA + `.env` Freigabe |
| **Scope** | Staging only; Sentry EU; optional Uptime-Monitor |
| **Verboten** | Production; Keys im Repo |

### P5-E.9C.4 — Production Monitoring Verification

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9C.4 PRODUCTION NUR MIT SEPARATER FREIGABE         ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Production Sentry + Uptime + Supabase Alerts live |
| **Akzeptanz** | End-to-end Alert-Test dokumentiert |

---

## Stop Conditions

| # | Bedingung |
|---|-----------|
| 1 | Provider-Keys in Repo committen |
| 2 | Sentry SDK ohne 9C.3 Freigabe deployen |
| 3 | Analytics ohne Consent aktivieren |
| 4 | PII in Error-Payloads |
| 5 | S-08 als CLOSED nur mit Decision-Doc (ohne Integration) |
| 6 | Production-Monitoring ohne 9C.4 |

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9C.1** | **PASS** |
| Monitoring Provider Decision | **DECISION DOCUMENTED** |
| Monitoring Evidence | **OPEN** |
| Error Tracking | **OPEN** |
| Alerting | **OPEN** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

**P5-E.9C.2** — Local Error Capture Stub (`BoundLoreErrorReporter` ohne Provider-Key)

Alternativ Ops-Pfad: **P5-E.9A.2** (separate Write-Freigabe) oder **P5-E.9B.3** Restore Drill

Weiterhin: **kein Push, kein Deploy, kein Launch, keine Provider-Keys.**

---

*Dokumentversion: P5-E.9C.1 PASS. Keine Secrets. Keine Provider-Aktivierung.*
