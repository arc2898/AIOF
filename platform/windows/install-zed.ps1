$ErrorActionPreference = 'Stop'
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'Windows Package Manager (winget) is required. Install App Installer from Microsoft Store.' }
winget install --exact --id ZedIndustries.Zed --accept-source-agreements --accept-package-agreements
if ($LASTEXITCODE -ne 0) { throw 'Zed installation failed.' }
Write-Host 'Zed installed. Restart AIOF to refresh engine detection.' -ForegroundColor Green
