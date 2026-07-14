# P5-E.9E.5B — Production / Legacy Read-only Inventory Report

**Gate:** P5-E.9E.5B — Production / Legacy Read-only Inventory. **PASS** (Read-only).

**HEAD vor Gate:** `89bfdf6` — Plan production legacy cutover

**Arbeitsmodus:** Read-only Inventory gegen Legacy `ohkoojpzmptdfyowdgog`. Kein SQL Apply, kein Write, kein Runtime-Switch, kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5B** | **PASS** (Read-only Inventory) |
| **Inventory Status** | **COMPLETE** |
| **Target Ref** | `ohkoojpzmptdfyowdgog` — verifiziert |
| **Staging Ref used** | **Nein** |
| **Final Target Suitability** | **NEEDS_MIGRATION_DECISION** |
| **Production / Legacy Target Decision** | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** (5C) |
| **S-06 Staging Evidence** | **STAGING_CLOSED** (unverändert) |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **Empfohlener nächster Gate** | **P5-E.9E.5E** — Legacy Profile/RLS Security Hardening |
| **Legacy Fresh Backup Evidence (5D)** | **COMPLETE** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Legacy `ohkoojpzmptdfyowdgog` ist **schema-mäßig kompatibel** mit dem BoundLore-Wiki-Fundament (24 Tabellen, RLS aktiv, `pg_trgm` vorhanden), aber **Search MVP fehlt vollständig** (`search_documents`, `bl_search_public_content`, `bl_rebuild_search_documents` nicht vorhanden). **Kritische Befunde:** `profiles_select_all` mit `qual=true`, **anon SELECT auf `profiles`**, `posts_select_approved` mit Invoker-`profiles`-Subquery (42501-Risiko analog Staging vor 4D). **Content:** nur **9 published** Posts, davon **3 QA-Slugs**; **6 canonical candidates** ohne QA-Muster. **Kein sofortiger Cutover** — Upgrade-Pfad (Option A) ist möglich, erfordert aber RLS/Grant-Härtung, Search Apply, Content-Cleanup und Backup vor jedem Write.

---

## HEAD / Working Tree / Read-only-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `89bfdf6` |
| `.env` geändert / geöffnet | **Nein** (`.env.legacy` **nicht** geöffnet) |
| Verbindungsweg | Supabase MCP `execute_sql` mit explizitem `project_id` |
| SQL Apply / DDL / DML | **Nein** |
| Inserts / Updates / Deletes / Rebuild | **Nein** |
| Runtime-Switch | **Nein** (`js/supabase-config.js` → Staging unverändert) |
| Push / Deploy / Launch | **Nein** |
| Secrets/Backups geöffnet oder committed | **Nein** |
| PII/Content-Dumps in Report | **Nein** (nur Aggregates + max. 5 Slugs) |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5B frei — Production/Legacy Read-only Inventory gegen `ohkoojpzmptdfyowdgog`, read-only only, kein SQL Apply, kein Write, kein Staging-Write, kein Production-Write, kein Legacy-Write, kein Runtime-Switch, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Ziel-Project-Ref** | `ohkoojpzmptdfyowdgog` |
| **Project Name** | TheOverseer47's Project |
| **Region** | `eu-central-1` |
| **Status** | `ACTIVE_HEALTHY` |
| **Postgres** | 17.6.1.141 |
| **Staging Ref** | `jzzgoiwfbuwiiyvwgwri` — **nicht verwendet** |
| **Client Runtime** | `jzzgoiwfbuwiiyvwgwri` — **unverändert** |
| **boundlore.com** | **Nicht getestet** |

**Verifikation:** Supabase Project-Liste bestätigt zwei getrennte Projekte; alle Queries explizit gegen `project_id=ohkoojpzmptdfyowdgog`.

---

## Read-only Guardrails

| Guard | Status |
|-------|--------|
| Query-Kategorien | Nur `SELECT`, `information_schema`, `pg_catalog`, `pg_policies` |
| `BEGIN READ ONLY` | **Getestet** — `READ_ONLY_TX_ACTIVE` |
| Timeouts | MCP-default (kurze Catalog-/Count-Queries) |
| Row-Dumps mit PII | **Vermieden** |
| Inhaltsfelder (`content`, `title` body) | **Nicht exportiert** — nur Aggregates |

---

## Schema Inventory

### Tabellen / Views (`public`)

