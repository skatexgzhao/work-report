# Pre-push security check for GitHub publish.
# Run from team-report root:
#   powershell -NoProfile -File scripts/publish-security-check.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$fail = @()
$warn = @()

$repoRoot = (git -C $Root rev-parse --show-toplevel 2>$null).Trim()
if (-not $repoRoot) {
  Write-Host "Not a git repository." -ForegroundColor Red
  exit 1
}

$rootNorm = (Resolve-Path $Root).Path.Replace('\', '/')
$repoNorm = $repoRoot.Replace('\', '/')
if ($rootNorm -eq $repoNorm) {
  $gitPrefix = ''
} elseif ($rootNorm.StartsWith($repoNorm)) {
  $gitPrefix = $rootNorm.Substring($repoNorm.Length).TrimStart('/') + '/'
} else {
  $fail += "Project root is not inside git toplevel: $Root"
  $gitPrefix = ''
}

function Get-Tracked {
  param([string]$Pattern)
  git -C $repoRoot ls-files -- "${gitPrefix}${Pattern}" 2>$null
}

Write-Host "=== Team Report publish security check ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Git prefix: '$gitPrefix'`n"

# 1. Forbidden tracked files
$forbiddenPatterns = @(
  '.env',
  'backend/.env',
  'deploy/config.env',
  'backend/teamplan.db',
  'frontend/dist/index.html',
  'COMET.md',
  '.cursor/rules/comet-phase-guard.mdc',
  'openspec/config.yaml',
  'docs/superpowers/README.md'
)
foreach ($p in $forbiddenPatterns) {
  $tracked = Get-Tracked $p
  if ($tracked) {
    $fail += "Tracked file that must not be published: ${gitPrefix}${p}"
  }
}

# 2. Local secret files on disk
$localSecrets = @(
  (Join-Path $Root 'backend\.env'),
  (Join-Path $Root 'deploy\config.env'),
  (Join-Path $Root 'backend\teamplan.db')
)
foreach ($f in $localSecrets) {
  if (Test-Path $f) {
    $ignored = git check-ignore -v $f 2>$null
    if ($ignored) {
      Write-Host "[OK] Ignored: $f" -ForegroundColor DarkGray
    } else {
      $fail += "Local secret/data file exists but is NOT gitignored: $f"
    }
  }
}

# 3. Scan tracked text for obvious API key patterns
$listArg = if ($gitPrefix) { "${gitPrefix}" } else { '.' }
$files = git -C $repoRoot ls-files -- $listArg 2>$null | Where-Object {
  $_ -match '\.(js|ts|vue|json|md|yml|yaml|env\.example|sh|ps1)$' -and $_ -notmatch 'package-lock\.json'
}
$keyPattern = '(?i)(sk-[a-z0-9]{24,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----)'
foreach ($rel in $files) {
  $full = Join-Path $repoRoot ($rel -replace '/', '\')
  if (-not (Test-Path $full)) { continue }
  $content = Get-Content -Raw -LiteralPath $full -ErrorAction SilentlyContinue
  if ($content -match $keyPattern) {
    if ($rel -match '\.env\.example$|config\.env\.example$|MANUAL_TEST|README|publish-security-check') {
      $warn += "Possible placeholder secret pattern in $rel (verify it is not a real key)"
    } else {
      $fail += "Suspected real secret in tracked file: $rel"
    }
  }
}

# 4. Required publish files
$required = @('LICENSE', 'README.md', 'backend\.env.example', '.gitignore')
foreach ($r in $required) {
  if (-not (Test-Path (Join-Path $Root $r))) {
    $fail += "Missing recommended publish file: $r"
  }
}

if ($warn.Count -gt 0) {
  Write-Host "`nWarnings:" -ForegroundColor Yellow
  $warn | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

if ($fail.Count -gt 0) {
  Write-Host "`nFAILED ($($fail.Count)):" -ForegroundColor Red
  $fail | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "`nALL CHECKS PASSED - safe to push source (still review LICENSE/copyright and employer policy)." -ForegroundColor Green
exit 0
