param(
  [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$PromptParts
)

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\laibe_project"
$Model = "qwen2.5-coder:7b"
$Prompt = ($PromptParts -join " ").Trim()

if ([string]::IsNullOrWhiteSpace($Prompt)) {
  Write-Host "Please enter a prompt for the Laibe local GPU worker."
  Write-Host 'Example: .\scripts\gpu-readonly.ps1 "Read local_ai_sandbox/add-safe.js only. Do not edit files. Explain the issue and generate a unified diff draft only."'
  exit 1
}

Write-Host "Laibe local GPU worker: read-only / patch draft mode"
Write-Host "Model: $Model"
Write-Host "Project: $ProjectRoot"
Write-Host "Reminder: this entry only analyzes and drafts patches. It does not formally edit files."
Write-Host ""

& codex.cmd exec --oss --local-provider ollama -m $Model -s read-only -C $ProjectRoot $Prompt