| Objekt | Typ | RLS |
|--------|-----|-----|
| admin_actions | BASE TABLE | enabled |
| comments | BASE TABLE | enabled |
| homepage_stats | VIEW | — |
| notifications | BASE TABLE | enabled |
| post_reactions | BASE TABLE | enabled |
| posts | BASE TABLE | enabled |
| profiles | BASE TABLE | enabled |
| ratings | BASE TABLE | enabled |
| reports | BASE TABLE | enabled |
| user_submission_acks | BASE TABLE | enabled |
| wiki_category_extensions | BASE TABLE | enabled |
| wiki_discovery_evidence | BASE TABLE | enabled |
| wiki_entities | BASE TABLE | enabled |
| wiki_entity_aliases | BASE TABLE | enabled |
| wiki_entity_claims | BASE TABLE | enabled |
| wiki_entity_history | BASE TABLE | enabled |
| wiki_entity_merge_history | BASE TABLE | enabled |
| wiki_entity_relations | BASE TABLE | enabled |
| wiki_observation_entities | BASE TABLE | enabled |
| wiki_observations | BASE TABLE | enabled |
| wiki_patch_mode | BASE TABLE | enabled |
| wiki_relation_types | BASE TABLE | enabled |
| wiki_schema_versions | BASE TABLE | enabled |
| wiki_submission_statuses | BASE TABLE | enabled |
| wiki_sync_logs | BASE TABLE | enabled |

**Gesamt:** 24 Base Tables, 1 View.

### Extensions

| Extension | Version |
|-----------|---------|
| pg_trgm | 1.6 |
| pgcrypto | 1.3 |
| uuid-ossp | 1.1 |
| pg_stat_statements | 1.11 |
| plpgsql | 1.0 |
| supabase_vault | 0.3.1 |

**Hinweis:** `pg_trgm` vorhanden — kompatibel mit Staging Search-Strategie.

### Search-Objekte (Staging MVP Vergleich)

| Objekt | Legacy | Staging MVP (4A) |
|--------|--------|------------------|
| `search_documents` | **Nicht vorhanden** | Applied |
| `bl_search_public_content` | **Nicht vorhanden** | Applied |
| `bl_rebuild_search_documents` | **Nicht vorhanden** | Applied |
| FTS-Index auf `search_documents` | **N/A** | Applied |
| `release_gate` | **Nicht vorhanden** | Staging (P5-E) |
| `release_gate_audit` | **Nicht vorhanden** | Staging (P5-E) |

### Relevante Public Functions (Auszug)

| Function | Security | Anmerkung |
|----------|----------|-----------|
| bl_register_observation | DEFINER | Vorhanden; EXECUTE nur `authenticated` |
| bl_match_entities | DEFINER | Vorhanden; EXECUTE nur `authenticated` |
| bl_normalize_search_text | INVOKER | Vorhanden (Hilfsfunktion) |
| bl_extract_blmeta_json | INVOKER | Vorhanden |
| is_admin | DEFINER | Vorhanden |
| **bl_search_public_content** | — | **Fehlt** |
| **bl_rebuild_search_documents** | — | **Fehlt** |

---

## Core Table Inventory

| Tabelle | Exists | Row Count | RLS | Anmerkung |
|---------|--------|-----------|-----|-----------|
| posts | **Ja** | 26 | Ja | Kern-Content-Tabelle |
| profiles | **Ja** | 4 | Ja | **Breite SELECT-Policy** |
| comments | **Ja** | 1 | Ja | Gering genutzt |
| reports | **Ja** | 0 | Ja | Leer |
| notifications | **Ja** | 29 | Ja | Moderate Nutzung |
| post_reactions | **Ja** | 3 | Ja | Gering |
| release_gate | **Nein** | — | — | Repo-SQL nicht applied |
| release_gate_audit | **Nein** | — | — | Repo-SQL nicht applied |
| admin_actions | **Ja** | 95 | Ja | Audit-Historie |
| wiki_entities | **Ja** | 14 | Ja | Mehr Entities als published Posts |
| wiki_entity_relations | **Ja** | 6 | Ja | |
| wiki_observations | **Ja** | 2 | Ja | |
| wiki_patch_mode | **Ja** | 1 | Ja | `enabled=false` |

**Posts-Indexe:** `posts_pkey`, `posts_slug_unique_idx`, `idx_posts_canonical_entity`, `idx_posts_submission_status`, `uq_posts_canonical_entity_view`. **Kein** FTS/tsvector-Index auf `posts`.

**Tags-Feld:** `posts` hat **kein** `tags`-Feld — `exclude_public`-Tag-Filter nicht anwendbar auf Legacy-Schema.

---

## Content Counts (`posts`)

