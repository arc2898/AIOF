# Upstream source manifest

All eight supplied source archives have been extracted into `vendor/upstream/<project>/` without flattening their internal source directory structure. POSIX executable permissions are retained where supported. The Files repository’s `CLAUDE.md` alias is materialized as a byte-identical regular copy of `AGENTS.md` so the source archive extracts correctly on Windows, where ZIP tools commonly drop symbolic-link metadata. The original ZIP files are not duplicated in this workspace; their SHA-256 fingerprints are recorded in `vendor/SOURCE-ARCHIVES.md`. Preserve the upstream README, LICENSE/COPYING, NOTICE and per-directory license files when updating these trees.

| AIOF folder | Original archive | Upstream project / entry point | License information retained |
|---|---|---|---|
| `vendor/upstream/xdm/` | `xdm-master.zip` | Xtreme Download Manager; Maven/Java project (`pom.xml`) | `LICENSE` (GPL-3.0) and `LICENSES/` |
| `vendor/upstream/files/` | `Files-main.zip` | Files Community; WinUI / .NET solution (`Files.slnx`) | `LICENSE-MPL` (MPL-2.0), `LICENSE-MIT`, `.github/NOTICE.md` |
| `vendor/upstream/idm/` | `idm-main.zip` | Go module (`go.mod`, `Makefile`) | `LICENSE` (Apache-2.0) |
| `vendor/upstream/vlc/` | `vlc-master.zip` | VLC media player; Autotools / Meson / Rust build metadata | `COPYING` (GPL-2.0-or-later), `COPYING.LIB` (LGPL terms for applicable library components) |
| `vendor/upstream/imageglass/` | `ImageGlass-develop.zip` | ImageGlass; Windows desktop source | `LICENSE` (GPL-3.0 for Classic source; product / Pro terms are separate) |
| `vendor/upstream/7zip/` | `7-Zip-master.zip` | 7-Zip source mirror | `COPYING`, `DOC/License.txt`, `DOC/copying.txt`; note README says this mirror is discontinued |
| `vendor/upstream/elixiroffice/` | `ElixirOffice-main.zip` | ElixirOffice; desktop app and related server/editor sources | `LICENSE` (AGPL-3.0), `NOTICE`, plus bundled dependency notices |
| `vendor/upstream/qbittorrent/` | `qBittorrent-master.zip` | qBittorrent; CMake / Qt project | `COPYING` (GPL-2.0-or-later source with OpenSSL linking exception; the supplied binary asset set has GPL-3.0-or-later terms) |
| `vendor/upstream/stirling-pdf-core/` | `Stirling-PDF-main.zip` | Stirling PDF MIT core flavor; Spring Boot service plus frontend | `LICENSE`, `AIOF-CORE-FLAVOR.md`; restricted editor/engine/SaaS paths excluded |

Zed is not part of the supplied source archives; it is launched from an official publisher installation and is documented separately in `docs/THIRD-PARTY-NOTICES.md`. The AIOF project currently references the supplied sources; it does not compile or redistribute their binaries as part of the AIOF package by default. The precise license obligations for a future combined distribution depend on the exact components and build configuration selected. This manifest is inventory information, not legal advice.

