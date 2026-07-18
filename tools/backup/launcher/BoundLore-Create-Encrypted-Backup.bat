@echo off
setlocal EnableExtensions
echo BOUNDLORE_MANUAL_UPLOAD_BACKUP_LAUNCHER
echo.
REM Thin launcher only — no backup logic, no credentials, no network.
set "ORCH=%~dp0Invoke-BoundLoreManualUploadBackup.ps1"
if not exist "%ORCH%" (
  echo STOP_LAUNCHER_ORCHESTRATOR_MISSING: orchestrator not found next to this BAT.
  echo ExitCode=1
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ORCH%"
set "EC=%ERRORLEVEL%"
if "%EC%"=="0" (
  echo.
  echo LOCAL_BACKUP_LAUNCHER_PASS
  echo Manual Wasabi upload may still be required — see handoff file.
) else (
  echo.
  echo LOCAL_BACKUP_LAUNCHER_FAIL
  echo ExitCode=%EC%
)
echo.
pause
exit /b %EC%
