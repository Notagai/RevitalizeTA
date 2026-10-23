param(
  [string]$Repo = 'C:\Dev\RevitalizeTA',
  [int]$MaxMinutes = 180
)
$ErrorActionPreference = 'Stop'
if ($MaxMinutes -lt 1 -or $MaxMinutes -gt 180) { throw 'MaxMinutes must be 1 to 180.' }
if (-not (Get-Command codex.cmd -ErrorAction SilentlyContinue)) { throw 'Install Codex CLI and sign in with ChatGPT first.' }
if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "Missing Git repository: $Repo" }
# Validate the host's Android environment before creating a branch.
$javaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
if (-not $env:JAVA_HOME -and $javaHome) { $env:JAVA_HOME = $javaHome }
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
}
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adb = Join-Path $sdk 'platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "ADB not found: $adb" }
$env:ANDROID_HOME = $sdk
$env:Path = (Join-Path $sdk 'platform-tools') + ';' + $env:Path
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java unavailable. Configure JAVA_HOME first.' }
$devices = @(& $adb devices | Select-String '^emulator-\d+\s+device\s*
if ((git branch --show-current).Trim() -ne 'main') { throw 'Start from main.' }
if ((git status --porcelain | Out-String).Trim()) { throw 'Commit or stash working changes before starting.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$branch = "codex/night-$stamp"
git switch -c $branch
if ($LASTEXITCODE -ne 0) { throw 'Unable to create the nightly branch.' }
$logDir = Join-Path $Repo '.codex-night-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdout = Join-Path $logDir "$stamp-output.txt"
$stderr = Join-Path $logDir "$stamp-progress.txt"
$promptFile = Join-Path $Repo 'docs/AGENT_NIGHT_PROMPT.md'
Write-Host 'Preflight: checking ADB shell accessibility...'
& $adb -s $serial shell getprop ro.build.version.release
if ($LASTEXITCODE -ne 0) { throw 'ADB emulator shell unavailable.' }
$argsList = @('exec', '--sandbox', 'workspace-write', '-c', 'model_reasoning_effort="low"', '-')
Write-Host "Starting $branch for at most $MaxMinutes minutes."
$p = Start-Process -FilePath 'codex.cmd' -ArgumentList $argsList -PassThru -NoNewWindow -RedirectStandardInput $promptFile -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$timedOut = -not $p.WaitForExit($MaxMinutes * 60000)
if ($timedOut) { taskkill /PID $p.Id /T /F | Out-Null }
$p.Refresh()
$report = Join-Path $logDir "$stamp-report.txt"
@(
  "Branch: $branch",
  "Outcome: $(if ($timedOut) {'TIMEOUT'} else {$p.ExitCode})",
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
  "Verbose log: $stderr"
) | Set-Content $report -Encoding UTF8
Write-Host "Finished. Review $report; do not merge unverified work."
)
if ($devices.Count -ne 1) { throw "Start exactly one connected Android emulator first. Found $($devices.Count)." }
$serial = (($devices[0].Line -split '\s+')[0]).Trim()
$env:ANDROID_SERIAL = $serial
Write-Host "Android emulator detected: $serial"
Set-Location $Repo
if ((git branch --show-current).Trim() -ne 'main') { throw 'Start from main.' }
if ((git status --porcelain | Out-String).Trim()) { throw 'Commit or stash working changes before starting.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$branch = "codex/night-$stamp"
git switch -c $branch
if ($LASTEXITCODE -ne 0) { throw 'Unable to create the nightly branch.' }
$logDir = Join-Path $Repo '.codex-night-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdout = Join-Path $logDir "$stamp-output.txt"
$stderr = Join-Path $logDir "$stamp-progress.txt"
$promptFile = Join-Path $Repo 'docs/AGENT_NIGHT_PROMPT.md'
$argsList = @('exec', '--sandbox', 'workspace-write', '-c', 'model_reasoning_effort="low"', '-')
Write-Host "Starting $branch for at most $MaxMinutes minutes."
$p = Start-Process -FilePath 'codex.cmd' -ArgumentList $argsList -PassThru -NoNewWindow -RedirectStandardInput $promptFile -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$timedOut = -not $p.WaitForExit($MaxMinutes * 60000)
if ($timedOut) { taskkill /PID $p.Id /T /F | Out-Null }
$p.Refresh()
$report = Join-Path $logDir "$stamp-report.txt"
@(
  "Branch: $branch",
  "Outcome: $(if ($timedOut) {'TIMEOUT'} else {$p.ExitCode})",
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
  "Verbose log: $stderr"
) | Set-Content $report -Encoding UTF8
Write-Host "Finished. Review $report; do not merge unverified work."
