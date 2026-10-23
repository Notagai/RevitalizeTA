param(
  [string]$Repo = 'C:\Dev\RevitalizeTA',
  [ValidateRange(1,180)][int]$MaxMinutes = 180
)

$ErrorActionPreference = 'Stop'
$codex = Get-Command codex.cmd -ErrorAction SilentlyContinue
if (-not $codex) { throw 'Codex CLI unavailable. Install it and run codex login.' }
if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "Git repository missing: $Repo" }

$javaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
if (-not $env:JAVA_HOME -and $javaHome) { $env:JAVA_HOME = $javaHome }
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
}
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  throw 'Java unavailable. Configure JAVA_HOME before starting.'
}

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adb = Join-Path $sdk 'platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "ADB not found: $adb" }
$env:ANDROID_HOME = $sdk
$env:Path = (Join-Path $sdk 'platform-tools') + ';' + $env:Path

$deviceLines = @(& $adb devices | Select-String '^emulator-\d+\s+device\s*$')
if ($deviceLines.Count -ne 1) {
  throw "Start exactly one Android emulator before running Codex. Found $($deviceLines.Count)."
}
$serial = (($deviceLines[0].Line -split '\s+')[0]).Trim()
$env:ANDROID_SERIAL = $serial
Write-Host "Emulator connected: $serial"
& $adb -s $serial shell getprop ro.build.version.release
if ($LASTEXITCODE -ne 0) { throw 'Unable to access the emulator through ADB.' }

Set-Location $Repo
if ((git branch --show-current).Trim() -ne 'main') { throw 'Switch to main before starting.' }
if ((git status --porcelain | Out-String).Trim()) {
  throw 'Commit or stash local changes before starting.'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$branch = "codex/night-$stamp"
$logDir = Join-Path $Repo '.codex-night-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stdout = Join-Path $logDir "$stamp-output.txt"
$stderr = Join-Path $logDir "$stamp-progress.txt"
$report = Join-Path $logDir "$stamp-report.txt"
$promptFile = Join-Path $Repo 'docs/AGENT_NIGHT_PROMPT.md'
if (-not (Test-Path $promptFile)) { throw "Prompt file missing: $promptFile" }

git switch -c $branch
if ($LASTEXITCODE -ne 0) { throw 'Could not create a dedicated Codex branch.' }

Write-Host "Starting Codex on $branch (maximum $MaxMinutes minutes)."
Write-Host "Output: $stdout"
$timedOut = $false
$exitCode = -1
try {
  $arguments = @('exec', '--sandbox', 'workspace-write', '-c', 'model_reasoning_effort="low"', '-')
  $process = Start-Process -FilePath $codex.Source -ArgumentList $arguments -NoNewWindow -PassThru `
    -RedirectStandardInput $promptFile -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  if (-not $process.WaitForExit($MaxMinutes * 60000)) {
    $timedOut = $true
    & taskkill.exe /PID $process.Id /T /F | Out-Null
    $process.WaitForExit()
  }
  $process.Refresh()
  $exitCode = $process.ExitCode
} finally {
  @(
    "Branch: $branch",
    "Outcome: $(if ($timedOut) { 'TIMEOUT' } else { "Exit code $exitCode" })",
    "HEAD: $(git rev-parse --short HEAD)",
    '',
    'Working tree:',
    (git status --short | Out-String),
    'Nightly commits:',
    (git log --oneline main..HEAD | Out-String),
    '',
    'Agent summary:',
    (Get-Content $stdout -Raw -ErrorAction SilentlyContinue),
    '',
    "Progress and errors: $stderr"
  ) | Set-Content -Path $report -Encoding UTF8
  Write-Host "Finished. Review $report before merging anything."
}
