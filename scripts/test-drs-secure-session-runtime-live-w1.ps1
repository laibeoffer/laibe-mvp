[CmdletBinding()]
param(
  [Parameter(Mandatory)] [ValidatePattern('^[0-9a-f]{40}$')] [string]$ExpectedHead,
  [Parameter(Mandatory)] [ValidatePattern('^[0-9a-f]{40}$')] [string]$ExpectedTree,
  [Parameter(Mandatory)] [string]$ExpectedBranch,
  [Parameter(Mandatory)] [ValidatePattern('^[0-9a-f]{40}$')] [string]$ExpectedParent,
  [Parameter(Mandatory)] [string]$ExpectedCandidateManifest,
  [Parameter(Mandatory)] [string]$ExpectedProtectedManifest
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$ConfirmationName = 'A17_S1AR_RUNTIME_CONFIRMED'
$ConfirmationValue = 'A17_S1AR_DISPOSABLE_LOCAL_RUNTIME_CONFIRMED_20260827_V1'
$ProjectId = 'a17-s1ar-20260827'
$RuntimeDirectoryName = '.a17-s1ar-runtime'
$CliLatestBytes = 'v2.116.0'
$CliLatestSha256 = '777fd6d651101226cf5d67775d803518c5e94912772c3f936a458353b58ec9d1'
$SupabaseExecutable = 'C:\Users\J\scoop\apps\supabase\current\supabase.exe'
$SupabaseExecutableSha256 = '22c0f28f013411c7a7b880116cd33636edb955a64278914692eea010bcc98dc7'
$DockerExecutable = 'C:\Users\J\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe'
$DockerExecutableSha256 = '0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753'
$GitExecutablePath = 'C:\Program Files\Git\cmd\git.exe'
$GitExecutableSha256 = 'da240fe9bc24895b3e04150a4990b8a6ff329ecabcd8f19684c2cc310da5ef3f'
$SystemRootPath = 'C:\WINDOWS'
$TarExecutablePath = 'C:\WINDOWS\system32\tar.exe'
$TarExecutableSha256 = '9b77d4c912f2edae8c241d0ece1094d2ac068b084269ceaf85d7c7b085d2ae86'
$DenoExecutablePath = 'C:\Users\J\AppData\Local\Microsoft\WinGet\Links\deno.exe'
$DenoExecutableSha256 = '3c53c061724194360f71b45e1dd227128750fe5c167ce314fa9c64110e690598'
$ListenerRangeContract = '54320..54329 and 58017'
$ArchiveContract = 'git archive HEAD -- supabase'
$ImageCacheContract = 'docker image inspect'
$ResourceContract = 'docker ps -a a17-s1ar-20260827'
$StopContract = 'supabase stop --project-id a17-s1ar-20260827'
$DenoRunPermissionContract = '--allow-run=C:\Users\J\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe'
$SupabaseEdgeRuntimeContainerAcceptance = $false
$RuntimeVerdictNeedsRework = 'RUNTIME_VERDICT=NEEDS_REWORK'
$RuntimeVerdictRot = 'A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_ROT'
$RuntimeVerdictLock = 'A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_LOCK'

function Get-LowerSha256 {
  param([Parameter(Mandatory)][string]$LiteralPath)

  return (Get-FileHash -Algorithm SHA256 -LiteralPath $LiteralPath).Hash.ToLowerInvariant()
}

function Assert-ExactDescendant {
  param(
    [Parameter(Mandatory)][string]$Root,
    [Parameter(Mandatory)][string]$Candidate
  )

  $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  )
  $candidatePath = [System.IO.Path]::GetFullPath($Candidate)
  $prefix = $rootPath + [System.IO.Path]::DirectorySeparatorChar
  if (-not $candidatePath.StartsWith(
      $prefix,
      [System.StringComparison]::OrdinalIgnoreCase
    )) {
    throw 'A17_S1AR_PATH_OUTSIDE_WORKTREE'
  }
  return $candidatePath
}

function Get-RemainingProcessDeadlineMilliseconds {
  param(
    [Parameter(Mandatory)][System.Diagnostics.Stopwatch]$ProcessDeadline,
    [Parameter(Mandatory)][ValidateRange(1, [int]::MaxValue)][int]$ProcessTimeoutMilliseconds
  )

  $remaining = [long]$ProcessTimeoutMilliseconds - $ProcessDeadline.ElapsedMilliseconds
  if ($remaining -le 0) { return 0 }
  return [int]$remaining
}

