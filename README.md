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


## v0.7.0 development revision

- System appearance is the default on Windows and Linux. Linux keeps the caller's GTK/compositor environment intact; AIOF does not set `GTK_THEME`.
- Liquid Glass, neomorphism and rotating neon borders have been removed.
- PDF tools are no longer a permanent sidebar destination; PDFs still open in AIOF and tools remain available through file actions.
- Advanced image controls are optional and controlled by Settings.
- Embedded Writer / Calc / Impress is the target via LibreOfficeKit. See `native/office-lok/README.md` for the bridge design and the current runtime limitation.
- See `docs/BUILD-STATUS.md` for checks and unverified native package builds.


## Uninstall and data removal (0.7.1)

A full uninstall removes AIOF program files, registered app associations, AIOF-created Explorer context-menu entries, shortcuts, and AIOF-owned per-user settings, profile, cache and dedicated temporary directories. Windows uses electron-builder's standard NSIS data-removal define plus a guarded custom uninstaller include; Linux DEB/RPM package removal uses `platform/linux/after-remove.sh` and skips cleanup during package upgrades. This does not erase operating-system event logs, Prefetch, shell history, shared temporary files, browser profiles, or data belonging to other applications. App data removal is irreversible; back up files saved inside AIOF-managed folders before uninstalling.

## Office starter documents

Writer/Calc/Impress buttons create valid OpenDocument starter packages (`.odt`, `.ods`, `.odp`) in the user Documents folder and open them using the host system's registered office suite. Full embedded LibreOfficeKit editing remains unavailable until a matching native runtime is built and staged for each platform.


## v0.7.2 quality pass

- File Explorer keeps its chrome fixed while only the file list scrolls.
- Preview pane renders image, audio, video and PDF previews locally.
- Compression/extraction actions are moved out of the address toolbar and remain in contextual actions.
- The Office page reports the real integration boundary instead of claiming embedded LibreOfficeKit editing is ready.
- Windows and Linux uninstallers remove AIOF-owned profiles, caches, private temporary files and AIOF-created shell integration on a full uninstall, while skipping cleanup during upgrades.


## v0.7.2 UI and uninstall reliability pass

- The AIOF logo is imported as a Vite asset so it is emitted into the packaged renderer bundle instead of relying on a fragile relative image path.
- File Explorer keeps its top-level chrome and fixed-width details panel stable; the file collection is the only independently scrolling region. Image, audio, video and PDF previews use the app's private `aiof-file:` protocol, including byte-range responses for media and PDF readers.
- Archive creation and extraction are kept in context actions, not the address/navigation toolbar. File types use a consistent stacked icon with a compact extension label.
- System fonts are preferred so Windows uses its native UI font stack and Linux can use the desktop's configured system font fallback.
- Office availability is stated honestly: AIOF can create OpenDocument starter files, but embedded Writer/Calc/Impress editing is not enabled until a LibreOfficeKit bridge and matching runtimes are built for Windows and Linux.
- Windows NSIS and Linux DEB/RPM removal clean AIOF-owned profile, cache, state and private temporary paths on full removal, while preserving them during upgrades. AppImage users can run `platform/linux/uninstall-appimage.sh --purge` for the current user's data and then delete the AppImage separately.
- The uninstallers do not touch OS logs, Prefetch, shell history, shared temp/cache directories, browser profiles or other applications' data.
