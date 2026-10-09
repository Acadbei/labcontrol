$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) { exit 0 }

$env:LABCONTROL_NEXT_DIST_DIR = '.next-labcontrol'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$nextBin = Join-Path $projectRoot 'node_modules\next\dist\bin\next'
$logDir = Join-Path $env:LOCALAPPDATA 'LabControl'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Start-Process -FilePath $node `
  -ArgumentList ('"{0}" start --hostname 127.0.0.1 --port 3000' -f $nextBin) `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir 'labcontrol-server.log') `
  -RedirectStandardError (Join-Path $logDir 'labcontrol-server-error.log')
