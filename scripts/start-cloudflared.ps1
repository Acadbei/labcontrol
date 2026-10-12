$ErrorActionPreference = 'Stop'

$cloudflaredDir = Join-Path $env:LOCALAPPDATA 'LabControl\cloudflared'
$cloudflared = Join-Path $cloudflaredDir 'cloudflared.exe'
$configFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'cloudflared-config.yml'
if (Get-Process -Name cloudflared -ErrorAction SilentlyContinue) { exit 0 }

Start-Process -FilePath $cloudflared `
  -ArgumentList ('tunnel --config "{0}" run 26db28d5-e5a7-47f0-a4c4-21915b449eb3' -f $configFile) `
  -WorkingDirectory $cloudflaredDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $cloudflaredDir 'connector.log') `
  -RedirectStandardError (Join-Path $cloudflaredDir 'connector-error.log')
