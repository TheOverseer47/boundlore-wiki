# P5-E.10B-W5-A1-R4-D3 — Production Direct IPv6 TCP Diagnosis

## 1. Incident Summary

Bounded IPv6 TCP reachability diagnosis for the production direct host on port 5432
(no credentials, no psql, no protocol data). Result: local IPv6 default route missing;
TCP connect was not attempted.

## 2. D2 Result

Production direct host is DNS AAAA-only. General DNS works. IPv6 adapter binding enabled.

## 3. Authorization Boundary

Explicit D3 authorization for DNS + local IPv6 prereq read + one bounded TCP:5432 probe.
No password, SQL, TLS handshake, pooler, or network configuration changes.

## 4. Production Host Identity

Fixed host class `db.<production-ref>.supabase.co`, port 5432. Staging ref blocked.

## 5. DNS AAAA Confirmation

A Answer count: 0. AAAA Answer count: ≥1. Classification: `aaaa-only`.

## 6. Local IPv6 Binding

IPv6 binding active on observed adapters: PASS (`IPV6_BINDING_PASS`).

## 7. Local IPv6 Route

IPv6 default route (`::/0`): **not present**. Class: `IPV6_DEFAULT_ROUTE_MISSING`.
Link-local / other IPv6 routes may exist; default route required for off-link reachability.

## 8. TCP Test Design

IPv6-only `Socket` Stream/Tcp, BeginConnect with 5s timeout, no Send/Receive, no TLS,
immediate close. One attempt per AAAA target; abort after first success.

## 9. Timeout and Attempt Limits

Timeout ≤ 5s per target. Observed: AAAA targets = 1, TCP attempts = 0 (stopped at route check).

## 10. TCP Result

Not executed. Success count = 0.

## 11. Error Classification

`IPV6_DEFAULT_ROUTE_MISSING`

## 12. What the Result Proves

This machine currently lacks an IPv6 default route needed to reach off-link IPv6
destinations, despite AAAA DNS and local IPv6 binding.

## 13. What the Result Does Not Prove

Does not prove password validity, PostgreSQL login, SSL, or release-gate state.
Does not prove the remote port is closed (TCP never attempted).

## 14. Credential Attestation

No password prompt. No credentials used.

## 15. No-Protocol-Data Attestation

No psql, no TLS handshake, no PostgreSQL startup packet, no SQL, no payload bytes.

## 16. Offline QA

`qa/p5-production-ipv6-tcp-diagnosis-check.py` and related offline suites PASS before the
single diagnosis run.

## 17. Safety Preservation

No snapshot runner, storage, Wasabi, VeraCrypt mount, push, or deploy.

## 18. Next Decision Boundary

No automatic D1 or backup retry. Operator must restore local IPv6 default routing, or
separately authorize an officially supported IPv4-compatible Supabase connection path.
No automatic pooler/host switch by the agent.

## 19. Final Decision

`STOP_LOCAL_IPV6_ROUTE_MISSING`