function Invoke-ClosedProcess {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(Mandatory)][string[]]$Arguments,
    [Parameter(Mandatory)][string]$WorkingDirectory,
    [hashtable]$Environment = @{},
    [AllowNull()][string]$StandardInput = $null,
    [switch]$AllowFailure,
    [Parameter(Mandatory)][string]$FailureCode,
    [ValidateRange(1, [int]::MaxValue)][int]$ProcessTimeoutMilliseconds = 900000,
    [ValidateRange(1, [int]::MaxValue)][int]$ProcessGraceMilliseconds = 10000
  )

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FilePath
  $startInfo.WorkingDirectory = $WorkingDirectory
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.RedirectStandardInput = $null -ne $StandardInput
  $startInfo.Environment.Clear()
  foreach ($entry in $Environment.GetEnumerator()) {
    $startInfo.Environment[$entry.Key] = [string]$entry.Value
  }
  foreach ($argument in $Arguments) {
    [void]$startInfo.ArgumentList.Add($argument)
  }

  $process = [System.Diagnostics.Process]::new()
  $processDeadline = [System.Diagnostics.Stopwatch]::StartNew()
  $stdoutTask = $null
  $stderrTask = $null
  $processStarted = $false
  $terminateProcessTree = {
    param([Parameter(Mandatory)][bool]$exited)

    if (-not $exited) {
      try { $alreadyExited = $process.HasExited }
      catch { throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED' }
      if ($alreadyExited) { return }

      $killRaceWasExited = $false
      try {
        $process.Kill($true)
      }
      catch {
        try { $killRaceWasExited = $process.HasExited }
        catch { throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED' }
        if (-not $killRaceWasExited) {
          throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED'
        }
      }

      try {
        $postKillExited = $process.WaitForExit($ProcessGraceMilliseconds)
        $terminationConfirmed = $postKillExited -and $process.HasExited
      }
      catch { throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED' }
      if (-not $terminationConfirmed) {
        throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED'
      }
      return
    }
    return
  }

  try {
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
      throw $FailureCode
    }
    $processStarted = $true
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    if ($null -ne $StandardInput) {
      $stdinWriteTask = $process.StandardInput.WriteAsync($StandardInput)
      $stdinWriteRemaining = Get-RemainingProcessDeadlineMilliseconds -ProcessDeadline $processDeadline -ProcessTimeoutMilliseconds $ProcessTimeoutMilliseconds
      if ($stdinWriteRemaining -le 0 -or -not $stdinWriteTask.Wait($stdinWriteRemaining)) {
        & $terminateProcessTree $false
        [void][System.Threading.Tasks.Task]::WaitAll(
          [System.Threading.Tasks.Task[]]@($stdoutTask, $stderrTask),
          $ProcessGraceMilliseconds)
        throw $FailureCode
      }
      $stdinWriteTask.GetAwaiter().GetResult()

      $stdinFlushTask = $process.StandardInput.FlushAsync()
      $stdinFlushRemaining = Get-RemainingProcessDeadlineMilliseconds -ProcessDeadline $processDeadline -ProcessTimeoutMilliseconds $ProcessTimeoutMilliseconds
      if ($stdinFlushRemaining -le 0 -or -not $stdinFlushTask.Wait($stdinFlushRemaining)) {
        & $terminateProcessTree $false
        [void][System.Threading.Tasks.Task]::WaitAll(
          [System.Threading.Tasks.Task[]]@($stdoutTask, $stderrTask),
          $ProcessGraceMilliseconds)
        throw $FailureCode
      }
      $stdinFlushTask.GetAwaiter().GetResult()
      $process.StandardInput.Close()
    }

    $exitRemaining = Get-RemainingProcessDeadlineMilliseconds -ProcessDeadline $processDeadline -ProcessTimeoutMilliseconds $ProcessTimeoutMilliseconds
    $exited = $false
    if ($exitRemaining -gt 0) {
      $ProcessTimeoutMilliseconds = $exitRemaining
      $exited = $process.WaitForExit($ProcessTimeoutMilliseconds)
    }
    if (-not $exited) {
      & $terminateProcessTree $false
      [void][System.Threading.Tasks.Task]::WaitAll(
        [System.Threading.Tasks.Task[]]@($stdoutTask, $stderrTask),
        $ProcessGraceMilliseconds)
      throw $FailureCode
    }

    $outputDrained = [System.Threading.Tasks.Task]::WaitAll(
      [System.Threading.Tasks.Task[]]@($stdoutTask, $stderrTask),
      $ProcessGraceMilliseconds)
    if (-not $outputDrained) { throw $FailureCode }
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $exitCode = $process.ExitCode
    if ($exitCode -ne 0 -and -not $AllowFailure) {
      throw $FailureCode
    }
  }
  catch {
    if ($_.Exception.Message -ceq 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED') {
      throw
    }
    if ($processStarted) {
      try { $caughtProcessExited = $process.HasExited }
      catch { throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED' }
      if (-not $caughtProcessExited) {
        & $terminateProcessTree -exited $false
      }
    }
    throw $FailureCode
  }
  finally {
    $process.Dispose()
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Stdout = $stdout
    Stderr = $stderr
  }
}

function ConvertTo-base64url43 {
  $bytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $value = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  if ($value.Length -ne 43 -or $value -notmatch '^[A-Za-z0-9_-]{43}$') {
    throw 'A17_S1AR_CSPRNG_ENCODING_FAILED'
  }
  return $value
}

function Assert-NoOwnedListeners {
  $ports = @((54320..54329) + 58017)
  try {
    $listeners = @(
      Get-NetTCPConnection -State Listen -ErrorAction Stop |
        Where-Object { $_.LocalPort -in $ports }
    )
  }
  catch { throw 'A17_S1AR_LISTENER_QUERY_FAILED' }
  if ($listeners.Count -ne 0) {
    throw 'A17_S1AR_PREFLIGHT_LISTENER_OCCUPIED'
  }
}

function Get-ExactSupabaseImageRecords {
  $ascii = [System.Text.Encoding]::Latin1.GetString(
    [System.IO.File]::ReadAllBytes($SupabaseExecutable)
  )
  $expectedImages = @(
    [pscustomobject]@{
      sourceLiteral = 'supabase/postgres:17.6.1.143'
      ref = 'public.ecr.aws/supabase/postgres:17.6.1.143'
      imageId = 'sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453'
      repoDigest = 'public.ecr.aws/supabase/postgres@sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453'
    },
    [pscustomobject]@{
      sourceLiteral = 'supabase/gotrue:v2.192.0'
      ref = 'public.ecr.aws/supabase/gotrue:v2.192.0'
      imageId = 'sha256:b252efb680be37d4a8bf77c210cf0439c19b63a4b51929233a65dd101d25bdab'
      repoDigest = 'public.ecr.aws/supabase/gotrue@sha256:b252efb680be37d4a8bf77c210cf0439c19b63a4b51929233a65dd101d25bdab'
    },
    [pscustomobject]@{
      sourceLiteral = 'postgrest/postgrest:v14.14'
      ref = 'public.ecr.aws/supabase/postgrest:v14.14'
      imageId = 'sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012'
      repoDigest = 'public.ecr.aws/supabase/postgrest@sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012'
    },
    [pscustomobject]@{
      sourceLiteral = 'library/kong:2.8.1'
      ref = 'public.ecr.aws/supabase/kong:2.8.1'
      imageId = 'sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d'
      repoDigest = 'public.ecr.aws/supabase/kong@sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d'
    }
  )
  foreach ($record in $expectedImages) {
    $firstIndex = $ascii.IndexOf($record.sourceLiteral, [System.StringComparison]::Ordinal)
    $lastIndex = $ascii.LastIndexOf($record.sourceLiteral, [System.StringComparison]::Ordinal)
    if ($firstIndex -lt 0 -or $lastIndex -ne $firstIndex) {
      throw 'A17_S1AR_LOCAL_IMAGE_IDENTITY_AMBIGUOUS'
    }
  }
  return $expectedImages
}

function Assert-NoOwnedDockerResources {
  param([Parameter(Mandatory)][string]$WorkingDirectory)

  $queries = @(
    @('ps', '-a', '--filter', "name=$ProjectId", '--format', '{{.ID}} {{.Names}}'),
    @('network', 'ls', '--filter', "name=$ProjectId", '--format', '{{.ID}} {{.Name}}'),
    @('volume', 'ls', '--filter', "name=$ProjectId", '--format', '{{.Name}}')
  )
  foreach ($query in $queries) {
    $result = Invoke-ClosedProcess `
      -FilePath $DockerExecutable `
      -Arguments $query `
      -WorkingDirectory $WorkingDirectory `
      -Environment @{ DOCKER_CLI_HINTS = 'false' } `
      -FailureCode 'A17_S1AR_DOCKER_RESOURCE_PREFLIGHT_FAILED'
    if (-not [string]::IsNullOrWhiteSpace($result.Stdout)) {
      throw 'A17_S1AR_OWNED_DOCKER_RESOURCE_ALREADY_EXISTS'
    }
  }
}

function Assert-LocalImageCache {
  param([Parameter(Mandatory)][string]$WorkingDirectory)

  $expectedImages = Get-ExactSupabaseImageRecords
  if (@($expectedImages).Count -ne 4) {
    throw 'A17_S1AR_LOCAL_IMAGE_IDENTITY_AMBIGUOUS'
  }
  foreach ($record in $expectedImages) {
    $result = Invoke-ClosedProcess `
      -FilePath $DockerExecutable `
      -Arguments @('image', 'inspect', '--format', '{{.Id}}|{{json .RepoTags}}|{{json .RepoDigests}}', $record.ref) `
      -WorkingDirectory $WorkingDirectory `
      -Environment @{ DOCKER_CLI_HINTS = 'false' } `
      -FailureCode 'A17_S1AR_LOCAL_IMAGE_CACHE_MISSING'

    if ($result.Stdout -notmatch '\A[^\r\n]+(?:\r?\n)?\z') {
      throw 'A17_S1AR_LOCAL_IMAGE_CACHE_IDENTITY_REJECTED'
    }
    $outputLine = $result.Stdout.TrimEnd("`r", "`n")
    if ([string]::IsNullOrWhiteSpace($outputLine)) {
      throw 'A17_S1AR_LOCAL_IMAGE_CACHE_IDENTITY_REJECTED'
    }
    $fields = @($outputLine -split '\|', 4)
    if (
      $fields.Count -ne 3 -or
      [string]::IsNullOrWhiteSpace($fields[0]) -or
      [string]::IsNullOrWhiteSpace($fields[1]) -or
      [string]::IsNullOrWhiteSpace($fields[2])
    ) {
      throw 'A17_S1AR_LOCAL_IMAGE_CACHE_IDENTITY_REJECTED'
    }
    if (
      -not $fields[1].StartsWith('[') -or
      -not $fields[1].EndsWith(']') -or
      -not $fields[2].StartsWith('[') -or
      -not $fields[2].EndsWith(']')
    ) {
      throw 'A17_S1AR_LOCAL_IMAGE_CACHE_IDENTITY_REJECTED'
    }
    try {
      $repoTags = @(ConvertFrom-Json -InputObject $fields[1])
      $repoDigests = @(ConvertFrom-Json -InputObject $fields[2])
    }
    catch {
      throw 'A17_S1AR_LOCAL_IMAGE_CACHE_IDENTITY_REJECTED'
    }
    if (
      $fields[0] -cne $record.imageId -or
      $repoTags.Count -ne 1 -or $repoTags[0] -cne $record.ref -or
      $repoTags[0] -isnot [string] -or
      $repoDigests.Count -ne 1 -or $repoDigests[0] -cne $record.repoDigest -or
      $repoDigests[0] -isnot [string]
    ) {
      throw 'A17_S1AR_LOCAL_IMAGE_CACHE_IDENTITY_REJECTED'
    }
  }
}

function Read-StatusEnvironment {
  param([Parameter(Mandatory)][string]$Text)

  $values = @{}
  foreach ($line in $Text -split "`r?`n") {
    if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
      $value = $Matches[2].Trim()
      if (
        $value.Length -ge 2 -and
        (($value.StartsWith('"') -and $value.EndsWith('"')) -or
          ($value.StartsWith("'") -and $value.EndsWith("'")))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$Matches[1]] = $value
    }
  }
  if (
    $values['API_URL'] -ne 'http://127.0.0.1:54321' -or
    [string]::IsNullOrWhiteSpace($values['SERVICE_ROLE_KEY'])
  ) {
    throw 'A17_S1AR_STATUS_CONTRACT_REJECTED'
  }
  return $values
}

function Invoke-GitIdentity {
  param(
    [Parameter(Mandatory)][string[]]$Arguments,
    [Parameter(Mandatory)][string]$FailureCode
  )

  return Invoke-ClosedProcess `
    -FilePath $script:gitExecutable `
    -Arguments $Arguments `
    -WorkingDirectory $script:worktreeRoot `
    -FailureCode $FailureCode
}

function ConvertFrom-ExpectedManifest {
  param(
    [Parameter(Mandatory)][string]$Json,
    [Parameter(Mandatory)][string]$FailureCode
  )

  try {
    $manifest = ConvertFrom-Json -InputObject $Json -AsHashtable -Depth 4
  }
  catch {
    throw $FailureCode
  }
  if ($manifest -isnot [hashtable] -or $manifest.Count -eq 0) {
    throw $FailureCode
  }
  return $manifest
}

function Assert-ManifestFiles {
  param(
    [Parameter(Mandatory)][hashtable]$Manifest,
    [Parameter(Mandatory)][string[]]$ExactPaths,
    [Parameter(Mandatory)][string]$FailureCode
  )

  $actualKeys = @($Manifest.Keys | Sort-Object)
  $expectedKeys = @($ExactPaths | Sort-Object)
  if (($actualKeys -join "`n") -cne ($expectedKeys -join "`n")) {
    throw $FailureCode
  }
  foreach ($relativePath in $ExactPaths) {
    $candidate = Assert-ExactDescendant `
      -Root $script:worktreeRoot `
      -Candidate (Join-Path $script:worktreeRoot $relativePath)
    $expectedSha = [string]$Manifest[$relativePath]
    if (
      $expectedSha -notmatch '^[0-9a-f]{64}$' -or
      -not (Test-Path -LiteralPath $candidate -PathType Leaf) -or
      (Get-LowerSha256 -LiteralPath $candidate) -cne $expectedSha
    ) {
      throw $FailureCode
    }
  }
}

function Assert-CandidateManifest {
  param([Parameter(Mandatory)][hashtable]$ExpectedManifest)

  Assert-ManifestFiles `
    -Manifest $ExpectedManifest `
    -ExactPaths @(
      'scripts/test-drs-secure-session-runtime-live-w1.ps1',
      'supabase/tests/drs_secure_session_runtime_live_pg_w1.sql',
      'supabase/tests/drs_secure_session_runtime_live_w1.test.mjs',
      'tests/drs-secure-session-runtime-live-source.test.mjs'
    ) `
    -FailureCode 'A17_S1AR_CANDIDATE_MANIFEST_REJECTED'
}

function Assert-ProtectedManifest {
  param([Parameter(Mandatory)][hashtable]$ExpectedManifest)

  Assert-ManifestFiles `
    -Manifest $ExpectedManifest `
    -ExactPaths @(
      'supabase/config.toml',
      'supabase/functions/_shared/drs-auth/contracts.ts',
      'supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts',
      'supabase/functions/_shared/drs-auth/drs-specialist-authority.ts',
      'supabase/functions/_shared/drs-auth/drs-secure-session-runtime.ts',
      'supabase/functions/_shared/drs-auth/specialist-authorization.ts',
      'supabase/functions/drs-session-bootstrap/index.ts',
      'supabase/migrations/20260824170000_drs_identity_google_line_w1.sql',
      'supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql',
      'supabase/migrations/20260827140000_drs_secure_session_runtime_composition_w1.sql',
      'supabase/tests/drs_secure_session_runtime_composition_w1.test.mjs',
      'tests/drs-secure-session-runtime-source.test.mjs'
    ) `
    -FailureCode 'A17_S1AR_PROTECTED_MANIFEST_REJECTED'
}

function Assert-SourceIdentity {
  param([Parameter(Mandatory)][string]$Stage)

  $head = (Invoke-GitIdentity -Arguments @("rev-parse", "HEAD") -FailureCode 'A17_S1AR_HEAD_READ_FAILED').Stdout.Trim()
  $tree = (Invoke-GitIdentity -Arguments @("rev-parse", "HEAD^{tree}") -FailureCode 'A17_S1AR_TREE_READ_FAILED').Stdout.Trim()
  $branch = (Invoke-GitIdentity -Arguments @("symbolic-ref", "--short", "HEAD") -FailureCode 'A17_S1AR_BRANCH_READ_FAILED').Stdout.Trim()
  $parents = (Invoke-GitIdentity -Arguments @("rev-list", "--parents", "-n", "1", "HEAD") -FailureCode 'A17_S1AR_PARENT_READ_FAILED').Stdout.Trim().Split(' ')
  $commitCount = (Invoke-GitIdentity -Arguments @('rev-list', '--count', "$ExpectedParent..HEAD") -FailureCode 'A17_S1AR_COUNT_READ_FAILED').Stdout.Trim()
  $unstaged = (Invoke-GitIdentity -Arguments @('diff', '--name-only', '--') -FailureCode 'A17_S1AR_UNSTAGED_READ_FAILED').Stdout
  $index = (Invoke-GitIdentity -Arguments @("diff", "--cached", "--name-only") -FailureCode 'A17_S1AR_INDEX_READ_FAILED').Stdout
  $untracked = (Invoke-GitIdentity -Arguments @("ls-files", "--others", "--exclude-standard") -FailureCode 'A17_S1AR_UNTRACKED_READ_FAILED').Stdout
  if (
    $head -cne $ExpectedHead -or $tree -cne $ExpectedTree -or
    $branch -cne $ExpectedBranch -or $parents.Count -ne 2 -or
    $parents[1] -cne $ExpectedParent -or $commitCount -cne '1' -or
    -not [string]::IsNullOrWhiteSpace($unstaged) -or
    -not [string]::IsNullOrWhiteSpace($index) -or
    -not [string]::IsNullOrWhiteSpace($untracked)
  ) {
    throw "A17_S1AR_SOURCE_IDENTITY_REJECTED_$Stage"
  }
  Assert-CandidateManifest -ExpectedManifest $script:candidateManifest
  Assert-ProtectedManifest -ExpectedManifest $script:protectedManifest
}

function Get-TaskOwnedResources {
  param([Parameter(Mandatory)][string]$WorkingDirectory)

  $containerResult = Invoke-ClosedProcess -FilePath $DockerExecutable -Arguments @('container', 'ls', '-a', '--filter', "name=$ProjectId", '--format', '{{.Names}}') -WorkingDirectory $WorkingDirectory -Environment @{ DOCKER_CLI_HINTS = 'false' } -FailureCode 'A17_S1AR_CONTAINER_ENUM_FAILED'
  $networkResult = Invoke-ClosedProcess -FilePath $DockerExecutable -Arguments @('network', 'ls', '--filter', "name=$ProjectId", '--format', '{{.Name}}') -WorkingDirectory $WorkingDirectory -Environment @{ DOCKER_CLI_HINTS = 'false' } -FailureCode 'A17_S1AR_NETWORK_ENUM_FAILED'
  $volumeResult = Invoke-ClosedProcess -FilePath $DockerExecutable -Arguments @('volume', 'ls', '--filter', "name=$ProjectId", '--format', '{{.Name}}') -WorkingDirectory $WorkingDirectory -Environment @{ DOCKER_CLI_HINTS = 'false' } -FailureCode 'A17_S1AR_VOLUME_ENUM_FAILED'
  return [pscustomobject]@{
    Containers = @($containerResult.Stdout -split "`r?`n" | Where-Object { $_ } | Sort-Object)
    Networks = @($networkResult.Stdout -split "`r?`n" | Where-Object { $_ } | Sort-Object)
    Volumes = @($volumeResult.Stdout -split "`r?`n" | Where-Object { $_ } | Sort-Object)
  }
}

function Assert-OwnedRuntimeState {
  param([switch]$RequireExact)

  $resources = Get-TaskOwnedResources -WorkingDirectory $runtimeRoot
  $expectedContainers = @("supabase_auth_$ProjectId", "supabase_db_$ProjectId", "supabase_kong_$ProjectId", "supabase_rest_$ProjectId") | Sort-Object
  $expectedNetworks = @("supabase_network_$ProjectId")
  $expectedVolumes = @("supabase_config_$ProjectId", "supabase_db_$ProjectId") | Sort-Object
  if (
    -not $RequireExact -or
    ($resources.Containers -join "`n") -cne ($expectedContainers -join "`n") -or
    ($resources.Networks -join "`n") -cne ($expectedNetworks -join "`n") -or
    ($resources.Volumes -join "`n") -cne ($expectedVolumes -join "`n")
  ) {
    throw 'A17_S1AR_OWNED_RESOURCE_SET_REJECTED'
  }
  $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in @(54320..54329) })
  foreach ($listener in $listeners) {
    $owner = Get-Process -Id $listener.OwningProcess -ErrorAction Stop
    if ($owner.ProcessName -notmatch '^(com\.docker\.backend|docker-proxy)$') {
      throw 'A17_S1AR_LISTENER_OWNER_REJECTED'
    }
  }
  foreach ($container in $expectedContainers) {
    $ports = Invoke-ClosedProcess -FilePath $DockerExecutable -Arguments @('port', $container) -WorkingDirectory $runtimeRoot -Environment @{ DOCKER_CLI_HINTS = 'false' } -AllowFailure -FailureCode 'A17_S1AR_DOCKER_PORT_MAP_FAILED'
    if ($ports.ExitCode -ne 0) { throw 'A17_S1AR_DOCKER_PORT_MAP_FAILED' }
  }
  $mappedPorts = @($expectedContainers | ForEach-Object { (Invoke-ClosedProcess -FilePath $DockerExecutable -Arguments @('port', $_) -WorkingDirectory $runtimeRoot -Environment @{ DOCKER_CLI_HINTS = 'false' } -FailureCode 'A17_S1AR_DOCKER_PORT_MAP_FAILED').Stdout }) -join "`n"
  foreach ($listener in $listeners) {
    if ($mappedPorts -notmatch "127\.0\.0\.1:$($listener.LocalPort)(?:\s|$)") {
      throw 'A17_S1AR_LISTENER_CONTAINER_MAPPING_REJECTED'
    }
  }
}

