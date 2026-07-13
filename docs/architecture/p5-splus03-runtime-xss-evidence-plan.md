# P5-E.9A S+-03 Runtime XSS Evidence Plan

**Gate:** P5-E.9A — S+-03 Runtime XSS Evidence Plan (Planung/Abnahme only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `e3dca22` — Document production closure plan after runtime gap review  
**HEAD (nach P5-E.9A.1):** siehe Commit `Add local runtime XSS evidence fixture`  
**Verdict:** **PASS** (Planungs-Gate) — S+-03 Runtime bleibt **PARTIAL** (lokale Evidence ergänzt, Staging offen)

---

## Executive Verdict

**S+-03 Repo/Fixture Closure** ist **CLOSED**: `BoundLoreContentSafety` (p5-d1) und die Sanitization-Fixture (45/45 PASS) belegen die zentrale Sanitizer-Policy statisch.

**S+-03 Runtime Closure** bleibt **PARTIAL / OPEN**: Es fehlt der Nachweis, dass **gespeicherte** Post-Inhalte in echten Render-Pfaden (post-detail, browse cards, wiki layout) zur Laufzeit sicher bleiben — insbesondere für Legacy-Inhalte, die vor P5-D existieren könnten.

Dieser Plan definiert:
- XSS-Surface-Matrix (Repo-Stand)
- Sicheren lokalen Evidence-Ansatz (**P5-E.9A.1**)
- Staging-Stored-Payload-Gate mit **STOPP** (**P5-E.9A.2**)
- Acceptance Criteria für vollständige S+-03 Closure

**Kein** Payload-Write, **kein** DB-Zugriff, **kein** Deploy in diesem Gate.

---

## Working Tree / No-Apply-Bestätigung

| Prüfung | Ergebnis |
|---------|----------|
| HEAD | `e3dca22` (Start) |
| `git status --short` | Sauber; untracked: `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| SQL Apply / DB-Write | **Nein** |
| Storage-Apply | **Nein** |
| Gespeicherte XSS-Payloads geschrieben | **Nein** |
| Push / Deploy / Launch / Production | **Nein** |
| Secrets in diesem Dokument | **Nein** |

---

## Status

| Dimension | Status |
|-----------|--------|
| S+-03 Repo/Fixture | **CLOSED** |
| S+-03 Runtime (lokal mock) | **PARTIAL** — P5-E.9A.1 **PASS** (25/25); kein vollständiger Runtime-CLOSED |
| S+-03 Runtime (Staging stored) | **OPEN** — P5-E.9A.2 mit STOPP |
| S+-03 Production | **NOT CLOSED** |
| Production Closure (gesamt) | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

## XSS-Surface-Matrix

| Surface | Datei / Funktion | Sink-Typ | Sanitizer/Guard | Repo-Fixture | Runtime-Beweis | Restrisiko | Nächster Beweis |
|---------|------------------|----------|-----------------|--------------|----------------|------------|-----------------|
| **Post body render** | `post-detail.js` → `renderPost()` → `#postBody.innerHTML` | `innerHTML` | `sanitizePostHtmlPD()` → `BoundLoreContentSafety.sanitizeRichTextHtml` | Ja (45/45 corpus) | **Ja** (9A.1 mock pipeline 6 checks) | Legacy DB content ungetestet | P5-E.9A.2 staging |
| **Wiki entity layout body** | `post-detail.js` → `WikiEntryLayout.render()`; `wiki-entry-layout.js` | `innerHTML` | Eingang bereits `cleanContent` sanitized | Indirekt (safe-html cases) | **Nein** | Layout re-parses HTML lokal | 9A.1 mit wiki layout probe |
| **Structured discovery render** | `post-detail.js` structured branch | `innerHTML` | `sanitizePostHtmlPD` vor Branch | Ja (unsafe cases) | **Nein** | Discovery-spezifische Felder | 9A.2 |
| **Post excerpt / browse card** | `render-posts.js` → `plainText` strip + `escapeHtmlRP()` | `text` in HTML template | Tag-strip + `escapeHtmlRP` | Nein (dediziert) | **Ja** (9A.1 card excerpt probe) | Strip-regex bypass theoretisch | 9A.2 |
| **Guild card + discord iframe** | `render-posts.js` → `extractDiscordWidget` | `iframe src` | `escapeHtmlRP` on src string | Nein | **Nein** | Widget URL validation | 9A.1 URL corpus |
| **Create-post outgoing** | `create-post.js` → `sanitizeOutgoingHtmlCP()` vor INSERT | Quill `innerHTML` → DB | Fail-closed wenn CS fehlt (`null` blockiert submit) | Ja (Quill meta check 44) | **Nein** (kein E2E submit) | Outbound only tested in fixture | 9A.1 outbound mock |
| **Create-post preview overlay** | `create-post.js` overlay `innerHTML` | `innerHTML` | Mix: eigene `escapeHtmlCP` für Labels; Preview-Body? | Teilweise | **Nein** | Preview may show unsanitized quill | 9A.1 preview probe |
| **Edit-post outgoing** | `edit-post.js` → `sanitizeRichTextHtml` | Quill → DB | Fail-closed | Ja | **Nein** | Wie create-post | 9A.1 |
| **Edit-post source_url** | `edit-post.js` → `sanitizeContentUrl` | Meta field | `sanitizeContentUrl` | Ja (unsafe-url cases) | **Nein** | — | 9A.1 |
| **Avatar URL render** | `avatar-utils.js` → `renderAvatar()` | `img src` attr | `sanitizeImageSrc` + `blEscapeAttr` | Indirekt (img src cases 36–37) | **Ja** (9A.1 avatar probe) | Profil-avatar aus DB | 9A.2 |
| **Source URL / external link** | `post-detail.js` → `sanitizeContentUrlPD` | `href` in rendered links | `sanitizeContentUrl` | Ja | **Nein** | Stored `postMeta.source_url` | 9A.2 read existing posts |
| **Attachment / hero URLs** | `post-detail.js` attachment loops | `href`, `img src` | `sanitizeContentUrlPD` | Ja | **Nein** | — | 9A.2 |
| **Notification target_url** | `notifications.js`, `auth-nav.js` | `href` in nav dropdown | `BoundLoreNotificationUrlSafety` + insert guard | Ja (notification fixture 24/24) | **Ja** (9A.1 URL guard probe) | Stored notifications in DB | 9A.2 read-only render |
| **Notification insert** | `notifications.js` → `assertNotificationInsert` | DB write path | Blocks foreign `user_id` + unsafe URL | Ja | Staging PASS (S+-02) | XSS via `message` title? text nodes | 9A.1 message escape check |
| **Admin structured inspector** | `admin-structured-context-inspector.js` | `innerHTML` | **Unklar** — inspector panel | Nein | **Nein** | Admin-only surface | Separate admin gate |
| **BLMETA strip boundary** | `stripPostMetaPD/CP`, `parsePostMeta*` | Comment stripped pre-sanitize | Regex `<!--BLMETA ...-->` | Nein (dediziert) | **Ja** (9A.1 BLMETA probe) | Malformed BLMETA in comment | 9A.2 |
| **BLMETA JSON fields** | `parsePostMetaPD` → meta used in UI | `textContent` / URLs | `source_url` sanitized; titles escaped | Teilweise | **Nein** | JSON injection in meta display | 9A.1 meta display probe |
| **Search query reflected** | `search.js` → `escapeHtml(query)` in empty state | `innerHTML` template | `escapeHtml` / `BoundLoreSearchSignals` | XSS search smoke (manual) | **Ja** (9A.1 + früherer smoke) | Structured search paths | Bereits smoke OK |
| **Search result titles** | `search.js` | `innerHTML` | `escapeHtml` on titles | Nein dediziert | **Nein** | DB-stored titles | 9A.2 |
| **Comments display** | `post-detail.js` → `renderComment` | `innerHTML` | `escapeHtml(c.content)` | Nein | **Nein** | Comment submit sanitization? | 9A.2 |
| **Comment edit textarea** | `post-detail.js` | `innerHTML` + textarea value | `escapeHtml` in textarea | Nein | **Nein** | Update path unsanitized? | Review comment write gate |

### Kurzfassung Matrix

| Kategorie | Anzahl Surfaces | Mit Sanitizer | Mit Fixture | Mit Runtime-Beweis |
|-----------|-----------------|---------------|-------------|-------------------|
| Post render paths | 3 | 3 | 3 (indirekt) | 0 |
| Outbound write paths | 2 | 2 | 2 | 0 |
| URL sinks | 4 | 4 | 4 | 1 (search query only) |
| Notification | 2 | 2 | 2 | 0 (S+-02 staging separat) |
| Card/excerpt | 2 | 2 (escape/strip) | 0 dediziert | 0 |
| BLMETA | 2 | 2 (strip) | 0 dediziert | 0 |

---

## Fixture Evidence Summary

| Fixture | Pfad | Checks | Status | Scope |
|---------|------|--------|--------|-------|
| **P5 Sanitization** | `qa/p5-sanitization-security-fixtures.js` | **45/45 PASS** | **CLOSED** | `BoundLoreContentSafety` — safe/unsafe HTML, unsafe URLs, Quill basics, meta flags |
| **P5 Notification URL** | `qa/p5-notification-security-fixtures.js` | **24/24 PASS** | **CLOSED** (URL policy) | `BoundLoreNotificationUrlSafety` — separater S+-02 Pfad |
| **P5 S+-03 Runtime XSS (local mock)** | `qa/p5-splus03-runtime-xss-fixtures.js` | **25/25 PASS** | **PASS** (lokal) | Mocked post-detail/render-posts/search/avatar/notification pipelines; `__boundloreXssRuntimeHit` bleibt `false` |
| **Release Lock UI** | `qa/p5-release-lock-ui-fixtures.js` | 30/30 | N/A für S+-03 | — |

### Was die Fixture beweist (und was nicht)

| Bewiesen | Nicht bewiesen |
|----------|----------------|
| Sanitizer entfernt `<script>`, `on*`, `javascript:`, `data:` | Gespeicherte Legacy-Posts in `post-detail` |
| DOMParser-Allowlist funktioniert isoliert | Quill → Submit → Read Roundtrip |
| Render-Probe innerHTML nach sanitize sicher | WikiEntryLayout mit echtem DB-HTML |
| URL-Scheme-Policy | Admin inspector innerHTML |
| — | Production-Inhalte |

---

## Runtime Evidence Gap

| Gap | Schwere | Blockiert S+-03 CLOSED? |
|-----|---------|-------------------------|
| Kein post-detail Runtime-Smoke mit XSS-artigem **gespeichertem** HTML | Hoch | **Ja** |
| Kein Roundtrip Create/Edit → Read (ohne DB: mock) | Mittel | **Ja** — 9A.1 deckt nur Sanitizer-Pipeline ab, nicht Quill-Roundtrip |
| Kein Staging-Nachweis für pre-P5-D Content | Hoch | **Ja** für Staging closure |
| Kein Production-Runtime-Nachweis | Hoch | **Ja** für Production closure |
| Admin inspector nicht in Fixture | Mittel | Nein (admin-only, separat) |
| Comment update path nicht reviewed | Mittel | Teilweise |

**Wichtig:** Fixture PASS ≠ Runtime CLOSED. P5-E.9A markiert dies explizit.

---

## P5-E.9A.1 — Local/Mocked Runtime Evidence (PASS)

**Gate:** P5-E.9A.1 — S+-03 Runtime XSS Local/Mocked Evidence  
**Datum:** 2026-07-14  
**HEAD (Start):** `afc3a1f` — Document S+03 runtime XSS evidence plan  
**Verdict:** **PASS** — lokale Evidence; S+-03 Runtime gesamt bleibt **PARTIAL**

### Fixture

| Datei | Beschreibung |
|-------|--------------|
| `qa/p5-splus03-runtime-xss-fixtures.html` | QA-only Seite, nicht in Wiki-Navigation verlinkt |
| `qa/p5-splus03-runtime-xss-fixtures.js` | 25 Checks, kein Supabase, kein DB, kein Login |

### Geladene Produktmodule

- `js/content-safety.js` — `BoundLoreContentSafety`
- `js/notification-url-safety.js` — `BoundLoreNotificationUrlSafety`
- `js/avatar-utils.js` — `renderAvatar()`

`post-detail.js` / `render-posts.js` / `search.js` exportieren ihre Render-Helfer nicht; die Fixture repliziert die dokumentierte Pipeline inline (`stripPostMeta` → `sanitizeRichTextHtml` → DOM-Probe; card excerpt tag-strip + escape; search `escapeHtml`).

### Runtime-Ausführungsflag

`window.__boundloreXssRuntimeHit = false` — Testvektoren versuchen das Flag per `<script>`, `onerror`, `onload`, `onclick`, `javascript:` zu setzen. Nach allen Render-Operationen: **`false (safe)`**.

### Ergebnis (25/25 PASS)

| Kategorie | Checks | Ergebnis |
|-----------|--------|----------|
| Core (CS, NS, renderAvatar, no supabase) | 4 | PASS |
| Post body (script, onerror, svg onload, onclick, javascript href, data img, iframe, safe formatting) | 8 | PASS |
| BLMETA boundary | 1 | PASS |
| URL surfaces (source_url, avatar, notification) | 6 | PASS |
| Search reflected escape | 1 | PASS |
| Card excerpt tag-strip + escape | 1 | PASS |
| Meta (XSS flag, no DB, no storage) | 3 | PASS |

### Lokal bewiesene Surfaces

| Surface | Methode | Status |
|---------|---------|--------|
| Post body render (mocked post-detail pipeline) | Sanitizer + innerHTML DOM probe | **PASS** |
| BLMETA strip + body sanitize | Mock payload mit BLMETA-Kommentar | **PASS** |
| source_url / content URL | `sanitizeContentUrl` | **PASS** |
| Avatar `img src` | `renderAvatar()` | **PASS** |
| Notification `target_url` | `BoundLoreNotificationUrlSafety` | **PASS** |
| Search reflected query | `escapeHtml` replica | **PASS** |
| Browse card excerpt | tag-strip + escape replica | **PASS** |

### Weiterhin Staging/Production Evidence nötig

| Surface | Grund |
|---------|-------|
| Gespeicherte Post-Inhalte (Legacy/pre-P5-D) | Kein DB-Read; nur Mock-Strings |
| WikiEntryLayout mit echtem HTML | Nicht in 9A.1 abgedeckt |
| Create/Edit Quill → Submit → Read Roundtrip | Outbound-only indirekt |
| Create-post preview overlay | Nicht in 9A.1 |
| Stored notification message/title render | Nur URL-Guard, kein DB |
| Search result titles aus DB | Nur reflected query |
| Comments display/update | Nicht in 9A.1 |
| Admin structured inspector | Admin-only, separat |
| Production-Inhalte | P5-E.10+ |

### No-Apply-Bestätigung (P5-E.9A.1)

| Prüfung | Ergebnis |
|---------|----------|
| SQL Apply / DB-Write | **Nein** |
| Storage-Apply | **Nein** |
| Gespeicherte XSS-Payloads | **Nein** |
| Supabase-Initialisierung | **Nein** (`window.supabase` undefined) |
| Push / Deploy / Launch / Production | **Nein** |
| Lokaler Server | `localhost:8081` — Fixture PASS, keine Console-Crashes |

---

## Safe Local Evidence Plan (P5-E.9A.1 — ausgeführt)

### Ziel

Runtime-ähnlicher Nachweis **ohne DB**, **ohne Supabase**, **ohne gespeicherte Posts**.

### Vorgeschlagener Ansatz

| Komponente | Beschreibung |
|------------|--------------|
| **Neue Fixture-Seite** | `qa/p5-splus03-runtime-xss-fixtures.html` + `.js` — **implementiert, 25/25 PASS** |
| **Mock post payloads** | Inline JS-Array mit gefährlichen HTML-Strings — nie in DB geschrieben |
| **Render probes** | Funktionen aus `post-detail.js` / `render-posts.js` **nicht** direkt laden (zu schwer); stattdessen gleiche Sanitizer-Pipeline + simulierte `#postBody.innerHTML` Zuweisung |
| **BLMETA cases** | `<!--BLMETA {"source_url":"javascript:alert(1)"}--><p>test</p>` → strip + sanitize + URL check |
| **Card excerpt probe** | `post.content` mock → tag-strip → `escapeHtmlRP` wie `render-posts.js` |

### Prüfpunkte (Acceptance für 9A.1)

| # | Prüfung | Erwartung |
|---|---------|-----------|
| 1 | `<script>alert(1)</script>` in body | Entfernt; kein Script im DOM nach render |
| 2 | `<img src=x onerror=alert(1)>` | `onerror` entfernt |
| 3 | `<svg onload=alert(1)>` | SVG entfernt |
| 4 | `javascript:` in `href` / `src` | Blockiert |
| 5 | `data:` SVG/img URLs | Blockiert |
| 6 | `<p><strong>Safe</strong></p>` | Erlaubte Formatierung bleibt |
| 7 | BLMETA-Kommentar | Nicht als HTML sichtbar nach strip |
| 8 | `source_url: javascript:...` in Meta | `sanitizeContentUrl` → leer/block |
| 9 | Search `escapeHtml('<img src=x onerror=alert(1)>')` | Escaped, kein HTML execution |
| 10 | `window.supabase` undefined in Fixture | Kein Netzwerk |

### Erlaubt in P5-E.9A.1

- Neue QA-Fixture-Dateien
- Read-only `fetch` von JS-Modulen für grep/static checks
- Lokaler HTTP-Server (8080/8081)

### Verboten in P5-E.9A.1

- Supabase writes
- Staging/Production-Verbindung
- Neue SQL-Dateien ausführen
- Gespeicherte Testposts

---

## Staging Evidence Plan — STOPP (P5-E.9A.2 — nicht ausführen)

### Gate: P5-E.9A.2 — S+-03 Staging Stored Payload Evidence

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9A.2 DARF NICHT OHNE EXPLIZITE FREIGABE STARTEN   ║
╚══════════════════════════════════════════════════════════════════╝
```

| STOPP-Bedingung | Detail |
|-----------------|--------|
| **Explizite Nutzerfreigabe** | Separates Gate — nicht P5-E.9A |
| **Kontrollierte Testdaten** | Dedizierte Testposts mit XSS-Payloads — **DB-Write** |
| **Backup/Cleanup** | P5-E.9B Backup-Plan oder dokumentierte Lösch-Strategie **vor** Write |
| **Keine Production** | Nur Staging `jzzgoiwfbuwiiyvwgwri` |
| **Kein boundlore.com** | — |
| **Keine echten Userdaten** | Nur Testuser; keine Prod-Profile |
| **Kein Launch/Unlock** | Release Gate bleibt locked |
| **Keine Auth/Admin-Aktionen** | Außer explizit im Sub-Gate definiert |

### Geplanter Ablauf (nur Dokumentation)

1. Pre-gate: Backup staging (read-only export) — P5-E.9B Abhängigkeit
2. Create isolated test posts via authenticated test user (explicit approval)
3. Payload corpus: subset of fixture UNSAFE_HTML_CASES (controlled)
4. Read paths: `/wiki/post/?slug=...` — console/DOM inspection, no `alert` execution
5. Cleanup: delete test posts + verify
6. Report: `p5-splus03-runtime-xss-staging-evidence-report.md`

### Alternative ohne DB-Write (bevorzugt zuerst)

**P5-E.9A.1** vollständig PASS **bevor** P5-E.9A.2 diskutiert wird.

---

## Acceptance Criteria — vollständige S+-03 Closure

S+-03 darf **nur** als **CLOSED** markiert werden, wenn **alle** Kriterien erfüllt sind:

| # | Kriterium | Aktuell | Gate |
|---|-----------|---------|------|
| 1 | `BoundLoreContentSafety` p5-d1 im Repo | **PASS** | P5-D (done) |
| 2 | Sanitization fixture 45/45 PASS | **PASS** | P5-D (done) |
| 3 | Outbound create/edit blockiert bei fehlendem CS | **PASS** (code review) | P5-D (done) |
| 4 | Mocked runtime render fixture PASS | **PASS** (25/25) | **P5-E.9A.1** (done) |
| 5 | Staging stored-payload read smoke PASS | **OFFEN** | **P5-E.9A.2** (STOPP) |
| 6 | Production stored-payload read smoke PASS | **OFFEN** | P5-E.10+ |
| 7 | Keine ungehärteten `innerHTML` Sinks auf User-Content ohne Sanitize/Escape | **PARTIAL** (admin inspector) | Review |
| 8 | Dokumentierter Restrisiko-Accept für Admin-only surfaces | **OFFEN** | Admin gate |

**Aktueller S+-03 Status:** Kriterien 1–4 **CLOSED/PASS**; 5–8 **OFFEN** → **PARTIAL** (kein vollständiger CLOSED ohne Staging/Production).

---

## Stop Conditions

| # | Bedingung |
|---|-----------|
| 1 | XSS-Payloads in Staging/Production ohne Freigabe schreiben |
| 2 | P5-E.9A.2 ohne Backup/Cleanup-Plan starten |
| 3 | S+-03 als CLOSED markieren nur mit Fixture-Evidence |
| 4 | Production-Tests ohne P5-E.10 Freigabe |
| 5 | Secrets/Keys in Fixture-Payloads oder Docs |
| 6 | `pre_release_test_data_reset.sql` ausführen |
| 7 | Legacy-Ref `ohkoojpzmptdfyowdgog` verwenden |

---

## Nicht erlaubte Aktionen (P5-E.9A und bis Freigabe)

| Aktion | Verboten |
|--------|----------|
| Neue Sanitizer-Implementierung | In P5-E.9A |
| Stored XSS Payloads schreiben | Bis P5-E.9A.2 Freigabe |
| Staging-Testdaten anlegen | Bis P5-E.9A.2 |
| Production-Tests | Bis P5-E.10+ |
| SQL/DB/Storage Apply | Immer in diesem Gate |
| Push / Deploy / Launch | Immer |

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9A (Planungs-Gate)** | **PASS** |
| **P5-E.9A.1 (lokale Evidence)** | **PASS** |
| S+-03 Repo/Fixture | **CLOSED** |
| S+-03 Runtime (lokal mock) | **PARTIAL** — 25/25 PASS, kein CLOSED |
| S+-03 Runtime (Staging stored) | **OPEN** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

**P5-E.9A.2** — S+-03 Staging Stored Payload Evidence (**STOPP** — explizite Freigabe + Backup erforderlich)

Alternativ parallel (Plan only): **P5-E.9B** Backup/Restore Evidence Plan

Weiterhin: **kein Push, kein Deploy, kein Launch, keine Payloads.**

---

*Dokumentversion: P5-E.9A PASS + P5-E.9A.1 PASS. Keine Secrets. Kein DB-Zugriff.*
