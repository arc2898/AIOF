# AIOF engine integration — v0.6.2

AIOF v0.6.2 is one Electron desktop window with an Explorer-style shell and in-app workflows. Background services are launched and controlled by AIOF; users are not asked to switch between companion application windows. The upstream source projects remain isolated under `vendor/upstream/` because they use different languages, build systems, dependencies, target platforms and licenses.

This file distinguishes **implemented in the AIOF shell**, **built and bundled runtime**, and **source retained / runtime still required**. A source archive or launch adapter is not the same as a bundled engine.

## Integration status

| Component | AIOF integration in v0.6.2 | Verified boundary / remaining work |
|---|---|---|
| Explorer / Files | Native AIOF file navigation, path bar, selection, file operations, pins, recent, drive meters, local search and disk analysis. The supplied Files source is retained as reference. | AIOF uses its own Electron filesystem UI; it does not embed the upstream WinUI application. |
| Downloads / IDM-style service | AIOF-managed HTTP(S) queue with pause/resume/cancel, up to 8 concurrent HTTP Range segments when supported, resumable segment files and single-stream fallback. | This is AIOF's own IDM-style service, not the proprietary Internet Download Manager application or its browser extension. The supplied Go IDM repository is retained, not run as a companion UI. |
| XDM | Source retained for reference and licensing provenance. | XDM engine/browser extension is not bundled. AIOF's in-app download manager is the current user-facing service. |
| Torrent / qBittorrent | qBittorrent Web API client, loopback-only profile configuration, managed process lifecycle, and list/add/pause/resume/remove flows. | qBittorrent source is retained; platform-specific headless runtime and dependency closure are not staged yet. Required paths are listed in `docs/ENGINE-BUNDLE-REQUEST.md`. |
| Media / VLC | Audio/video files open in AIOF's media preview using the Chromium media layer. | Full VLC codec, filter, subtitle and streaming coverage requires the matching libVLC runtime, plugin directory and dependency closure for each OS. Those binaries are not staged yet. No separate VLC UI is launched. |
| Images / ImageGlass | AIOF has its own in-window image preview/editor with rotate, flip, zoom, brightness, contrast, saturation and save-copy. | ImageGlass source is retained, but it is a Windows WPF desktop app rather than a cross-platform embeddable library. AIOF's own viewer is used on both OSes; ImageGlass is not launched separately. |
| Archive / 7-Zip | ZIP create/extract is built into AIOF. Linux x86_64 includes 7-Zip 25.01 CLI and `Format7zF` plugin. The Linux engine was smoke-tested by create, test and extract of a `.7z` archive. | Windows x64 CLI/plugin must be built with `platform/windows/build-7zip.ps1` from Visual Studio Developer PowerShell with NMAKE. Other OS/architectures need their own builds. |
| Office / ElixirOffice | Office workspace stays inside AIOF; current shell includes in-app text/CSV editing and Office entry points. ElixirOffice source is retained. | Full DOCX/XLSX/PPTX editing is not integrated yet. The supplied ElixirOffice source references generated `desktop/assets/` renderer resources that are absent from the uploaded archive. Build/provide matching assets before integrating its editor in an AIOF-owned view. |
| PDF / Stirling PDF | PDF files open in AIOF's preview. PDF tools embed the local Stirling core web UI in the AIOF page when its local engine is built and started. | MIT-core source retained. The boot JAR has not been built in this workspace; build requires JDK 25+ and Node 22+. A self-contained release also needs a Java 25+ runtime per OS, or else must disclose Java as a prerequisite. |
| Code editor / Zed | AIOF contains an in-window text/code editor with syntax colors, open/save and line numbers. | It is not the full Zed IDE (no Zed LSP/extension/debugger runtime). Zed source/binary was not among the supplied archives. The built-in editor does not launch a separate IDE. |

## AIOF UI and system workflows

- **Personalization:** theme mode (light/dark/system), preset palettes, custom accent, surface style (Liquid Glass, soft neomorphism, Windows minimal), density, roundness, optional hover/focus neon perimeter, wallpaper and wallpaper tint. Presets can be refined and saved in Settings.
- **Home and sidebar:** Quick Access is at the top; per-drive storage meters show used/free capacity; Internet tools are grouped at the bottom. The top-right search field replaces a sidebar search entry.
- **Search:** recursive local filename search with limits on entries, scan time and result count. It skips symlinks and known system-heavy locations. It is not yet a persistent full-text/content index.
- **Disk usage:** bounded folder/drive scan, largest files and extension totals. Inaccessible locations and symlinks are skipped.
- **Cleanup:** strict allowlist for user temp and selected browser/system cache locations. Symlink roots and descendants are rejected/skipped; locked files are skipped; no elevation or whole-system deletion is attempted.
- **File type changer:** changes the filename extension only. It does not convert the file's binary format; the UI must state this clearly.
- **File associations:** installers register supported extension associations. Windows still requires the user to select AIOF as the default handler in OS Settings; an installer cannot silently override protected defaults.

## Runtime packaging model

AIOF remains one user-facing application. Background engines and shared libraries are stored in the AIOF install resources and launched/controlled by the AIOF main process. Payloads are separated by target platform:

- Common: `resources/engines/common/`
- Linux x86_64: `resources/engines/linux/`
- Windows x64: `resources/engines/windows/`

The electron-builder configuration copies only the target platform's engine folder plus common assets. Never mix Windows PE binaries and Linux ELF binaries. Stage complete dependent library/plugin trees, not only the main executable.

## Release gate for a self-contained all-engine installer

1. Stage and clean-machine test qBittorrent headless runtime for Windows and Linux.
2. Stage and test libVLC plus full plugin/dependency closure for Windows and Linux.
3. Build and test 7-Zip separately on Windows and other supported architectures; Linux x86_64 is currently the only bundled native 7-Zip target.
4. Provide/build ElixirOffice generated editor assets and integrate Word/Excel/PowerPoint editing with a scoped AIOF file bridge.
5. Build Stirling PDF JAR and bundle Java 25+ runtime per target OS, or disclose an external Java requirement.
6. Decide whether the in-app editor is sufficient or provide the Zed source/runtime if full LSP/debugger/extension support is required.
7. Build native installers on Windows and Linux; test fresh install, upgrade, file associations, uninstall/data retention and operation on clean machines.
8. Generate dependency lockfile, SBOM, notices, vulnerability review and license review for the exact release payload.

Do not describe AIOF as a fully self-contained all-engine installer until all relevant target runtime payloads are present, dependencies resolve on a clean machine, and their integrated workflows have been tested.
