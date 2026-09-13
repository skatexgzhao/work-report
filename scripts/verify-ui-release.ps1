# Verify built frontend contains expected home-guide strings.
# Usage: powershell -NoProfile -File scripts/verify-ui-release.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
node (Join-Path $Root 'scripts\verify-ui-release.mjs')
exit $LASTEXITCODE
