[CmdletBinding()]
param(
    [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = (Resolve-Path -LiteralPath (Join-Path $scriptRoot '..\..')).Path
}
$repoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
if ($repoRoot.StartsWith('\\')) {
    throw 'PGlite runner requires a local drive path, not a UNC path'
}
$runnerPath = Join-Path $repoRoot 'tests\knowledge\pglite_migration_smoke.test.ts'
$deno = (Get-Command deno -ErrorAction Stop).Source
$denoCache = Join-Path $env:LOCALAPPDATA 'deno'

$utf8 = [System.Text.UTF8Encoding]::new($false)
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("ROOT`t$repoRoot")

Get-ChildItem -LiteralPath (Join-Path $repoRoot 'supabase\migrations') `
    -Filter '*.sql' -File |
    Sort-Object -Property Name |
    ForEach-Object {
        $sql = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
        $encoded = [Convert]::ToBase64String($utf8.GetBytes($sql))
        $lines.Add("M`t$($_.Name)`t$encoded")
    }

$contractPaths = [ordered]@{
    deployment_contract = 'supabase\tests\deployment_contract.sql'
    remote_domain_rls_contract = 'supabase\tests\remote_domain_rls_contract.sql'
    remote_casework_rls_contract = 'supabase\tests\remote_casework_rls_contract.sql'
    remote_active_session_contract = 'supabase\tests\remote_active_session_contract.sql'
    remote_event_next_action_contract = 'supabase\tests\remote_event_next_action_contract.sql'
    remote_woodwork_contract = 'tests\knowledge\remote_woodwork_contract.sql'
    remote_unified_items_contract = 'tests\knowledge\remote_unified_items_contract.sql'
    rpc_surface_contract = 'supabase\tests\rpc_surface_contract.sql'
    core_preflight = 'supabase\core_reconciliation\000_preflight.sql'
    core_bundle = 'supabase\core_reconciliation\010_a5_knowledge_foundation.sql'
    core_verify = 'supabase\core_reconciliation\900_verify.sql'
    core_rollback = 'supabase\core_reconciliation\990_rollback.sql'
}

foreach ($contractName in $contractPaths.Keys) {
    $contractPath = Join-Path $repoRoot $contractPaths[$contractName]
    $sql = Get-Content -LiteralPath $contractPath -Raw -Encoding UTF8
    $encoded = [Convert]::ToBase64String($utf8.GetBytes($sql))
    $lines.Add("C`t$contractName`t$encoded")
}
$lines.Add('END')

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $deno
$startInfo.Arguments = @(
    'test'
    '--no-config'
    '--cached-only'
    "`"--allow-read=$denoCache`""
    '--allow-env'
    '--deny-net'
    "`"$runnerPath`""
) -join ' '
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardInput = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $startInfo
if (-not $process.Start()) {
    throw 'Unable to start Deno PGlite runner'
}

$stdoutTask = $process.StandardOutput.ReadToEndAsync()
$stderrTask = $process.StandardError.ReadToEndAsync()
$process.StandardInput.Write(($lines -join "`n"))
$process.StandardInput.Close()
$process.WaitForExit()

$stdout = $stdoutTask.GetAwaiter().GetResult()
$stderr = $stderrTask.GetAwaiter().GetResult()
if ($stdout) {
    [Console]::Out.Write($stdout)
}
if ($stderr) {
    [Console]::Error.Write($stderr)
}
exit $process.ExitCode
