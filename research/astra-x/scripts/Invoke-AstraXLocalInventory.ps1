[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-ReadOnlyCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    try {
        $output = @(& $FilePath @Arguments 2>&1 | ForEach-Object { "$_" })
        $exitCode = $LASTEXITCODE
        return [ordered]@{
            available = $true
            exitCode = $exitCode
            output = $output
        }
    }
    catch {
        return [ordered]@{
            available = $false
            exitCode = $null
            output = @($_.Exception.Message)
        }
    }
}

$result = [ordered]@{
    generatedAtUtc = [DateTime]::UtcNow.ToString("o")
    machine = [Environment]::MachineName
    operatingSystem = [Environment]::OSVersion.VersionString
    gpu = $null
    ollama = [ordered]@{
        installed = $false
        version = $null
        models = $null
        runningModels = $null
        localApiVersion = $null
    }
    safety = @(
        "Read-only inventory only; no files, drivers, models, services or settings are changed.",
        "Only the local Ollama API at 127.0.0.1:11434 is queried.",
        "No API keys, bearer tokens, environment variables or remote endpoints are collected."
    )
}

$nvidia = Get-Command "nvidia-smi" -ErrorAction SilentlyContinue
if ($null -ne $nvidia) {
    $result.gpu = Invoke-ReadOnlyCommand -Name "nvidia-smi" -FilePath $nvidia.Source -Arguments @(
        "--query-gpu=name,memory.total,driver_version",
        "--format=csv,noheader"
    )
}
else {
    $result.gpu = [ordered]@{
        available = $false
        exitCode = $null
        output = @("nvidia-smi was not found on PATH.")
    }
}

$ollama = Get-Command "ollama" -ErrorAction SilentlyContinue
if ($null -ne $ollama) {
    $result.ollama.installed = $true
    $result.ollama.version = Invoke-ReadOnlyCommand -Name "ollama version" -FilePath $ollama.Source -Arguments @("--version")
    $result.ollama.models = Invoke-ReadOnlyCommand -Name "ollama list" -FilePath $ollama.Source -Arguments @("list")
    $result.ollama.runningModels = Invoke-ReadOnlyCommand -Name "ollama ps" -FilePath $ollama.Source -Arguments @("ps")
}
else {
    $result.ollama.version = @{ available = $false; output = @("Ollama was not found on PATH.") }
    $result.ollama.models = @{ available = $false; output = @() }
    $result.ollama.runningModels = @{ available = $false; output = @() }
}

try {
    $api = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/version" -Method Get -TimeoutSec 3
    $result.ollama.localApiVersion = [ordered]@{
        reachable = $true
        version = [string]$api.version
    }
}
catch {
    $result.ollama.localApiVersion = [ordered]@{
        reachable = $false
        version = $null
        note = "Local Ollama API did not respond on 127.0.0.1:11434. No other address was tried."
    }
}

$result | ConvertTo-Json -Depth 8
