param()
# Explicitly copies only the stored browser worker credential to the Windows
# clipboard so it can be entered into Vercel's protected Production environment.
# Never prints it to stdout, writes it as plaintext, or sends it over a network.
$ErrorActionPreference = "Stop"
$path = Join-Path $env:LOCALAPPDATA "Blackstar\browser-worker\worker-token.clixml"
if (-not (Test-Path $path)) { throw "No encrypted browser worker token exists. Start the local worker first." }
$secure = Import-Clixml -Path $path
if (-not ($secure -is [securestring])) { throw "The worker token is not an encrypted secure string." }
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if (-not $token -or $token.Length -lt 40) { throw "The local token is missing or too short." }
  Set-Clipboard -Value $token
  Write-Host "Worker token copied to clipboard. Paste it ONLY into Vercel's PLAYWRIGHT_BROWSER_TOKEN secret field."
  Write-Host "Clear the clipboard after pasting. Never paste the token into a chat, issue, screenshot or source file."
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Variable token -ErrorAction SilentlyContinue
}
