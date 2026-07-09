# BoundLore Content Architecture Roadmap

Binding sequence from master blueprint. Each milestone ends with E2E cases from `qa/e2e-content-matrix.md`.

---

## P0 — Before Launch

### Scope

1. `entity_subtype` field in BLMETA + browse facets
2. Canonical relation types registry (`js/relations-registry.js`) integrated into merge/render paths
3. CRAFT relation family: `crafted_from`, `crafted_at`, `ingredient_of`
4. Resource Quick-Add with synonym duplicate warning
5. "Add Recipe" contribution intent (always review)
6. Recipe / Sources / Usage widgets on item and resource pages
7. `/wiki/resources/` landing page
8. Evidence-tier badge (at minimum `reported` vs `confirmed`)
9. T3 slug namespaces reserved (inactive routes return clean 404)

### Acceptance Criteria

- [ ] T1, T2, T10, T11 from e2e-content-matrix pass
- [ ] No regression of existing Creature/Item/Biome/Contribution E2E flows
- [ ] No new console errors on core URLs
- [ ] Empty states on all new surfaces
- [ ] No hardcoded QA slugs in production UI code
- [ ] PR checklist items satisfied per change

### E2E Test Cases

| ID | Name |
|----|------|
| T1 | Resource + Usage chain |
| T2 | Recipe relation-first |
| T10 | Empty-state new lists |
| T11 | T3 namespace protection |

### Risks

| Risk | Mitigation |
|------|------------|
| Recipe UI scope creep | Ingredient picker = existing item picker |
| Synonym detection too aggressive | Warn only, never block |
| Registry integration breaks legacy relations | Legacy compatibility map in registry |

### May Stay Generic

- Rarity vocabulary as badge only (no filter)
- No registry pages for status effects yet

---

## P1 — Shortly After Launch (evidence-driven)

### Scope

1. Boss branch in creature wizard + mandatory evidence
2. COMBAT relation family + status effect / damage type registry (admin-curated)
3. NPC + Settlement discovery flows
4. Lore flow with transcript requirement
5. `mentions`, `variant_of` relations
6. Mount promotion intent
7. NPCs / Lore / Recipes browse pages
8. Disputed badges for contradictory facts

### Acceptance Criteria

- [ ] T3, T5, T6, T7, T8, T9 pass
- [ ] Registry not community-extendable for damage types
- [ ] Conflict flow covers weak/resistant contradiction
- [ ] New list pages activate only when ≥N entries (configurable)

### E2E Test Cases

| ID | Name |
|----|------|
| T3 | Boss with mandatory evidence |
| T4 | Dungeon archetype/instance |
| T5 | Mount promotion |
| T6 | NPC + Settlement |
| T7 | Weakness contradiction |
| T8 | Lore with transcript |
| T9 | Status effect registry |

### Risks

| Risk | Mitigation |
|------|------------|
| Empty new list pages | CTAs + deferred list activation |
| Boss definition disputes | Definition text + admin reclassification |

---

## P2 — Later / On Demand

### Scope (each gated by evidence + community demand)

- Quests, economy/prices (with as-of timestamps)
- World events, player bases
- Talent facts on classes
- Map pins on region pages
- Patch versioning (`observed_in_version`)
- Comparison widgets, stat filters

### Trigger

Documented game evidence + repeated community observations describing the system.

### Acceptance

Per-feature mini-plan following this blueprint's Taxonomy Promotion process.

### May Stay Generic

Everything without evidence remains T3 namespace only.
