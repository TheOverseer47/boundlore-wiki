# P5-E.9E.4B — Staging Runtime Config Report

**Gate:** P5-E.9E.4B — Staging Runtime Config. **PASS**.

**HEAD vor Gate:** `e6d488a` — Document staging search verification

**Arbeitsmodus:** Nur lokales Repo. Runtime-Config-Härtung für Staging-Verifikation. Kein SQL Apply. Kein DB-Write. Keine Secrets aus `.env`. Kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4B** | **PASS** |
| **Staging Runtime Config** | **STAGING_RUNTIME_CONFIG_PASS** |
| **P5-E.9E.4 Re-run Readiness** | **READY** (Query-Matrix noch ausstehend) |
| **Search Runtime Evidence** | **FAIL_UNTIL_RERUN** |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** `js/supabase-config.js` zeigt jetzt auf **Staging** `jzzgoiwfbuwiiyvwgwri` mit **öffentlichem Publishable Client Key** (`sb_publishable_*`). Legacy-Ref `ohkoojpzmptdfyowdgog` ist aus der aktiven Runtime entfernt. Config-Guard setzt `STAGING_REF_VERIFIED` bzw. `BLOCKED_LEGACY_REF`. QA-Fixture **21/21 PASS**. `/wiki/search/` lädt ohne Crash mit verifizierter Staging-Ref. **P5-E.9E.4 Re-run** kann die Query-Matrix ausführen.

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `e6d488a` |
| SQL ausführen / SQL Apply | **Nein** |
| DB-Write / Staging Write | **Nein** |
| Supabase-Writes | **Nein** |
| `.env` geöffnet / geändert | **Nein** |
| Storage / Push / Deploy / Launch | **Nein** |
| Legacy-Runtime getestet | **Nein** |
| Production getestet | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4B frei — Staging Runtime Config für lokale Search-Verifikation, nur Staging-Ref `jzzgoiwfbuwiiyvwgwri`, kein Legacy, kein Production, keine Secrets im Repo, kein SQL Apply, kein DB-Write, kein Push, kein Deploy, kein Launch.“

---

## Previous Blocker (P5-E.9E.4)

| Blocker | Status nach 9E.4B |
|---------|-------------------|
| `js/supabase-config.js` → Legacy `ohkoojpzmptdfyowdgog` | **Behoben** → Staging `jzzgoiwfbuwiiyvwgwri` |
| Wiki Search Runtime nicht gegen Staging | **Behoben** (Config) — Query-Matrix in 9E.4 Re-run |

---

## Runtime Config Changes

| Datei | Änderung |
|-------|----------|
| `js/supabase-config.js` | URL → `https://jzzgoiwfbuwiiyvwgwri.supabase.co`; Publishable Key → Staging (`sb_publishable_*`); Guard-Variablen |
| `qa/p5-staging-runtime-config-fixtures.html` | **Neu** — 21 Checks |
| `qa/p5-staging-runtime-config-fixtures.js` | **Neu** — Fixture-Harness |

### Guard-Verhalten

| Variable | Wert bei PASS |
|----------|---------------|
| `window.BOUNDLORE_SUPABASE_PROJECT_REF` | `jzzgoiwfbuwiiyvwgwri` |
| `window.BOUNDLORE_SUPABASE_CONFIG_STATUS` | `STAGING_REF_VERIFIED` |
| `window.BOUNDLORE_SUPABASE_RUNTIME_MODE` | `staging_verification` |

| Verbotener Status | Auslöser |
|-------------------|----------|
| `BLOCKED_LEGACY_REF` | URL enthält `ohkoojpzmptdfyowdgog` |
| `BLOCKED_UNEXPECTED_REF` | URL-Ref weder Staging noch erwartet |

Bei blockiertem Status: `window.supabase = null` (fail-closed), Console-Warning, optional `BoundLoreErrorReporter.captureMessage` ohne Keys.

---

## Staging Ref Verification

| Check | Ergebnis |
|-------|----------|
| Aktive URL-Host-Ref | `jzzgoiwfbuwiiyvwgwri` |
| `BOUNDLORE_SUPABASE_CONFIG_STATUS` | `STAGING_REF_VERIFIED` |
| Fixture Smoke `/wiki/search/` | **PASS** — Seite lädt, Client OK |
| MCP `get_project_url` (vorheriger Gate) | Stimmt mit Config-URL überein |

