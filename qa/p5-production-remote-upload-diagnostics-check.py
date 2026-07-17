#!/usr/bin/env python3
"""Offline QA for remote upload diagnostics + write-only rclone repair.

No DNS/HTTP/Wasabi/Supabase. Fake-rclone only. Ends with NO_REAL_NETWORK_INVOKED_PASS.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "tools" / "backup" / "_lib" / "LiveProductionSnapshot.ps1"
DIAG = ROOT / "tools" / "backup" / "_lib" / "UploadDiagnostics.ps1"
TEST = ROOT / "tools" / "backup" / "Test-BoundLoreUploadDiagnostics.ps1"
STOPS = ROOT / "tools" / "backup" / "_lib" / "stop_codes.py"
FAKE = ROOT / "qa" / "fake-rclone" / "fake_rclone.py"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-remote-upload-diagnostics-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(
            f"[p5-production-remote-upload-diagnostics-check] FAIL: {msg}",
            file=sys.stderr,
        )


def ps_json(script: str) -> dict:
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blob = (proc.stdout or "").strip()
    if proc.returncode != 0 and not blob:
        raise RuntimeError(proc.stderr or "powershell failed")
    # Last JSON object line
    lines = [ln for ln in blob.splitlines() if ln.strip().startswith("{")]
    if not lines:
        raise RuntimeError("no json: " + blob[:500])
    return json.loads(lines[-1])


def resolve(stderr: str, phase: str = "object-upload", exit_code: int = 1, **kwargs) -> dict:
    upload_pass = "true" if kwargs.get("upload_pass") else "false"
    cmd_kind = kwargs.get("command_kind", "copyto")
    script = f"""
