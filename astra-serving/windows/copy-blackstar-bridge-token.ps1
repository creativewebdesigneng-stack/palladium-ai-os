$ErrorActionPreference = "Stop"
$tokenSecretPath = Join-Path $env:LOCALAPPDATA "Blackstar\runtime\bridge-token.clixml"

if (-not (Test-Path $tokenSecretPath)) {
  throw "No encrypted Blackstar bridge token was found. Run setup-blackstar-tailscale-funnel.ps1 first."
}

$secure = Import-Clixml -Path $tokenSecretPath
if (-not ($secure -is [System.Security.SecureString])) {
  throw "The Blackstar bridge token store is invalid. Rerun setup-blackstar-tailscale-funnel.ps1 to rotate it."
}

$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $token = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if (-not $token) { throw "The Blackstar bridge token could not be decrypted for this Windows user." }
  Set-Clipboard -Value $token
  Write-Host "Blackstar bridge bearer token copied to the clipboard. The secret was not printed." -ForegroundColor Green
} finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  $token = $null
}