function Assert-OwnedRuntimeAbsent {
  $resources = Get-TaskOwnedResources -WorkingDirectory $worktreeRoot
  if ($resources.Containers.Count -ne 0 -or $resources.Networks.Count -ne 0 -or $resources.Volumes.Count -ne 0) {
    throw 'A17_S1AR_OWNED_RESOURCE_READBACK_FAILED'
  }
}

function Assert-ListenerAbsent {
  Assert-NoOwnedListeners
}

function Assert-HarnessCleanupReadback {
  if ($null -eq $script:denoResult -or ([regex]::Matches($script:denoResult.Stdout, 'A17_S1AR_CLEANUP_CONFIRMED')).Count -ne 1) {
    throw 'A17_S1AR_DENO_SQL_AUTH_CLEANUP_READBACK_FAILED'
  }
}

function Read-ExactCausalVerdict {
  param([Parameter(Mandatory)][string]$Text)

  $matches = [regex]::Matches($Text, 'A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_(?:ROT|LOCK)')
  $generic = [regex]::Matches($Text, 'A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK')
  $values = @($matches | ForEach-Object { $_.Value } | Sort-Object -Unique)
  if ($matches.Count -eq 0) {
    if ($generic.Count -gt 0) { throw 'A17_S1AR_CAUSAL_VERDICT_MISSING' }
    return $null
  }
  if ($values.Count -ne 1) { throw 'A17_S1AR_CAUSAL_VERDICT_CONFLICT' }
  if ($matches.Count -ne 1) { throw 'A17_S1AR_CAUSAL_VERDICT_DUPLICATE' }
  return $values[0]
}