| Metrik | Count |
|--------|-------|
| Total | 26 |
| Published (nicht gelöscht) | 9 |
| Pending (nicht gelöscht) | 1 |
| Deleted (`deleted_at IS NOT NULL`) | 16 |
| `Contribution:` Titel | 13 |
| Slugs mit `p5e9e4` | 0 |
| Slugs mit test/fixture/seed/qa-Muster | 15 |
| Published mit QA-Slug-Muster | 3 |
| Published ohne `Contribution:` | 9 |
| Published canonical candidates (ohne QA/test/fixture/seed) | **6** |
| Published entity views (`is_entity_view=true`) | 0 |
| BLMETA/P5E9E in content/title (alle Posts) | 26 |

**Beispiel-Slugs (public-safe, max. 5):** `near-a-campfire-787bbd19`, `ogre-mage-9651e6`, `qa-ember-shard-511160`, `qa-ogre-mage-1103f2`, `qa-staff-of-fire-2b742628`

**Interpretation:** Kleiner, teils QA-kontaminierter published Corpus. BLMETA in allen Posts ist **wahrscheinlich normales Wiki-Metadatenformat** (`bl_extract_blmeta_json` vorhanden) — Rebuild muss public-safe filtern, nicht blind indexieren.

---

## RLS / Policies / Grants Inventory

### Posts SELECT-Policies (kritisch)

| Policy | Rolle | Qual (Kurz) |
|--------|-------|-------------|
| Anyone can view published posts | public | `status=published AND deleted_at IS NULL` |
| posts_select_approved | public | published OR author OR **EXISTS (profiles WHERE admin)** |
| Admins can view all posts | public | admin check |

**42501-Risiko:** `posts_select_approved` nutzt **Invoker-Subquery auf `profiles`** — identisches Muster wie Staging vor P5-E.9E.4D. Anon ohne sicheren Admin-Pfad kann `42501 permission denied for table profiles` auslösen.

### Profiles SELECT-Policies (kritisch)

| Policy | Qual |
|--------|------|
| **profiles_select_all** | **`true`** — alle Zeilen für public role |
| Users can view own profile | own |
| Admins can view all profiles | admin |

### Grants (`anon` / `authenticated`)

| Tabelle | anon | authenticated |
|---------|------|---------------|
| posts | DELETE, INSERT, SELECT, UPDATE, … | voll |
| profiles | **DELETE, INSERT, SELECT, UPDATE, …** | voll |
| comments | voll | voll |
| notifications | REFERENCES, TRIGGER, TRUNCATE only | INSERT, SELECT, UPDATE, … |
| search_documents | — | — (Tabelle fehlt) |

**Kritisch:** `anon` hat **SELECT auf `profiles`** kombiniert mit **`profiles_select_all` (`qual=true`)** → **Public Profile-Leak-Risiko** (PII, Rollen, Metadaten).

**Search-RPC Grants:** Kein EXECUTE auf `bl_search_public_content` / `bl_rebuild_search_documents` (Funktionen fehlen).

---

## Search Object Inventory

| Check | Befund |
|-------|--------|
| `search_documents` Tabelle | **Fehlt** |
| `bl_search_public_content` RPC | **Fehlt** |
| `bl_rebuild_search_documents` | **Fehlt** |
| Direktes anon SELECT auf `search_documents` | **N/A** |
| FTS/tsvector Index | **N/A** |
| Staging-Fassung analog 4A | **Nicht applied** |
| Rebuild ausgeführt | **Nein** (Gate-verboten) |

**Fazit:** Vollständiger Search DB/FTS MVP Apply (5E) erforderlich vor RPC-first Runtime auf Legacy.

---

## Runtime Compatibility Assessment

| Frage | Antwort |
|-------|---------|
| RPC-first `js/search.js` funktionsfähig? | **Nein** — `bl_search_public_content` fehlt |
| Was fehlt? | Search-Tabelle, RPC, Rebuild, FTS-Index, Posts-RLS-Fix, Grant-Härtung |
| Search DB/FTS Apply nötig? | **Ja** (Gate 5E) |
| Posts RLS Dependency Fix nötig? | **Ja** (analog 4D — `is_admin()` statt profiles-Subquery) |
| Content Migration nötig? | **Ja** — Rebuild aus published-only; QA-Slugs ausschließen |
| Runtime Config Guard Update? | **Ja** bei Cutover (5H) — derzeit Staging aktiv |
| Backup vor Apply? | **Ja** — **5D PASS** (433,643 bytes; SHA256 dokumentiert) |

**Aktuelle Runtime:** `js/supabase-config.js` → `jzzgoiwfbuwiiyvwgwri` (Staging). Legacy **nicht** in aktiver Runtime.

---

## Content Migration Assessment

