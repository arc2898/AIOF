# AIOF 0.7.2 build and verification status

## Verified in this workspace

- 26/26 automated Node tests passed (`node --test tests/*.test.cjs`).
- Electron main-process and preload syntax checks passed.
- React JSX parsing passed with zero diagnostics.
- CSS parsing passed with zero syntax errors.
- `package.json` and `configs/electron-builder.json` parse as valid JSON.
- Debian, Fedora and Linux removal helper scripts pass `bash -n`.
- All eight supplied upstream source trees are present independently under `vendor/upstream/`.
- AIOF logo is bundled through the Vite module graph rather than relying on a relative public-file URL.
- File preview uses a private `aiof-file:` scheme with local byte-range support for video and PDF requests.
- File Explorer compression/extraction actions are not present in the address/navigation toolbar.
- File list scrolling is isolated; the details/preview pane remains fixed alongside it.
- Windows NSIS uninstall macro and Linux package `afterRemove` hooks remove AIOF-owned profile/cache/state directories on true uninstall and skip on package upgrade.

## Not verified

- Vite production build: not run. Dependencies were not available locally and npm package installation timed out / was unavailable from the package registry.
- Electron runtime preview: not launched in this workspace. The custom protocol and preview markup have static and contract tests, but require Windows/Linux runtime testing.
- Windows NSIS installer: not built; NSIS compiler is unavailable here.
- Debian/Fedora packages: builder script syntax is checked, but package artifacts were not generated.
- AppImage: no package-manager uninstaller exists for AppImage. `platform/linux/uninstall-appimage.sh --purge` removes AIOF data for the current user; delete the AppImage file separately.
- Native LibreOfficeKit bridge: specification only. No native bridge binary or complete LibreOffice runtime is bundled.
- Full Office editing: not operational in AIOF yet. AIOF creates OpenDocument starter files and hands them to a compatible system office application if one is registered. It does not currently embed Writer, Calc or Impress editing.
- GTK theme rendering: AIOF uses system UI font fallbacks and follows the OS light/dark preference; Electron web controls do not automatically inherit arbitrary third-party GTK CSS or compositor effects.

## Uninstall behaviour and limits

### Windows NSIS

The custom NSIS uninstaller enables `DELETE_APP_DATA_ON_UNINSTALL` and removes AIOF compatibility profile/cache paths plus AIOF-owned shell menu entries on final uninstall. electron-builder removes the registered uninstall entry, install directory and shortcuts. The `${isUpdated}` guard prevents destructive cleanup during an in-place update.

### Debian / Fedora

The package `afterRemove` script removes AIOF-owned configuration, cache, local state, share and private temporary directories for user home folders on final package removal. It skips upgrade transitions. The package manager removes the installed application files and system desktop entry.

### AppImage

AppImage is a portable executable and does not register a package-manager uninstall operation. Run `platform/linux/uninstall-appimage.sh --purge` for the current user, then delete the `.AppImage` file manually.

### Explicit exclusions

AIOF does not erase Windows Event Logs, Prefetch, registry installation history outside AIOF-owned keys, package-manager logs, shell history, system-wide `/tmp` or `%TEMP%`, shared browser caches, or other applications' data. Those locations belong to the operating system or other software; deleting them would be unsafe and would not be a reliable privacy guarantee.

## Office status

The embedded Office target is LibreOfficeKit. The bridge protocol and runtime layout are documented in `native/office-lok/README.md`. The supplied source archives do not contain a ready-to-load per-platform LibreOfficeKit bridge/runtime. The Office UI now states this limitation explicitly instead of presenting an empty faux editor as functional.
