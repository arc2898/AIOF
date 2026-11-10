$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$Dest = Join-Path $Root 'resources/engines/windows'
function Copy-EngineFolder([string]$Key, [string]$Source, [string]$Expected) {
  if (-not $Source) { return }
  $Resolved = (Resolve-Path $Source -ErrorAction Stop).Path
  if (-not (Test-Path (Join-Path $Resolved $Expected))) { throw "$Key source folder does not contain $Expected: $Resolved" }
  $Target = Join-Path $Dest $Key
  if (Test-Path $Target) { Get-ChildItem $Target -Force | Remove-Item -Recurse -Force }
  Copy-Item -Path (Join-Path $Resolved '*') -Destination $Target -Recurse -Force
  Write-Host "Staged $Key from $Resolved"
}
if ($env:AIOF_QBITTORRENT_DIR) {
  $QbitExpected = if (Test-Path (Join-Path $env:AIOF_QBITTORRENT_DIR 'qbittorrent-nox.exe')) { 'qbittorrent-nox.exe' } else { 'qbittorrent.exe' }
  Copy-EngineFolder 'torrent' $env:AIOF_QBITTORRENT_DIR $QbitExpected
}
Copy-EngineFolder 'archive' $env:AIOF_7ZIP_DIR '7z.exe'
