$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$Source = Join-Path $Root "vendor/upstream/7zip/CPP/7zip"
$Output = Join-Path $Root "resources/engines/windows/archive"
if (-not (Get-Command nmake.exe -ErrorAction SilentlyContinue)) {
  throw "Microsoft C++ Build Tools are required. Run this script from a Visual Studio Developer PowerShell with nmake available."
}
Push-Location (Join-Path $Source "UI/Console")
try { nmake.exe /f makefile } finally { Pop-Location }
Push-Location (Join-Path $Source "Bundles/Format7zF")
try { nmake.exe /f makefile } finally { Pop-Location }
New-Item -ItemType Directory -Force -Path $Output | Out-Null
Copy-Item -Force (Join-Path $Source "UI/Console/o/7z.exe") (Join-Path $Output "7z.exe")
Copy-Item -Force (Join-Path $Source "Bundles/Format7zF/o/7z.dll") (Join-Path $Output "7z.dll")
Write-Host "Bundled Windows 7-Zip engine staged in $Output"
