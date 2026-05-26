param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$FilePath,

  [Parameter(Mandatory = $true, Position = 1, ValueFromRemainingArguments = $true)]
  [string[]]$Instruction
)

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\laibe_project"
$Model = "qwen2.5-coder:7b"
$MaxBytes = 150KB

function Stop-WithMessage {
  param([string]$Message)
  Write-Error $Message
  exit 1
}

$InstructionText = ($Instruction -join " ").Trim()

if ([string]::IsNullOrWhiteSpace($InstructionText)) {
  Stop-WithMessage "Please provide an instruction."
}

$separator = [System.IO.Path]::DirectorySeparatorChar
$projectRootFull = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd($separator)

if ([System.IO.Path]::IsPathRooted($FilePath)) {
  $candidatePath = $FilePath
} else {
  $candidatePath = Join-Path $projectRootFull $FilePath
}

$fullPath = [System.IO.Path]::GetFullPath($candidatePath)
$rootPrefix = $projectRootFull + $separator

if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-WithMessage "Blocked: file must be inside C:\laibe_project."
}

if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
  Stop-WithMessage "Blocked: file not found: $fullPath"
}

$relativePath = $fullPath.Substring($rootPrefix.Length)
$relativeLower = $relativePath.ToLowerInvariant()
$pathSegments = $relativeLower -split "[\\/]+"

foreach ($segment in $pathSegments) {
  if ($segment -eq ".env" -or $segment.StartsWith(".env.") -or $segment -eq "secrets") {
    Stop-WithMessage "Blocked: this script does not read .env files or secrets directories."
  }
}

if ($relativeLower -match "(^|[\\/._-])(payment|auth|webhook)([\\/._-]|$)") {
  Stop-WithMessage "Blocked: this script does not read payment/auth/webhook related files."
}

$fileInfo = Get-Item -LiteralPath $fullPath

if ($fileInfo.Length -gt $MaxBytes) {
  Stop-WithMessage "Blocked: file is larger than 150KB."
}

$ollamaExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"

if (-not (Test-Path -LiteralPath $ollamaExe -PathType Leaf)) {
  $ollamaCommand = Get-Command "ollama" -ErrorAction SilentlyContinue
  if ($null -eq $ollamaCommand) {
    Stop-WithMessage "Blocked: Ollama was not found at $ollamaExe or on PATH."
  }
  $ollamaExe = $ollamaCommand.Source
}

$fileContent = Get-Content -Raw -LiteralPath $fullPath

$newline = [System.Environment]::NewLine
$prompt = @(
  "You are the Laibe local GPU worker running in direct Ollama read-only mode.",
  "",
  "User instruction:",
  $InstructionText,
  "",
  "File path:",
  $relativePath,
  "",
  "Rules:",
  "- Do not output tool-call JSON.",
  "- Do not pretend to call tools.",
  "- Do not claim you modified files.",
  "- Do not modify files.",
  "- Answer in normal plain text.",
  "- If you suggest a code change, output a unified diff draft only.",
  "- Keep the answer focused on the provided file content.",
  "",
  "File content:",
  '```',
  $fileContent,
  '```'
) -join $newline

Write-Host "Laibe local GPU worker: direct Ollama read-only mode"
Write-Host "Model: $Model"
Write-Host "File: $relativePath"
Write-Host "This does not edit files."
Write-Host ""

$prompt | & $ollamaExe run $Model