| Frage | Befund |
|-------|--------|
| Genug published Inhalte? | **Gering** — 9 published, 6 canonical candidates |
| Public-safe? | **Teilweise** — 3/9 published haben QA-Slugs |
| BLMETA/Marker-Risiko? | BLMETA in allen Posts (Wiki-Format); Rebuild-Filter Pflicht |
| Canonical Slugs definiert? | **Nein** — Manifest in 5F erforderlich |
| Separater Content-Cleanup? | **Ja** — QA-Slugs, Contributions, deleted/pending ausschließen |
| Rebuild aus published reicht? | **Theoretisch ja**, nach Search Apply + Filter-Contract |

**Offene 5C-Frage:** Ist 6-Post-Corpus ausreichend für Production, oder Content aus anderer Quelle nötig?

---

## Risk Register

| Risiko | Befund | Schwere | Nächster Gate |
|--------|--------|---------|---------------|
| Falscher Final Target | Ref verifiziert `ohkoojpzmptdfyowdgog` | — | 5C Decision |
| Fehlender Backup-Nachweis | ~~Kein frischer Legacy-Backup in 5B~~ — **5D PASS** | — | — |
| Fehlende Search-Objekte | Vollständig absent | **Hoch** | 5E Apply |
| RLS profiles Dependency | `posts_select_approved` → profiles | **Hoch** | 5E (RLS-Fix) |
| Zu breite Profile-Grants | `profiles_select_all=true`, anon SELECT | **Kritisch** | 5E / Security Gate |
| Draft/Pending/QA-Leaks | 3 QA published, 1 pending | **Mittel** | 5F Content |
| BLMETA in Content | 26/26 Posts | **Mittel** | 5F Rebuild-Filter |
| Zu wenig published Content | 6 canonical candidates | **Mittel** | 5C Decision |
| SEO/CSR offen | S-05 OPEN_BLOCKING | **Hoch** | S-05 separat |
| Runtime-Switch-Risiko | Staging aktiv, Legacy unverifiziert | **Hoch** | 5H Dry Run |
| Rollback/Restore | Backup in 5D; Restore separat | **Mittel** | Restore-Gate |
| Release Gate fehlt | `release_gate` absent | **Mittel** | Separates Apply-Gate |

---

## Final Target Suitability

**Klassifikation:** **NEEDS_MIGRATION_DECISION**

| Option | Inventory-Befund |
|--------|------------------|
| **A — Legacy upgraden** | Machbar: Schema vorhanden, 6 canonical posts, `pg_trgm` da. **Aber:** Search Apply, RLS/Grant-Härtung, Content-Cleanup, Backup Pflicht |
| **B — Staging promoten** | Search bewiesen, aber nur Seed-Corpus — **kein** echter Legacy-Content |
| **C — Neuer Production-Ref** | Sauberer Start; Migration aus Legacy nötig wenn Content behalten |
| **D — Content-Migration** | Sinnvoll wenn `profiles_select_all` als Dealbreaker gilt |
| **E — Staging-only** | Status quo bis 5C |

**Keine finale Entscheidung in 5B** — Inventory liefert Evidenz für **P5-E.9E.5C**.

**Tendenz:** Legacy **kann** Final Target werden (**SUITABLE_AFTER_UPGRADE** technisch), aber **profiles_select_all + fehlende Search-Objekte** machen **Upgrade vs. Migration** zur echten 5C-Entscheidung.

---

## Required Future Gates

| Gate | Zweck |
|------|-------|
| **P5-E.9E.5C** | Final Target Decision (Plan-only) |
| **P5-E.9E.5D** | Frischer Backup-Nachweis Legacy |
| **P5-E.9E.5E** | Search DB/FTS + RLS/Grant-Fix Apply |
| **P5-E.9E.5F** | Content Migration / Rebuild |
| **P5-E.9E.5G** | RPC Verification / S-06 Production Evidence |
| **P5-E.9E.5H** | Runtime Cutover Dry Run |
| **P5-E.9E.5I** | S-06 Final Closure |
| **S-05** | SEO/CSR (separat) |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5B | **PASS** |
| P5-E.9E.5D | **PASS** |
| Legacy Fresh Backup Evidence | **COMPLETE** |
| Production / Legacy Inventory | **COMPLETE** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

*Dokumentversion: P5-E.9E.5B PASS + 5C Decision + 5D Backup PASS. Kein Write.*

---

## P5-E.9E.5D Follow-up (PASS)

| Item | Ergebnis |
|------|----------|
| Backup | `backups/legacy/p5-e9e5d-legacy-prewrite-20260714-152031.dump` — 433,643 bytes |
| SHA256 | `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| TOC | **701** entries |
| Restore | **Nein** |
| Nächster Gate | **P5-E.9E.5E** |

**Report:** `docs/architecture/p5-legacy-fresh-backup-evidence-report.md`