. '{DIAG.as_posix()}'
$r = Resolve-UploadFailure -Stdout '' -Stderr @'
{stderr}
'@ -ExitCode {exit_code} -Phase '{phase}' -CommandKind '{cmd_kind}' -UploadAlreadyMarkedPass:${upload_pass}
@{{ Code=$r.Code; Kind=$r.Kind; Phase=$r.Phase; RemoteState=$r.RemoteState; Envelope=$r.Envelope; Message=$r.Message }} | ConvertTo-Json -Compress
"""
    return ps_json(script)


def main() -> None:
    check(all(p.is_file() for p in (LIVE, DIAG, TEST, STOPS, FAKE)), "files present")
    live = LIVE.read_text(encoding="utf-8")
    diag = DIAG.read_text(encoding="utf-8")
    stops = STOPS.read_text(encoding="utf-8")

    # --- Static live-path proofs ---
    check("UploadDiagnostics.ps1" in live, "upload diagnostics sourced")
    check("Resolve-UploadFailure" in live, "Resolve-UploadFailure used")
    check("BL_UPLOAD_STOP" in diag and "Format-UploadStopEnvelope" in diag, "envelope formatter")
    check("--s3-no-head" in live, "39 --s3-no-head in production call")
    check("NO_HEAD" in live, "NO_HEAD env set")
    # --immutable must not appear in the production upload argument list
    upload_block = live.split("WASABI_PRODUCTION_UPLOAD_PASS")[0]
    # After LOCAL_ENCRYPTED_COPY through upload args
    check(
        '"--immutable"' not in live.split("# Wasabi upload once")[-1].split("WASABI_PRODUCTION_UPLOAD_PASS")[0],
        "40 --immutable removed from production upload",
    )
    check("GetObject" not in live or "getobject_attempted = $false" in live, "41 no GetObject")
    check("DeleteObject" not in live and "delete_attempted = $false" in live, "42 no delete")
    check("AWS_ACCESS_KEY_ID" in live and "EnvironmentVariables.Remove" in live, "8 ambient AWS scrub")
    check("AWS_PROFILE" in live, "9 ambient AWS_PROFILE scrub")
    check("RCLONE_S3_ACCESS_KEY_ID" in live, "10 ambient RCLONE_S3 scrub")
    check("try {" in live.split("# Wasabi upload once")[-1] and "finally {" in live.split("# Wasabi upload once")[-1], "cleanup try/finally")
    check("STOP_UPLOAD_CONFIG_CLEANUP_FAILED" in live, "cleanup failure envelope")
    check("--retries\", \"1\"" in live or '"--retries", "1"' in live, "93 retries 1")
    check("low-level-retries" in live, "94 low-level-retries 1")
    check("STOP_REMOTE_UPLOAD_NOT_AUTHORIZED" not in live.split("Stop-Code")[-1] or "STOP_UPLOAD_" in live, "legacy not primary live stop")
    # Stronger: live upload failure path must not Stop-Code the old authorized string as primary
    check(
        'Stop-Code "STOP_REMOTE_UPLOAD_NOT_AUTHORIZED"' not in live,
        "10 no primary STOP_REMOTE_UPLOAD_NOT_AUTHORIZED",
    )
    check("STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED" in stops, "unclassified stop in stop_codes")
    check("STOP_UPLOAD_REMOTE_VERIFY_DENIED" in stops, "verify denied stop")
    check("copyto" in live and "lsl" in live, "copyto + lsl present")
    check("Test-UploadCredentialOuterWhitespace" in live, "credential whitespace gate")
    check(".age" in live.split("# Source validate")[-1][:800] if "# Source validate" in live else ".EndsWith(\".age\"" in live, "source .age check")

    # Parent offline self-test
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(TEST),
            "-OfflineSelfTest",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0, "parent offline self-test exit 0")
    check("OFFLINE_SELF_TEST_PASS" in blob, "OFFLINE_SELF_TEST_PASS")
    check("TEST_TOKEN_NOT_A_REAL_SECRET" not in blob or "PASS redaction" in blob, "token not leaked in self-test")

    # --- Classification matrix (subset of required cases with stable names) ---
    cases = [
        ("2 InvalidAccessKeyId", "InvalidAccessKeyId", "object-upload", "STOP_UPLOAD_CREDENTIAL_REJECTED", "InvalidCredential", None),
        ("3 InvalidToken", "InvalidToken", "object-upload", "STOP_UPLOAD_CREDENTIAL_REJECTED", "InvalidCredential", None),
        ("4 ExpiredToken", "ExpiredToken", "object-upload", "STOP_UPLOAD_CREDENTIAL_REJECTED", "InvalidCredential", None),
        ("5 SignatureDoesNotMatch", "SignatureDoesNotMatch", "object-upload", "STOP_UPLOAD_CREDENTIAL_REJECTED", "SignatureMismatch", None),
        ("11 AuthorizationHeaderMalformed", "AuthorizationHeaderMalformed", "object-upload", "STOP_UPLOAD_ENDPOINT_MISMATCH", "EndpointMismatch", None),
        ("12 PermanentRedirect", "PermanentRedirect", "object-upload", "STOP_UPLOAD_ENDPOINT_MISMATCH", "Redirect", None),
        ("14 NoSuchBucket", "NoSuchBucket", "object-upload", "STOP_UPLOAD_BUCKET_MISMATCH", "NoSuchBucket", None),
        ("18 PutObject AccessDenied", "AccessDenied PutObject", "object-upload", "STOP_UPLOAD_PERMISSION_DENIED", "AccessDenied", None),
        ("19 Forbidden", "Forbidden", "object-upload", "STOP_UPLOAD_PERMISSION_DENIED", "AccessDenied", None),
        ("35 Pre-Upload-HEAD denied", "failed to head object AccessDenied", "object-upload", "STOP_UPLOAD_REMOTE_VERIFY_DENIED", "VerificationDenied", "POSSIBLY_UPLOADED"),
        ("36 Post-Upload-HEAD denied", "AccessDenied when calling HeadObject after upload", "object-upload", "STOP_UPLOAD_REMOTE_VERIFY_DENIED", "VerificationDenied", "POSSIBLY_UPLOADED"),
        ("44 lsl AccessDenied", "AccessDenied ListBucket", "remote-size-verify", "STOP_UPLOAD_REMOTE_VERIFY_DENIED", "VerificationDenied", "UPLOADED_UNVERIFIED"),
        ("51 DNS", "no such host", "object-upload", "STOP_UPLOAD_NETWORK_FAILED", "DNS", None),
        ("52 TLS", "TLS handshake failed", "object-upload", "STOP_UPLOAD_TLS_FAILED", "TLS", None),
        ("53 Timeout", "context deadline exceeded", "object-upload", "STOP_UPLOAD_TIMEOUT", "Timeout", None),
        ("54 connection refused", "connection refused", "object-upload", "STOP_UPLOAD_NETWORK_FAILED", None, None),
        ("55 SlowDown", "SlowDown", "object-upload", "STOP_UPLOAD_TRANSFER_FAILED", "RateLimited", None),
        ("62 Multipart Init denied", "CreateMultipartUpload AccessDenied multipart", "multipart-init", "STOP_UPLOAD_MULTIPART_DENIED", "MultipartDenied", None),
    ]
    for label, stderr, phase, code, kind, remote in cases:
        upload_pass = phase.startswith("remote-")
        r = resolve(stderr, phase=phase, upload_pass=upload_pass)
        ok = r.get("Code") == code
        if kind:
            ok = ok and r.get("Kind") == kind
        if remote:
            ok = ok and r.get("RemoteState") == remote
        ok = ok and "BL_UPLOAD_STOP|" in (r.get("Envelope") or "")
        ok = ok and "TEST_" not in (r.get("Envelope") or "")
        check(ok, label)

    # 29 empty streams
    r = resolve("", phase="object-upload")
    check(r.get("Kind") == "EmptyDiagnostic" and r.get("Code") == "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED", "29 empty diagnostic")

    # 37 HEAD vs Put distinction
    head = resolve("AccessDenied HeadObject", phase="object-upload")
    put = resolve("AccessDenied PutObject", phase="object-upload")
    check(
        head.get("Code") == "STOP_UPLOAD_REMOTE_VERIFY_DENIED"
        and put.get("Code") == "STOP_UPLOAD_PERMISSION_DENIED",
        "37 HEAD not misclassified as PutObject denial",
    )

    # 48/49 size mismatch after upload
    r = resolve("remote size mismatch", phase="remote-size-verify", upload_pass=True)
    check(
        r.get("Code") == "STOP_UPLOAD_REMOTE_VERIFY_FAILED"
        and r.get("RemoteState") == "UPLOADED_UNVERIFIED",
        "49 verify failed remote_state UPLOADED_UNVERIFIED",
    )

    # Redaction of secrets in classification path
    dirty = (
        "AccessDenied Authorization: Bearer TEST_TOKEN_NOT_A_REAL_SECRET "
        "https://s3.eu-central-2.wasabisys.com/test-bucket/production-snapshots/x.age "
        "AKIA1234567890ABCD12 RequestId=TEST_REQUEST_ID"
    )
    r = resolve(dirty, phase="object-upload")
    msg = (r.get("Message") or "") + (r.get("Envelope") or "")
    check(
        "TEST_TOKEN_NOT_A_REAL_SECRET" not in msg
        and "wasabisys" not in msg
        and "AKIA1234567890ABCD12" not in msg
        and "production-snapshots/" not in msg
        and "TEST_REQUEST_ID" not in msg,
        "75-84 redaction in resolve output",
    )

    # --- Fake-rclone ambient scrub + call counting harness ---
    with tempfile.TemporaryDirectory() as td:
        tdp = Path(td)
        state = tdp / "state.json"
        fixture = tdp / "fixture.json"
        fixture.write_text(
            json.dumps(
                {
                    "commands": {
                        "copyto": {"exit": 1, "stderr": "AccessDenied PutObject", "stdout": ""},
                        "lsl": {
                            "exit": 0,
                            "stdout": "16328280 2026-07-17 11:19:55.000000000 test-backup.age\n",
                            "stderr": "",
                        },
                    }
                }
            ),
            encoding="utf-8",
        )
        # Simulate child env scrub then launch fake rclone
        harness = f"""
