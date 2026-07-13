# P5-F.2 — Fable S+ Security Retest Checklist

**Companion to:** `p5-fable-splus-retest-handoff.md` + `p5-fable-splus-retest-prompt.md`  
**HEAD:** `8e6a257` · **URL base:** `http://localhost:8080`

---

## Repo status

- [ ] `git status` clean except `qa/e2e-baseline-bmeta.snapshot.json` untracked
- [ ] HEAD at or after `8e6a257` on `main`
- [ ] No staged / unexpected changes
- [ ] No push / deploy / SQL executed

## Handoff docs read

- [ ] `p5-fable-splus-retest-handoff.md`
- [ ] `p5-splus-combined-retest.md`
- [ ] `p5-splus-remediation-plan.md`
- [ ] `p5-release-lock-plan.md`
- [ ] `current-code-gap-notes.md` (P5 sections)
- [ ] `qa/e2e-content-matrix.md` (P5 sections)

## Fixtures (Ctrl+F5 on localhost:8080)

- [ ] Notification — 24/24 PASS
- [ ] Observation RPC — 17/17 PASS
- [ ] Sanitization — 45/45 PASS
- [ ] Release Lock DB — 34/34 PASS
- [ ] Release Lock UI — 30/30 PASS
- [ ] `allPass` true, `failCount` 0, no P5 console errors

## Static checks

- [ ] S+-02: `user_id = auth.uid()` insert policy
- [ ] S+-02: URL safety fail-closed
- [ ] S+-04: ack gate + release assert before posts INSERT
- [ ] S+-03: `BoundLoreContentSafety` in sinks; no raw `cleanContent` sink
- [ ] S+-01: `release_gate` default locked; no client bypass
- [ ] Global: no `service_role` in client
- [ ] Global: no auto-publish / auto-approve runtime action

## Route smoke

- [ ] Homepage, Browse, Search (monster/ogre/XSS)
- [ ] QA Ogre, Staff, Ember posts
- [ ] Invalid slug graceful
- [ ] Create Post lock UX
- [ ] Admin anon Access Denied / login

## Per-finding verdict

| Finding | Repo PASS/PARTIAL/FAIL | Production NOT CLOSED |
|---------|------------------------|----------------------|
| S+-01 Release Lock | | [ ] confirmed NOT CLOSED |
| S+-02 Notification | | [ ] confirmed NOT CLOSED |
| S+-03 Sanitization | | [ ] confirmed NOT CLOSED |
| S+-04 Observation RPC | | [ ] confirmed NOT CLOSED |

## Remaining evidence (document even if PASS)

- [ ] Live-RLS NOT TESTED
- [ ] Live-RPC NOT TESTED
- [ ] Storage enforcement NOT TESTED
- [ ] No server-side sanitizer
- [ ] No stored-content migration
- [ ] Production headers / backup / monitoring NOT TESTED

## Final no-go confirmation

- [ ] S+ repo baseline retest verdict recorded
- [ ] S+ production closure: NOT TESTED / NOT CLOSED
- [ ] Product-Activation-Ready: **FAIL**
- [ ] Public-Launch-Ready: **NO-GO**
- [ ] No production / launch claims made

---

*Checklist version: P5-F.2. Short form for Fable retest execution.*