---

## Legacy Ref Exclusion

| Check | Ergebnis |
|-------|----------|
| Legacy in aktiver `SUPABASE_URL` | **NEIN** |
| Legacy als aktive `BOUNDLORE_SUPABASE_PROJECT_REF` | **NEIN** |
| Legacy nur als `BOUNDLORE_FORBIDDEN_PROJECT_REF` Guard | **JA** |
| `wiki/search/index.html` enthält Legacy-Ref | **NEIN** |

---

## Secret Handling

| Regel | Einhaltung |
|-------|------------|
| Keine `.env` gelesen | **JA** |
| Kein `service_role` / `sb_secret_` | **JA** |
| Key-Typ | **Publishable client key** (`sb_publishable_*`) — öffentlich für Browser-Runtime |
| Key-Quelle | Supabase MCP `get_publishable_keys` (Staging-Projekt) — kein Raten, kein Legacy-Key |
| Vollständiger Key in Reports/Fixture-Output | **NEIN** (redacted) |
| Key in `js/supabase-config.js` | **JA** — gleiches Muster wie vorheriger Legacy-Publishable-Key (Client-Runtime-Standard) |

---

## QA Fixture Results

| Fixture | Ergebnis |
|---------|----------|
| `qa/p5-staging-runtime-config-fixtures.html` | **21/21 PASS** |

Abgedeckt: Ref, Status, Legacy-Ausschluss, Client-Init, Recall-Utils, Script-Reihenfolge in `wiki/search/index.html`, keine Secrets im Output.

---

## Smoke Results

| Seite | Ergebnis |
|-------|----------|
| `/qa/p5-staging-runtime-config-fixtures.html` | **21/21 PASS** |
| `/wiki/search/` | **Lädt ohne Crash** |
| Config auf Search-Seite | `STAGING_REF_VERIFIED`, Ref `jzzgoiwfbuwiiyvwgwri` |
| Search-Queries ausgeführt | **Nein** (außerhalb Scope) |
| Console kritische Errors | **Keine** beobachtet |

---

## Limitations

1. **Publishable Key im Repo** — bewusst als öffentlicher Client-Key (wie zuvor Legacy-Key); kein DB-Secret.
2. **Nur lokale Verifikation** — kein Deploy; Production/Legacy unberührt.
3. **Search Runtime Evidence** — erst nach **P5-E.9E.4 Re-run** Query-Matrix.
4. **DB/FTS** — `search_documents` weiterhin nicht implementiert.

---

## Gate Decision

| Entscheidung | Wert |
|--------------|------|
| **P5-E.9E.4B** | **PASS** |
| **Staging Runtime Config** | **STAGING_RUNTIME_CONFIG_PASS** |
| **P5-E.9E.4 Re-run** | **READY** |
| **Search Runtime Evidence** | **FAIL_UNTIL_RERUN** |

---

## Required Follow-up Gates

| Gate | Status | Freigabe |
|------|--------|----------|
| ~~**P5-E.9E.4B**~~ | **PASS** | — |
| **P5-E.9E.4 Re-run** | **READY** | Nutzerfreigabe für Query-Matrix (bereits erteilt für 9E.4; Re-run empfohlen) |
| **P5-E.9E.4A** | **STOPP** | Backup + Draft-Fixes + Apply-Freigabe |

**Freigabeformulierung (9E.4 Re-run):**
> „Ja, ich gebe P5-E.9E.4 Re-run frei — Staging Search Query Matrix, read-only, kein SQL Apply, kein Staging Write, kein Production, kein Legacy.“

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4B | **PASS** |
| Staging Runtime Config | **STAGING_RUNTIME_CONFIG_PASS** |
| P5-E.9E.4 (vorher) | **BLOCKED** → Re-run **READY** |
| Search Runtime Evidence | **FAIL_UNTIL_RERUN** |
| Search Client Recall | **CLIENT_RECALL_HARDENED** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

*Dokumentversion: P5-E.9E.4B PASS. Kein SQL. Kein DB-Write. Keine .env-Änderung.*
