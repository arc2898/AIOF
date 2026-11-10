$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$Source = Join-Path $Root 'vendor/upstream/stirling-pdf-core'
$Output = Join-Path $Root 'resources/engines/common/pdf/stirling-pdf.jar'
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'JDK 25+ is required.' }
$JavaVersion = (java -version 2>&1 | Select-Object -First 1)
if ($JavaVersion -notmatch '"25\.|"2[6-9]\.|"[3-9][0-9]\.') { throw "Java 25+ required. Detected: $JavaVersion" }
if (-not (Test-Path (Join-Path $Source 'gradlew.bat'))) { throw 'Stirling PDF core source is missing.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22+ is required.' }
Push-Location $Source
try {
  $env:STIRLING_FLAVOR = 'core'
  $env:DISABLE_ADDITIONAL_FEATURES = 'true'
  .\gradlew.bat :stirling-pdf:bootJar -PbuildWithFrontend=true -PfrontendMode=core -PbuildWithPortal=false -PbundleOnnxRuntime=false -x test
  if ($LASTEXITCODE -ne 0) { throw 'Stirling PDF core build failed.' }
  $Jar = Get-ChildItem 'app\core\build\libs\*.jar' | Where-Object { $_.Name -notmatch '-plain\.jar$' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $Jar) { throw 'Could not locate the generated boot JAR.' }
  New-Item -ItemType Directory -Force -Path (Split-Path $Output) | Out-Null
  Copy-Item -LiteralPath $Jar.FullName -Destination $Output -Force
  Write-Host "Staged Stirling PDF core: $Output" -ForegroundColor Green
} finally { Pop-Location }
