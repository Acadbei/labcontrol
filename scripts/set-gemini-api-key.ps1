$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env.production.local'
$secret = Read-Host 'Enter your GEMINI_API_KEY' -AsSecureString
$pointer = [IntPtr]::Zero
$plainKey = $null

try {
  if ($secret.Length -lt 20) { throw 'Gemini API key looks too short.' }
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secret)
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringUni($pointer)
  if ($plainKey -notmatch '^[A-Za-z0-9._-]{20,512}$') { throw 'Gemini API key format is not valid.' }

  $existingLines = if (Test-Path -LiteralPath $envFile) { [IO.File]::ReadAllLines($envFile) } else { @() }
  $preservedLines = @($existingLines | Where-Object { $_ -notmatch '^\s*(GEMINI_API_KEY|GEMINI_API)\s*=' })
  $updatedLines = @($preservedLines + "GEMINI_API_KEY=$plainKey")
  $content = [string]::Join([Environment]::NewLine, $updatedLines) + [Environment]::NewLine
  [IO.File]::WriteAllText($envFile, $content, [Text.UTF8Encoding]::new($false))
  Write-Host 'Gemini API key saved to the ignored .env.production.local file. Restart LabControl to load it.'
}
finally {
  $plainKey = $null
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($pointer) }
  if ($secret) { $secret.Dispose() }
}
