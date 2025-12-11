<#
.SYNOPSIS
  Update Render service start command, upload env vars from a file, and trigger a deploy.

.DESCRIPTION
  Uses the Render REST API. Requires environment variables:
    RENDER_API_KEY (account API key)
    RENDER_SERVICE_ID (service id, e.g. srv-xxxx)

  Example:
    $env:RENDER_API_KEY = 'rnd_...'
    $env:RENDER_SERVICE_ID = 'srv-...'
    .\scripts\render_deploy.ps1 -StartCommand "gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120" -EnvFile .render_env
#>

param(
    [string]$StartCommand = '',
    [string]$EnvFile = ''
)

if (-not $env:RENDER_API_KEY) {
    Write-Error "RENDER_API_KEY environment variable is not set. Aborting."
    exit 2
}
if (-not $env:RENDER_SERVICE_ID) {
    Write-Error "RENDER_SERVICE_ID environment variable is not set. Aborting."
    exit 2
}

$ApiBase = 'https://api.render.com/v1'
$Headers = @{ Authorization = "Bearer $($env:RENDER_API_KEY)"; 'Content-Type' = 'application/json' }
$Svc = $env:RENDER_SERVICE_ID

try {
    if ($StartCommand) {
        Write-Output "Updating Start Command for service $Svc..."
        $body = @{ startCommand = $StartCommand } | ConvertTo-Json
        $resp = Invoke-RestMethod -Method Patch -Uri "$ApiBase/services/$Svc" -Headers $Headers -Body $body
        Write-Output "Service update response: $($resp | ConvertTo-Json -Depth 2)" | Select-Object -First 1
    }

    if ($EnvFile -and (Test-Path $EnvFile)) {
        Write-Output "Uploading env vars from $EnvFile..."
        $existing = Invoke-RestMethod -Method Get -Uri "$ApiBase/services/$Svc/env-vars" -Headers $Headers

        Get-Content $EnvFile | ForEach-Object {
            $line = $_.Trim()
            if (-not $line -or $line.StartsWith('#')) { return }
            $parts = $line -split('=',2)
            if ($parts.Count -lt 2) { return }
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()

            $found = $existing | Where-Object { $_.key -eq $key }
            if ($found) {
                Write-Output "Updating env var $key (id=$($found.id))"
                $payload = @{ value = $val; secure = $true } | ConvertTo-Json
                Invoke-RestMethod -Method Patch -Uri "$ApiBase/services/$Svc/env-vars/$($found.id)" -Headers $Headers -Body $payload
            } else {
                Write-Output "Creating env var $key"
                $payload = @{ key = $key; value = $val; secure = $true } | ConvertTo-Json
                Invoke-RestMethod -Method Post -Uri "$ApiBase/services/$Svc/env-vars" -Headers $Headers -Body $payload
            }
        }
    }

    Write-Output "Triggering deploy for service $Svc..."
    $deployResp = Invoke-RestMethod -Method Post -Uri "$ApiBase/services/$Svc/deploys" -Headers $Headers -Body '{}' -ErrorAction Stop
    Write-Output "Deploy triggered: $($deployResp | ConvertTo-Json -Depth 2)"
    Write-Output "Done. Monitor deploy in the Render dashboard."
}
catch {
    Write-Error "Error during Render API call: $_"
    exit 3
}