function Assert-CapturedOutputSanitized {
  param(
    [Parameter(Mandatory)][string]$Text,
    [Parameter(Mandatory)][string]$SUPABASE_SERVICE_ROLE_KEY,
    [Parameter(Mandatory)][string]$LAIBE_DRS_SESSION_COOKIE_KEY_V1,
    [Parameter(Mandatory)][string]$LAIBE_DRS_BFF_PROOF_KEY_V1
  )
  $fixtureIds = @(
    'a1700000-0000-4000-8000-00000000000a', 'a1700000-0000-4000-8000-00000000000b',
    'a1700000-0000-4000-8000-000000000011', 'a1700000-0000-4000-8000-000000000012',
    'a1700000-0000-4000-8000-00000000001a', 'a1700000-0000-4000-8000-00000000001b',
    'a1700000-0000-4000-8000-000000000021', 'a1700000-0000-4000-8000-000000000022'
  )
  $authorityCanaries = @(
    'drs-specialist:a1700000-0000-4000-8000-00000000000a',
    'drs-specialist:a1700000-0000-4000-8000-00000000000b',
    'A17 Specialist A', 'A17 Specialist B',
    'A17_S1AR_HOSTILE_ACCESS_TOKEN_CANARY_202608'
  )
  foreach ($canary in @($SUPABASE_SERVICE_ROLE_KEY, $LAIBE_DRS_SESSION_COOKIE_KEY_V1, $LAIBE_DRS_BFF_PROOF_KEY_V1) + $fixtureIds + $authorityCanaries) {
    if (-not [string]::IsNullOrEmpty($canary) -and $Text.Contains($canary)) {
      throw 'A17_S1AR_CAPTURED_OUTPUT_SECRET_OR_CANARY'
    }
  }
}

