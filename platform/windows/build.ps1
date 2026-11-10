$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $ProjectRoot

Write-Host 'AIOF Windows builder' -ForegroundColor Cyan
# Remove only previous build artifacts. Installed application data is never touched.
if (Test-Path 'release') { Remove-Item -LiteralPath 'release' -Recurse -Force }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22.12+ is required. Install it from https://nodejs.org/' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required.' }
$NodeVersion = [version]((node -p "process.versions.node").Trim())
if ($NodeVersion -lt [version]'22.12.0') { throw "Node.js 22.12+ is required. Found $NodeVersion." }

if (Test-Path 'package-lock.json') { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
npm run lint:syntax
if ($LASTEXITCODE -ne 0) { throw 'Main-process syntax validation failed.' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Project tests failed.' }
npm run dist:windows
if ($LASTEXITCODE -ne 0) { throw 'Windows packaging failed.' }
Write-Host "Build finished. Artifacts are in: $ProjectRoot\release" -ForegroundColor Green