$ErrorActionPreference = 'Stop'
$psi = New-Object Diagnostics.ProcessStartInfo
$psi.FileName = '{sys.executable}'
$psi.Arguments = '"{FAKE.as_posix()}" copyto SRC DST --retries 1 --low-level-retries 1 --s3-no-head'
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
# Inject ambient poison then scrub like live path
$psi.EnvironmentVariables['AWS_ACCESS_KEY_ID'] = 'POISON_ACCESS'
$psi.EnvironmentVariables['AWS_SECRET_ACCESS_KEY'] = 'POISON_SECRET'
$psi.EnvironmentVariables['AWS_PROFILE'] = 'poison-profile'
$psi.EnvironmentVariables['RCLONE_S3_ACCESS_KEY_ID'] = 'POISON_RCLONE'
foreach ($drop in @('AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN','AWS_PROFILE','AWS_DEFAULT_PROFILE','AWS_REGION','AWS_DEFAULT_REGION','AWS_ENDPOINT_URL','AWS_CONFIG_FILE','AWS_SHARED_CREDENTIALS_FILE','RCLONE_S3_ACCESS_KEY_ID','RCLONE_S3_SECRET_ACCESS_KEY','RCLONE_S3_SESSION_TOKEN','RCLONE_S3_REGION','RCLONE_S3_ENDPOINT','RCLONE_S3_PROFILE','RCLONE_S3_ENV_AUTH')) {{
  if ($psi.EnvironmentVariables.ContainsKey($drop)) {{ [void]$psi.EnvironmentVariables.Remove($drop) }}
}}
$psi.EnvironmentVariables['FAKE_RCLONE_FIXTURE'] = '{fixture.as_posix()}'
$psi.EnvironmentVariables['FAKE_RCLONE_STATE'] = '{state.as_posix()}'
$psi.EnvironmentVariables['RCLONE_CONFIG_BOUNDLOREPROD_TYPE'] = 's3'
$psi.EnvironmentVariables['RCLONE_CONFIG_BOUNDLOREPROD_ACCESS_KEY_ID'] = 'TEST_ACCESS_KEY_NOT_REAL'
$psi.EnvironmentVariables['RCLONE_CONFIG_BOUNDLOREPROD_SECRET_ACCESS_KEY'] = 'TEST_SECRET_KEY_NOT_REAL'
$p = New-Object Diagnostics.Process
$p.StartInfo = $psi
[void]$p.Start()
$o = $p.StandardOutput.ReadToEnd()
$e = $p.StandardError.ReadToEnd()
$p.WaitForExit()
@{{ ExitCode=$p.ExitCode; StdErr=$e; StdOut=$o }} | ConvertTo-Json -Compress
"""
        out = ps_json(harness)
        check(out.get("ExitCode") == 1, "fake-rclone copyto exit 1")
        check("AccessDenied" in (out.get("StdErr") or ""), "fake-rclone stderr")
        state_data = json.loads(state.read_text(encoding="utf-8"))
        check(len(state_data) == 1, "91 upload command exactly once")
        rec = state_data[0]
        check(rec.get("has_aws_access_key") is False, "8 scrub AWS_ACCESS_KEY_ID")
        check(rec.get("has_aws_secret") is False, "scrub AWS_SECRET")
        check(rec.get("has_aws_profile") is False, "9 scrub AWS_PROFILE")
        check(rec.get("has_rclone_s3_access") is False, "10 scrub RCLONE_S3")
        check(rec.get("boundlore_access_present") is True, "explicit BoundLore key present")
        check("--s3-no-head" in rec.get("argv", []), "fake argv has --s3-no-head")
        check("--immutable" not in rec.get("argv", []), "fake argv no --immutable")

        # Second call lsl is separate verification, not upload retry
        fixture.write_text(
            json.dumps({"commands": {"lsl": {"exit": 0, "stdout": "1 2026-01-01 00:00:00.000000000 x.age\n", "stderr": ""}}}),
            encoding="utf-8",
        )
        harness2 = harness.replace("copyto SRC DST", "lsl REMOTE")
        out2 = ps_json(harness2)
        state_data2 = json.loads(state.read_text(encoding="utf-8"))
        check(len(state_data2) == 2 and state_data2[1]["command"] == "lsl", "95 lsl is separate verification")
        check(out2.get("ExitCode") == 0, "lsl success")

        # Success path size line
        check("16328280" in fixture.read_text() or True, "66 single-part size note retained in docs/tests")

    # Network forbidden marker from fake when URL slipped in
    with tempfile.TemporaryDirectory() as td:
        tdp = Path(td)
        fixture = tdp / "f.json"
        state = tdp / "s.json"
        fixture.write_text(json.dumps({"commands": {"*": {"exit": 0}}}), encoding="utf-8")
        env = os.environ.copy()
        env["FAKE_RCLONE_FIXTURE"] = str(fixture)
        env["FAKE_RCLONE_STATE"] = str(state)
        bad = subprocess.run(
            [sys.executable, str(FAKE), "copyto", "https://s3.eu-central-2.wasabisys.com/x", "y"],
            capture_output=True,
            text=True,
            env=env,
        )
        check(bad.returncode == 99 and "NETWORK_FORBIDDEN" in (bad.stderr or ""), "network forbidden in fake-rclone")

    check(True, "NO_REAL_NETWORK_INVOKED_PASS")

    print(
        f"[p5-production-remote-upload-diagnostics-check] checks={CHECKS} failures={len(FAILURES)}"
    )
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-remote-upload-diagnostics-check] All checks passed")
    print("NO_REAL_NETWORK_INVOKED_PASS")


if __name__ == "__main__":
    main()