function Invoke-ExactProjectStopCleanup {
  $stopResult = Invoke-ClosedProcess -FilePath $SupabaseExecutable -Arguments @('stop', '--project-id', $ProjectId, '--no-backup') -WorkingDirectory $runtimeRoot -Environment @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; SystemRoot = $SystemRootPath } -AllowFailure -FailureCode 'A17_S1AR_EXACT_STOP_FAILED'
  if ($stopResult.ExitCode -ne 0) { throw 'A17_S1AR_EXACT_STOP_FAILED' }
}

if ([Environment]::GetEnvironmentVariable($ConfirmationName, 'Process') -ne $ConfirmationValue) { throw 'A17_S1AR_EXACT_CONFIRMATION_REQUIRED' }
if ($SupabaseEdgeRuntimeContainerAcceptance) { throw 'A17_S1AR_EDGE_RUNTIME_ACCEPTANCE_MUST_BE_FALSE' }
if ($ListenerRangeContract -ne '54320..54329 and 58017') { throw 'A17_S1AR_LISTENER_CONTRACT_DRIFT' }
if ($ArchiveContract -ne 'git archive HEAD -- supabase' -or $ImageCacheContract -ne 'docker image inspect') { throw 'A17_S1AR_HARNESS_CONTRACT_DRIFT' }

