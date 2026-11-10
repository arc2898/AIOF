# AIOF — All-in-One File Manager

Native cross-platform file manager for Windows and Linux.

## Current implementation

This repository is being initialized from the AIOF native Go/GTK + Win32 implementation. The current build includes file operations, indexed search, archive handling, PDF/image preview, download support and a libVLC integration bridge.

## Build status

See [BUILD-STATUS.md](docs/BUILD-STATUS.md). Linux runtime and Windows cross-build have been exercised; Windows runtime and libVLC playback require validation on their target systems.

## Build

```sh
go test ./...
go vet ./...
make build
```

Office suite is intentionally out of scope.
