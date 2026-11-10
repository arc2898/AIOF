# Windows build

Run `./platform/windows/build.ps1` from PowerShell at the repository root. The script installs npm dependencies if needed, checks the Electron main-process syntax, builds the renderer, and produces NSIS plus portable packages in `release/`.

Requirements: Node.js 22.12+, npm, PowerShell 5.1+ / PowerShell 7, and network access to the npm registry on first install. Signing is not configured; use your release certificate and signing process before public distribution.


## Optional engine staging

Set `AIOF_QBITTORRENT_DIR`, `AIOF_VLC_DIR`, `AIOF_7ZIP_DIR` and/or `AIOF_OFFICE_DIR` to the directories containing platform executables, then run `./platform/windows/stage-engines.ps1`. For torrent control, the staging helper prefers `qbittorrent-nox.exe` if your build provides one, otherwise it accepts `qbittorrent.exe` (which may display its own native window).
