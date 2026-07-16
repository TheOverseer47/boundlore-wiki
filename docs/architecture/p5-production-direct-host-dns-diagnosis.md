# P5-E.10B-W5-A1-R4-D2 — Production Direct-Host DNS Diagnosis

## 1. Incident Summary

D1 reported `DNS_RESOLUTION_FAILED` with `PSQL_EXIT_CODE=-1` before any password prompt.
D2 investigated DNS-only: the direct host resolves via AAAA Answer records; D1 misfired
because it relied solely on `System.Net.Dns.GetHostAddresses`.

## 2. Previous D1 Result

```
DIAG_HOST_CLASS=production-direct
DIAG_REF_CONFIRMED=true
R4_D1_DIAGNOSIS_FAILED
ERROR_CLASS=DNS_RESOLUTION_FAILED
PSQL_EXIT_CODE=-1
```

## 3. Authorization Boundary

DNS queries and local read-only configuration inspection only. No password, psql, TCP to
database, pooler, storage, Wasabi, VeraCrypt mount, or network configuration changes.

## 4. Production Host Classification

Fixed direct host class: `db.<production-ref>.supabase.co`. Staging ref blocked.

## 5. A Record Result

No A Answer records. Type-A queries returned Authority SOA only (not an address answer).
Aggregated A Answer count: **0**.

## 6. AAAA Record Result

AAAA Answer present. Aggregated AAAA Answer count: **≥1**.

## 7. CNAME Result

No usable CNAME Answer for the direct host (Authority SOA on CNAME query). Count: **0**.

## 8. System.Net.Dns Result

`GetHostAddresses` failed with SocketException (“host unknown”) despite Resolve-DnsName
AAAA answers. IPv4/IPv6 counts from System.Net.Dns: **0 / 0**. Marked
`DNS_RESOLVER_INCONSISTENT` relative to Resolve-DnsName.

## 9. Control Host Results

`supabase.com`, `example.com`, and `cloudflare.com` resolve via Resolve-DnsName and
System.Net.Dns. Local DNS is generally functional; failure mode is host/resolver-specific.

## 10. Local DNS Configuration

Active adapter present; DNS servers configured; OS reports network available.
No configuration changes performed.

## 11. Local IPv6 Binding

IPv6 binding enabled on observed adapters. TCP reachability over IPv6 was **not** tested
in this gate.

## 12. Diagnostic Code Analysis

D1 used only `GetHostAddresses` inside try/catch and mapped any exception to
`DNS_RESOLUTION_FAILED` with exit `-1`, skipping password/psql. That is incorrect when
Resolve-DnsName returns AAAA Answer records (AAAA-only is valid DNS resolution).

## 13. Confirmed Root Cause

Primary DNS state: **DIRECT_HOST_DNS_AAAA_ONLY** / `DIRECT_HOST_IPV6_ONLY`.

Code defect: GetHostAddresses-only check → false `DNS_RESOLUTION_FAILED`.

## 14. Minimal Repair

`Test-BoundLoreProductionReleaseGate.ps1`:

- Resolve-DnsName A/AAAA with Answer-section filtering
- A or AAAA ⇒ DNS success
- AAAA-only ⇒ `DIRECT_HOST_IPV6_ONLY` (not failure)
- `-DnsOnly` mode (no password, no psql)
- retain System.Net.Dns comparison as inconsistency flag only

## 15. Offline QA

`qa/p5-production-release-gate-diagnosis-check.py` covers classification matrix and DnsOnly
behavior. Existing snapshot offline QA remains applicable.

## 16. No-Credential Attestation

No password prompt in D2. No credentials in Git.

## 17. No-Connection Attestation

No psql, no SQL, no TCP database probe, no storage/Wasabi.

## 18. Retry Boundary

No automatic D1 or snapshot retry. New explicit authorization required for a subsequent
database diagnosis (IPv6 path may matter).

## 19. Final Decision

`PASS_DIRECT_HOST_DNS_RESOLVES_RUNNER_CLASSIFICATION_REPAIRED`
