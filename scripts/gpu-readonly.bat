@echo off
setlocal

if "%~1"=="" (
  echo Laibe local GPU worker: read-only / patch draft mode
  echo.
  echo Usage:
  echo   scripts\gpu-readonly.bat "Read local_ai_sandbox\add-safe.js only. Do not edit files. Explain the issue and generate a unified diff draft only."
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpu-readonly.ps1" %*
