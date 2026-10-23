param(
  [string]$Repo = 'C:\Dev\RevitalizeTA',
  [int]$MaxMinutes = 180
)
$ErrorActionPreference = 'Stop'
if ($MaxMinutes -lt 1 -or $MaxMinutes -gt 180) { throw 'MaxMinutes must be 1 to 180.' }
if (-not (Get-Command codex.cmd -ErrorAction SilentlyContinue)) { throw 'Install Codex CLI and sign in with ChatGPT first.' }
if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "Missing Git repository: $Repo" }
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
