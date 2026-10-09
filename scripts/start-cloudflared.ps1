$ErrorActionPreference = 'Stop'

$cloudflaredDir = Join-Path $env:LOCALAPPDATA 'LabControl\cloudflared'
$cloudflared = Join-Path $cloudflaredDir 'cloudflared.exe'
$tokenFile = Join-Path $cloudflaredDir 'miyya-labcontrol.token'
if (Get-Process -Name cloudflared -ErrorAction SilentlyContinue) { exit 0 }

Start-Process -FilePath $cloudflared `
  -ArgumentList ('tunnel run --token-file "{0}"' -f $tokenFile) `
  -WorkingDirectory $cloudflaredDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $cloudflaredDir 'connector.log') `
  -RedirectStandardError (Join-Path $cloudflaredDir 'connector-error.log')