$scriptRoot = Split-Path -Parent $PSCommandPath
$worktreeRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
$runtimeRoot = Assert-ExactDescendant -Root $worktreeRoot -Candidate (Join-Path $worktreeRoot $RuntimeDirectoryName)
if (
  -not (Test-Path -LiteralPath $GitExecutablePath -PathType Leaf) -or
  (Get-LowerSha256 $GitExecutablePath) -cne $GitExecutableSha256
) { throw 'A17_S1AR_GIT_IDENTITY_REJECTED' }
$gitExecutable = $GitExecutablePath
if (
  -not (Test-Path -LiteralPath $SystemRootPath -PathType Container) -or
  [System.IO.Path]::GetFullPath($SystemRootPath).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  ) -cne $SystemRootPath -or
  [System.IO.Path]::GetFullPath((Join-Path $SystemRootPath 'system32\tar.exe')) -cne $TarExecutablePath
) { throw 'A17_S1AR_SYSTEM_ROOT_REJECTED' }
if (
  -not (Test-Path -LiteralPath $TarExecutablePath -PathType Leaf) -or
  (Get-LowerSha256 $TarExecutablePath) -cne $TarExecutableSha256
) { throw 'A17_S1AR_TAR_IDENTITY_REJECTED' }
$tarExecutable = $TarExecutablePath
if (
  -not (Test-Path -LiteralPath $DenoExecutablePath -PathType Leaf) -or
  (Get-LowerSha256 $DenoExecutablePath) -cne $DenoExecutableSha256
) { throw 'A17_S1AR_DENO_IDENTITY_REJECTED' }
$denoExecutable = $DenoExecutablePath
$candidateManifest = ConvertFrom-ExpectedManifest -Json $ExpectedCandidateManifest -FailureCode 'A17_S1AR_CANDIDATE_MANIFEST_INPUT_REJECTED'
$protectedManifest = ConvertFrom-ExpectedManifest -Json $ExpectedProtectedManifest -FailureCode 'A17_S1AR_PROTECTED_MANIFEST_INPUT_REJECTED'
$startAttempted = $false
$denoAttempted = $false
$denoResult = $null
$primaryError = $null
$cleanupErrors = [System.Collections.Generic.List[string]]::new()
$stopSucceeded = $false
$preserveRuntimeRoot = $true
$terminalExitCode = 1

