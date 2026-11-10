# AIOF — All-in-One File Manager

**Source version: 0.7.2 (development source; installers not certified).** AIOF is a local-first desktop application for Windows 10/11 and Linux. It uses one AIOF window for file browsing, previews, downloads, system tools and in-app editing. Background engine processes may be used for services such as torrenting or PDF processing, but AIOF does not intentionally open companion GUI applications for its core workflows.


## Current app experience

- **Home and Quick Access:** drives with used/free storage meters, pinned folders, recent locations and most-used folders.
- **Explorer:** full paths, hidden files, list/grid layouts, multi-select, file actions, right-click actions, and a top-right local search field.
- **In-app file opening:** image/audio/video/PDF/text files open in AIOF. Unknown types show an in-app file-details panel with explicit text-inspection; they are not automatically launched in another desktop app. Archive double-click extracts within AIOF. OS file associations are registered where supported, but Windows still requires the user to select AIOF as their default app.
- **Image/media:** image preview with rotate/flip/zoom/tone adjustments and Save Copy; Chromium audio/video playback is built in. Full VLC codec/plugin coverage requires the matching libVLC runtime bundle.
- **Downloads:** AIOF's direct HTTP(S) download service uses up to 8 parallel byte-range segments for large files when the server advertises and passes range probing. Unsupported servers and smaller files use one stream. Pause/resume retains partial data. This is an IDM-style feature set, not the original IDM binary or browser extension.
- **Torrent:** loopback qBittorrent Web API control and a managed service lifecycle. A platform-matched headless qBittorrent runtime still needs to be staged.
- **Archives:** ZIP creation/extraction in-app. Linux x86_64 has a tested bundled 7-Zip 25.01 CLI + format plugin. Windows has a source-build helper but its runtime is not yet verified.
- **Office:** AIOF includes the supplied ElixirOffice source, but its generated `desktop/assets/` renderer bundle is missing from the ZIP. Full DOCX/XLSX/PPTX editing is therefore not enabled yet. The current Office landing page and HTML/CSV drafts are not a substitute for full Office compatibility.
- **PDF:** in-app Chromium PDF preview and a local Stirling PDF core service adapter. The JAR and a Java 25+ runtime are not included yet.
- **Code editor:** lightweight in-window text/source editor with syntax colors and local saves. It is not the full Zed IDE; the Zed runtime/source was not supplied.
- **Personalization:** Liquid Glass, neomorphism and Windows minimal surface styles; light/dark/system; accent presets/custom color; optional neon edge animation; wallpaper, tint, layout density and corner radius.
- **System utilities:** local search, disk usage, temporary/cache scan and cautious cleanup, plus an opt-in internet speed test.

## Screenshots

![AIOF screenshot 1](screenshots/Screenshot%202026-11-10%20061548.png)
![AIOF screenshot 2](screenshots/Screenshot%202026-11-10%20061618.png)
![AIOF screenshot 3](screenshots/Screenshot%202026-11-10%20061633.png)
![AIOF screenshot 4](screenshots/Screenshot%202026-11-10%20061646.png)
![AIOF screenshot 5](screenshots/Screenshot%202026-11-10%20061657.png)
![AIOF screenshot 6](screenshots/Screenshot%202026-11-10%20061701.png)
![AIOF screenshot 7](screenshots/Screenshot%202026-11-10%20061726.png)

## Runtime status and inputs needed

The exact runtime payloads still needed for a truly self-contained installer are listed in [`docs/ENGINE-BUNDLE-REQUEST.md`](docs/ENGINE-BUNDLE-REQUEST.md). Do not describe source trees as bundled engines until each platform's executable/library dependency closure has been staged and smoke-tested.

## Build

Requirements: Node.js 22.12+ and npm. Build each installer on its target OS.

```bash
npm install
npm run dev
npm test
```

Windows PowerShell:

```powershell
.\platform\windows\build.ps1
```

Debian/Ubuntu:

```bash
./platform/linux/build-deb.sh
```

Fedora:

```bash
./platform/linux/build-fedora.sh
```

Build/stage Linux 7-Zip:

```bash
./platform/linux/build-7zip.sh
```

Build/stage Windows 7-Zip from a Visual Studio Developer PowerShell with `nmake` available:

```powershell
.\platform\windows\build-7zip.ps1
```

The installer build scripts clear only `release/`; they do not remove user files/settings. The stable application ID is `org.aiof.desktop`. Native installer upgrade and uninstall behavior still require acceptance tests on clean Windows and Linux machines.

## Layout

```text
AIOF/
├── app/main/                 # Electron main/preload process
├── app/ui/                   # React UI and theme system
├── configs/                  # electron-builder configuration
├── docs/                     # build, integration, licensing and status notes
├── platform/windows/         # PowerShell build + engine scripts
├── platform/linux/           # Debian/Fedora + engine scripts
├── resources/branding/       # AIOF logo and platform icon
├── resources/engines/        # common + OS-specific runtime payloads
├── tests/                    # source and packaging contract tests
└── vendor/upstream/          # supplied upstream source repositories
releases contains exe file btw
```

See [`docs/BUILD-STATUS.md`](docs/BUILD-STATUS.md) and [`docs/THIRD-PARTY-NOTICES.md`](docs/THIRD-PARTY-NOTICES.md) before distributing.
