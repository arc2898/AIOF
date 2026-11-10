# AIOF embedded Office — LibreOfficeKit bridge

## Product decision

AIOF v0.7.0 targets an **embedded** Writer / Calc / Impress workspace. It must not silently launch the user's separately installed LibreOffice application, and it must not create empty files with `.odt`, `.ods` or `.odp` extensions as fake documents.

## Native architecture

The office canvas is hosted by AIOF's renderer. A small platform-native bridge owns the LibreOfficeKit (`lok::Office` / `lok::Document`) lifetime and communicates with the renderer through a narrow, versioned IPC protocol:

- `office.open(path, readOnly)` → document id, document type, page/sheet metadata
- `office.render(documentId, viewport, scale)` → BGRA tile payloads and document dimensions
- `office.input(documentId, event)` → pointer and keyboard events translated to LibreOfficeKit twips using `postMouseEvent()` and `postKeyEvent()`
- `office.command(documentId, command, args)` → formatting, selection, undo/redo, save and export
- `office.callback(documentId, event)` → invalidated tiles, cursor, selection, status and document-modified state
- `office.close(documentId)` → release document resources

The renderer owns the canvas, toolbars, tab strip, status bar and accessibility overlays. LibreOfficeKit owns document layout, import/export, calculation, slide layout and editing semantics. LibreOfficeKit tiled rendering and tiled editing are the core rendering path. Tile invalidation is required to keep the canvas synchronized after edits.

## Platform strategy

- **Linux:** build a native GTK-aware host against the matching LibreOfficeKit runtime. Preserve the parent process environment (`GTK_THEME`, `XDG_CURRENT_DESKTOP`, `GDK_BACKEND`, `WAYLAND_DISPLAY`, `DISPLAY`) and do not set or replace the user's GTK theme. GTK native dialogs should use the desktop's normal portal/dialog integration.
- **Windows:** build a Win32 host against the matching LibreOfficeKit DLL/runtime and forward native input and tile callbacks through the same IPC contract. GTK is not a Windows dependency for AIOF's main shell.
- Keep all LibreOfficeKit shared libraries, program resources, filters, fonts and configuration in platform-specific `resources/engines/{linux,windows}/office/` payloads. Never mix binaries between targets.

## Build inputs required

A complete runtime is more than the public headers or `libreofficekit` library. It includes the matching LibreOffice program tree, filters, services, resource files and required shared libraries. Stage a reproducible LibreOffice build into the target platform payload before enabling the Office buttons. The runtime must be version-matched to the bridge and pass ODT/ODS/ODP plus DOCX/XLSX/PPTX open-edit-save round-trip tests.

## Current status

This directory is the integration specification only. The current source archive does **not** contain a built LibreOfficeKit runtime or the native tile bridge binary. The Office page therefore reports the missing runtime and disables document creation rather than generating invalid placeholder files. Do not mark embedded Office as complete until the bridge and platform payloads are built and tested.

## References

- LibreOfficeKit C/C++ API: https://docs.libreoffice.org/libreofficekit.html
- LibreOfficeKit API in action: https://dev.blog.documentfoundation.org/2024/06/27/libreofficekit-api-in-action/
