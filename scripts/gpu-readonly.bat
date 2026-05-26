@echo off
setlocal EnableExtensions

if "%~1"=="" goto usage
if "%~2"=="" goto usage

set "FILEPATH=%~1"
set "INSTRUCTION="

shift /1

:collect_instruction
if "%~1"=="" goto run_worker
if defined INSTRUCTION (
  set "INSTRUCTION=%INSTRUCTION% %~1"
) else (
  set "INSTRUCTION=%~1"
)
shift /1
goto collect_instruction

:run_worker
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpu-readonly.ps1" -FilePath "%FILEPATH%" -Instruction "%INSTRUCTION%"
exit /b %ERRORLEVEL%

:usage
echo Laibe local GPU worker: direct Ollama read-only mode
echo.
echo Usage:
echo   scripts\gpu-readonly.bat local_ai_sandbox\add-safe.js "Explain this file. Do not edit files. Suggest a unified diff draft only if needed."
exit /b 1
