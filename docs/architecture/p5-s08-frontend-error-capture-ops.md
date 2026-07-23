# P5-E.10B-S08-A3 — Frontend Error Capture (Ops / Incident Response)

## Purpose

Local, privacy-safe capture of unexpected browser `error` and
`unhandledrejection` events. Events are POSTed same-origin to
`/api/client-errors` and written only as a fixed, redacted structured
log line in the Cloudflare Pages Function runtime. No external
monitoring vendor. No secret. No Supabase storage.

**S-08 status:** this work implements frontend error capture locally
only. S-08 remains **OPEN** until later gates cover deploy, Function
error alerting, uptime, and Supabase alerting.

## Captured fields (allowlist)

- `schemaVersion`
- `eventType` (`error` | `unhandledrejection`)
- `errorName`
- `sanitizedMessage`
- `routePath` (pathname only)
- `scriptPath` (relative pathname or `external-script`)
- `line`, `column`
- `release` (fixed local marker `s08-a3-v1` until a canonical release id exists)
- `occurredAt` (ISO timestamp)
- optional `sourceCategory` (`frontend` only)

## Explicitly not captured

Full page URL, origin/hostname (except same-origin checks), query string,
URL fragment, cookies, `localStorage` / `sessionStorage`, Authorization
headers, Supabase session, access/refresh tokens, JWTs, service-role keys,
passwords, form/input values, request/response bodies, DOM/HTML,
user id / email / username, private messages, posts, comments, reports,
upload filenames, IP address, full user-agent, arbitrary Promise rejection
object properties, full stack traces.

## Redaction

Client and server both apply the same redaction markers:

- `[EMAIL_REDACTED]`
- `[TOKEN_REDACTED]`
- `[REDACTED]`

Patterns cover emails, Bearer tokens, JWT-like values, `AGE-SECRET-KEY`,
API-key-like assignments (`token`, `secret`, `password`, `apikey`,
`service_role`, `access_token`, `refresh_token`, `session`), Authorization
and Cookie assignments, credentialed URLs, query strings, and fragments.
Redaction is applied repeatedly.

## Endpoint

- Route: `POST /api/client-errors`
- Implementation: `functions/api/client-errors.js`
- Success: `204` with `Cache-Control: no-store`
- Validation rejects wrong method (`405`), content type (`415`), oversized
  body (`413`), bad JSON/schema (`400`), and cross-origin / cross-site
  requests (`403`)

## How to inspect Cloudflare runtime logs (later, after deploy)

1. Open the Cloudflare dashboard for the Pages project that serves BoundLore.
2. Open Workers/Pages logs / real-time logs for the production deployment
   (not preview), after a controlled production activation gate.
3. Filter for structured lines containing `"source":"boundlore-client-error"`.
4. Treat Preview and Production log streams as separate environments.

Do not paste raw log lines into tickets if they unexpectedly contain
sensitive material — redact first.

## Production vs Preview

- Same code path, different Cloudflare environments.
- Never interpret Preview noise as a Production incident.
- Never send test traffic to Production from local QA.

## First response to a new frontend error

1. Confirm the log line matches the allowlisted structure.
2. Note `release`, `routePath`, `scriptPath`, `errorName`, and message.
3. Reproduce locally or on Preview if safe.
4. Decide whether the issue is a release-blocking regression.

## Release-gate judgment

Re-lock / keep the release gate closed when:

- Auth, account, create/edit, moderation, or payment-adjacent flows break
- Errors indicate possible secret or session leakage in user-visible UI
- Error volume indicates a widespread production outage

Otherwise schedule a normal fix without claiming S-08 closed.

## Suspected secret or PII leak

1. Stop further log sharing.
2. Rotate the affected credential if a real secret may have been exposed.
3. Tighten redaction / capture code before any further deploy.
4. Document the incident for the release owner (role, not a named inbox).

## Log spam / abuse

Client guards: per-page event cap, dedupe, minimum send interval, recursion
guard, `credentials: "omit"`, `referrerPolicy: "no-referrer"`.

Server guards: method/content-type/size/schema/origin/`Sec-Fetch-Site`
checks. **There is no durable distributed rate limiter** without an extra
Cloudflare product. This is an intentional baseline limitation.

## Known open S-08 items (not closed by A3)

- No automatic email alert for Pages Function failures yet
- No durable distributed rate limiter yet
- Frontend capture is **not deployed** by this gate
- Uptime monitoring remains open
- Supabase alerting remains open

## Owners

- Implementation / triage: release owner (abstract role)
- Escalation: project maintainer (abstract role)

No personal email or phone numbers are recorded in this document.