try {
  Assert-SourceIdentity -Stage "pre-start"
  if (Test-Path -LiteralPath $runtimeRoot) { throw 'A17_S1AR_RUNTIME_CHILD_ALREADY_EXISTS' }
  if (-not (Test-Path -LiteralPath $SupabaseExecutable -PathType Leaf) -or (Get-LowerSha256 $SupabaseExecutable) -cne $SupabaseExecutableSha256) { throw 'A17_S1AR_SUPABASE_IDENTITY_REJECTED' }
  if (-not (Test-Path -LiteralPath $DockerExecutable -PathType Leaf) -or (Get-LowerSha256 $DockerExecutable) -cne $DockerExecutableSha256) { throw 'A17_S1AR_DOCKER_IDENTITY_REJECTED' }

  $top = Invoke-GitIdentity -Arguments @('rev-parse', '--show-toplevel') -FailureCode 'A17_S1AR_GIT_TOP_REJECTED'
  if ([System.IO.Path]::GetFullPath($top.Stdout.Trim()) -cne $worktreeRoot) { throw 'A17_S1AR_WORKTREE_IDENTITY_REJECTED' }
  Assert-NoOwnedListeners
  Assert-NoOwnedDockerResources -WorkingDirectory $worktreeRoot
  Assert-LocalImageCache -WorkingDirectory $worktreeRoot

  [void][System.IO.Directory]::CreateDirectory($runtimeRoot)
  $archivePath = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot '.git-archive-head.tar')
  [void](Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', "--output=$archivePath", '--', 'supabase') -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')
  [void](Invoke-ClosedProcess -FilePath $tarExecutable -Arguments @('-xf', $archivePath, '-C', $runtimeRoot) -WorkingDirectory $runtimeRoot -FailureCode 'A17_S1AR_ARCHIVE_EXTRACT_FAILED')
  Remove-Item -LiteralPath $archivePath -Force

  $runtimeConfig = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot 'supabase\config.toml')
  $configText = [System.IO.File]::ReadAllText($runtimeConfig)
  $projectMatches = [regex]::Matches($configText, '(?m)^project_id\s*=\s*"[^"]*"\s*$')
  if ($projectMatches.Count -ne 1) { throw 'A17_S1AR_PROJECT_ID_CONFIG_REJECTED' }
  $runtimeConfigText = [regex]::Replace($configText, '(?m)^project_id\s*=\s*"[^"]*"\s*$', "project_id = `"$ProjectId`"")
  [System.IO.File]::WriteAllText($runtimeConfig, $runtimeConfigText, [System.Text.UTF8Encoding]::new($false))

  $cliLatestPath = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot 'supabase\.temp\cli-latest')
  [void][System.IO.Directory]::CreateDirectory((Split-Path -Parent $cliLatestPath))
  [System.IO.File]::WriteAllBytes($cliLatestPath, [System.Text.Encoding]::UTF8.GetBytes($CliLatestBytes))
  if ((Get-LowerSha256 $cliLatestPath) -cne $CliLatestSha256 -or [System.IO.File]::ReadAllText($cliLatestPath) -cne $CliLatestBytes) { throw 'A17_S1AR_CLI_LATEST_IDENTITY_REJECTED' }

  $supabaseProcessEnvironment = @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; SystemRoot = $SystemRootPath }
  $startAttempted = $true
  [void](Invoke-ClosedProcess -FilePath $SupabaseExecutable -Arguments @("start", "--workdir", $runtimeRoot, '--exclude', 'studio,imgproxy,mailpit,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta') -WorkingDirectory $runtimeRoot -Environment $supabaseProcessEnvironment -FailureCode 'A17_S1AR_SUPABASE_START_REJECTED')
  Assert-OwnedRuntimeState -RequireExact

  $statusResult = Invoke-ClosedProcess -FilePath $SupabaseExecutable -Arguments @('status', '--workdir', $runtimeRoot, '--output', 'env') -WorkingDirectory $runtimeRoot -Environment $supabaseProcessEnvironment -FailureCode 'A17_S1AR_SUPABASE_STATUS_REJECTED'
  $statusEnvironment = Read-StatusEnvironment -Text $statusResult.Stdout
  $sqlPath = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot 'supabase\tests\drs_secure_session_runtime_live_pg_w1.sql')
  $sqlSource = [System.IO.File]::ReadAllText($sqlPath)
  [void](Invoke-ClosedProcess -FilePath $DockerExecutable -Arguments @('exec', '-i', "supabase_db_$ProjectId", 'psql', '--no-psqlrc', '--quiet', '--set=ON_ERROR_STOP=1', '--set=a17_phase=catalog-lifecycle', '--username=postgres', '--dbname=postgres') -WorkingDirectory $runtimeRoot -Environment @{ DOCKER_CLI_HINTS = 'false' } -StandardInput $sqlSource -FailureCode 'A17_S1AR_SQL_LIVE_REJECTED')

  $cookieKey = ConvertTo-base64url43
  $proofKey = ConvertTo-base64url43
  if ($cookieKey -ceq $proofKey) { throw 'A17_S1AR_INDEPENDENT_KEY_REJECTED' }
  $denoEnvironment = @{
    DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; A17_S1AR_RUNTIME_CONFIRMED = $ConfirmationValue
    SUPABASE_URL = $statusEnvironment['API_URL']; SUPABASE_SERVICE_ROLE_KEY = $statusEnvironment['SERVICE_ROLE_KEY']
    LAIBE_DRS_APP_ORIGIN = 'https://127.0.0.1:44443'; LAIBE_DRS_SESSION_SUCCESS_URL = 'https://127.0.0.1:44443/specialist'
    LAIBE_DRS_SESSION_COOKIE_NAME = '__Host-laibe-drs-session'; LAIBE_DRS_SESSION_COOKIE_KEY_V1 = $cookieKey; LAIBE_DRS_BFF_PROOF_KEY_V1 = $proofKey
  }
  $denoCacheRoot = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot '.deno-cache')
  [void][System.IO.Directory]::CreateDirectory($denoCacheRoot)
  $denoEnvironment['DENO_DIR'] = $denoCacheRoot
  [void]$denoEnvironment.Remove('LAIBE_ALLOWED_ORIGINS')
  $allowEnvironment = @($ConfirmationName, 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'LAIBE_DRS_APP_ORIGIN', 'LAIBE_DRS_SESSION_SUCCESS_URL', 'LAIBE_DRS_SESSION_COOKIE_NAME', 'LAIBE_DRS_SESSION_COOKIE_KEY_V1', 'LAIBE_DRS_BFF_PROOF_KEY_V1') -join ','
  $denoTestPath = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot 'supabase\tests\drs_secure_session_runtime_live_w1.test.mjs')
  $denoAttempted = $true
  $denoResult = Invoke-ClosedProcess -FilePath $denoExecutable -Arguments @('test', '--no-config', '--cached-only', '--no-prompt', '--fail-fast', "--allow-env=$allowEnvironment", '--allow-net=127.0.0.1:54321,127.0.0.1:54329,127.0.0.1:58017', "--allow-read=$runtimeRoot", "--allow-run=$DockerExecutable", '--deny-write', $denoTestPath) -WorkingDirectory $runtimeRoot -Environment $denoEnvironment -AllowFailure -FailureCode 'A17_S1AR_DENO_LIVE_REJECTED'
  $sanitizedText = $denoResult.Stdout + "`n" + $denoResult.Stderr
  Assert-CapturedOutputSanitized -Text ($denoResult.Stdout + "`n" + $denoResult.Stderr) -SUPABASE_SERVICE_ROLE_KEY $statusEnvironment['SERVICE_ROLE_KEY'] -LAIBE_DRS_SESSION_COOKIE_KEY_V1 $cookieKey -LAIBE_DRS_BFF_PROOF_KEY_V1 $proofKey
  if ($denoResult.ExitCode -ne 0) {
    $causalVerdict = Read-ExactCausalVerdict -Text $sanitizedText
    if ($null -ne $causalVerdict) { $primaryResult = $causalVerdict } else { throw 'A17_S1AR_DENO_LIVE_REJECTED' }
  } else {
    $primaryResult = 'A17_S1AR_DISPOSABLE_LOCAL_RUNTIME_PASS'
  }
}
catch {
  $primaryError = if ($_.Exception.Message -match '^A17_S1AR_[A-Z0-9_:,-]+$') { $_.Exception.Message } else { 'A17_S1AR_PRIMARY_REJECTED' }
  $primaryResult = 'A17_S1AR_DISPOSABLE_LOCAL_RUNTIME_FAIL'
}
finally {
  if ($denoAttempted) {
    try { Assert-HarnessCleanupReadback } catch { $cleanupErrors.Add('A17_S1AR_DENO_SQL_AUTH_CLEANUP_READBACK_FAILED') }
  }
  if ($startAttempted -and (Test-Path -LiteralPath $runtimeRoot)) {
    try { Invoke-ExactProjectStopCleanup; $stopSucceeded = $true } catch { $cleanupErrors.Add('A17_S1AR_EXACT_STOP_FAILED') }
  } else { $stopSucceeded = $true }
  try { Assert-OwnedRuntimeAbsent } catch { $cleanupErrors.Add('A17_S1AR_DOCKER_READBACK_FAILED') }
  try { Assert-ListenerAbsent } catch { $cleanupErrors.Add('A17_S1AR_LISTENER_READBACK_FAILED') }

  $preserveRuntimeRoot = !$stopSucceeded
  if ($cleanupErrors.Contains('A17_S1AR_DOCKER_READBACK_FAILED') -or $cleanupErrors.Contains('A17_S1AR_LISTENER_READBACK_FAILED')) { $preserveRuntimeRoot = $true }
  if (-not $preserveRuntimeRoot) {
    try {
      if (Test-Path -LiteralPath $runtimeRoot) {
        $exactRuntimeRoot = Assert-ExactDescendant -Root $worktreeRoot -Candidate (Join-Path $worktreeRoot '.a17-s1ar-runtime')
        if ($exactRuntimeRoot -cne $runtimeRoot) { throw 'A17_S1AR_CLEAN_ROOT_MISMATCH' }
        Remove-Item -LiteralPath $exactRuntimeRoot -Recurse -Force
      }
    } catch { $cleanupErrors.Add('A17_S1AR_CHILD_ROOT_CLEAN_FAILED') }
  }
  try { Assert-SourceIdentity -Stage "post-cleanup" } catch { $cleanupErrors.Add('A17_S1AR_SOURCE_IDENTITY_READBACK_FAILED') }

  $trace = [System.Collections.Generic.List[string]]::new()
  if ($cleanupErrors.Count -eq 0) {
    $trace.Add($primaryResult)
    if ($null -ne $primaryError) { $trace.Add('A17_S1AR_PRIMARY_FAILED_CLEANUP_CONFIRMED') }
  } else {
    $trace.Add($primaryResult)
    $trace.Add('A17_S1AR_CLEANUP_FAILED')
  }
  if ($null -ne $primaryError) { $trace.Add("PRIMARY=$primaryError") }
  foreach ($cleanupError in $cleanupErrors) { $trace.Add("CLEANUP=$cleanupError") }
  if ($cleanupErrors.Count -eq 0 -and $primaryResult -eq 'A17_S1AR_DISPOSABLE_LOCAL_RUNTIME_PASS') { $terminalExitCode = 0 }
  $terminalResult = $trace -join ';'
  Write-Output $terminalResult
}

exit $terminalExitCode
