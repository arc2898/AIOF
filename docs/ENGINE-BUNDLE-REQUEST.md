# AIOF engine bundle inputs still required

AIOF's shell is a single user-facing application. Some engines are background runtimes or shared libraries, not separate user-facing apps. Runtime binaries must match the target OS and architecture and must include their dependent libraries/plugins and applicable notices. Do not copy a Windows payload into a Linux build or vice versa.

## Already staged

- Linux x86_64: 7-Zip 25.01 `7z` and `7z.so` under `resources/engines/linux/archive/`. The CLI was smoke-tested by creating, testing and extracting a `.7z` archive.
- Windows x64: build recipe `platform/windows/build-7zip.ps1`; this environment cannot run MSVC `nmake`, so the Windows binaries are not yet verified/staged.

## Please provide or build these exact runtime payloads

### VLC playback engine

- Windows x64: `libvlc.dll`, `libvlccore.dll`, the complete matching `plugins/` folder (including `plugins.dat`) and any non-system dependent DLLs from the same VLC build. Place under `resources/engines/windows/media/`.
- Linux x86_64: matching `libvlc.so*`, `libvlccore.so*`, complete VLC plugin directory and dependent runtime libraries, under `resources/engines/linux/media/`.
- Provide the VLC version, source/build provenance and its license notices. AIOF's current HTML media layer is built in; this payload is needed for VLC's wider codec/filter/streaming coverage.

### Torrent engine

- Linux x86_64: `qbittorrent-nox` and its runtime dependency closure under `resources/engines/linux/torrent/`.
- Windows x64: a headless qBittorrent service binary if available for the supplied build, plus all dependent DLLs, under `resources/engines/windows/torrent/`. AIOF manages it as a loopback-only background service; users do not open a separate torrent GUI.
- Provide qBittorrent and libtorrent versions and their corresponding notices.

### Word / Excel / PowerPoint engine

The supplied ElixirOffice source is AGPL-3.0-only and includes the desktop shell source, but its generated `desktop/assets/` bundle is absent from the supplied ZIP. That generated bundle is the missing editor payload (compiled Word/Excel/PowerPoint renderer, templates, WASM conversion runtime, fonts and manifest). Provide the matching, fully built `desktop/assets/` folder and its source/build manifest for each version. AIOF must then integrate the editor in its own window with a scoped file bridge; the current AIOF Office page must not be mistaken for a full DOCX/XLSX/PPTX editor.

### PDF engine

- Stirling PDF MIT-core JAR built for the supplied source revision.
- A Java 25+ runtime for Windows x64 and Linux x86_64 if the installer must be self-contained. If Java remains a prerequisite, the app must disclose that clearly.
- Keep the Stirling core license, dependency notices and SBOM with the JAR.

### Image viewer / IDE

- ImageGlass is a Windows desktop application, not a portable cross-platform image-viewer library. AIOF's built-in image viewer/editor is the cross-platform replacement; no separate ImageGlass window should be launched.
- Zed source/binaries were not supplied. AIOF currently provides its own in-window text/code editor. The editor is not the full Zed codebase (LSP, extension host and debugger are not included).

## How to deliver payloads

Send platform-separated archives named `aiof-engines-windows-x64.zip` and `aiof-engines-linux-x86_64.tar.zst`, preserving the paths above. Include `VERSIONS.md`, `LICENSES/`, and SHA-256 checksums. Avoid sending only installers; AIOF needs the extracted runtime payloads, not another app installer.
