# Changelog

## 0.6.2 — 9 November 2026

- Added up to eight parallel HTTP Range segments for supported larger downloads; retained resumable parts and safe single-stream fallback.
- Added AIOF in-app file details handling for unknown file types instead of forcing an external application launch.
- Kept images, PDFs and supported audio/video previews in the AIOF window.
- Added tests for segmented downloader code path, unknown-file in-app handling and shared PDF resource staging.
- Built and smoke-tested Linux x86_64 7-Zip 25.01 CLI and Format7zF plugin from the supplied 7-Zip source.
- Kept engine payloads isolated by operating system and updated the PDF runtime staging path.
- Updated integration and build-status documentation to state remaining full-runtime gaps accurately.

## 0.6.1

- Moved Quick Access above Home and kept Internet tools at the bottom of the sidebar.
- Removed the XDM/IDM companion-application launch controls from the user workflow.
- Added target-specific engine staging directories and initial 7-Zip Linux packaging.

## 0.7.0 — 9 November 2026

- Changed the default appearance preference to System and applied Electron `nativeTheme` on startup and when settings are saved.
- Added platform-aware font stacks: Segoe UI Variable on Windows and Inter / Noto Sans / Cantarell fallbacks on Linux.
- Removed Liquid Glass, neomorphism and animated neon edge styling from the personalization UI and stylesheet.
- Added a Linux desktop integration note: AIOF preserves inherited GTK/desktop/compositor environment variables and does not set `GTK_THEME`.
- Added a restrained Windows Fluent and AIOF Classic option alongside System native appearance.
- Removed the PDF tools item from the permanent sidebar; PDF preview and PDF tool actions remain available from file workflows.
- Added the Advanced Image Tools preference and gated advanced image adjustment controls behind the toggle.
- Stopped creating invalid empty ODT/ODS/ODP placeholders while the LibreOfficeKit native runtime is unavailable.
- Added the cross-platform LibreOfficeKit tiled-rendering/tiled-editing bridge specification for embedded Writer, Calc and Impress.
- Added regression tests for system appearance, removal of glass effects, PDF sidebar visibility and the Office bridge specification.

## 0.7.1 — Explorer reliability and uninstall cleanup

- Added in-pane image/video/audio previews, with a fixed details pane and the file collection as the only scrolling area.
- Removed compression controls from the address/navigation toolbar; ZIP compression and extraction remain available from the file context menu.
- Styled drive meters, settings controls, appearance presets and speed-test diagnostics with the shared AIOF control system.
- Fixed the packaged logo path for Electron file:// builds and added stacked file-type glyphs.
- Added real OpenDocument starter package creation for Writer, Calc and Impress; documents open through the host office-suite association until a native LibreOfficeKit runtime is built.
- Added Windows NSIS uninstall cleanup for AIOF-owned profile/cache/temp data and AIOF shell-menu registry entries. Added Debian/RPM after-remove cleanup for AIOF-specific per-user profile paths. In-place upgrades retain user data.

## 0.7.2
- Corrected preview pane rendering and fixed Explorer scroll geometry.
- Moved compression actions out of the address toolbar.
- Styled system settings, speed test, drive meters, icon stack and Office workspace controls.
- Documented and tested full-uninstall cleanup of AIOF-owned state while preserving data on upgrade.
