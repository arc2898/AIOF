# Third-party notices and license inventory

AIOF includes complete copies of the supplied upstream source archives and extracted source trees. Their original license and notice files are retained in `vendor/upstream/`.

## Supplied upstream projects

| Project | License summary from the supplied source | Retained notice / license files |
|---|---|---|
| XDM | GPL version 3 | `vendor/upstream/xdm/LICENSE`, `vendor/upstream/xdm/LICENSES/` |
| Files | MPL 2.0 and MIT-licensed portions | `vendor/upstream/files/LICENSE-MPL`, `LICENSE-MIT`, `.github/NOTICE.md` |
| IDM (Go project) | Apache License 2.0 | `vendor/upstream/idm/LICENSE` |
| VLC | GPL version 2 or later for VLC; LGPL terms apply to libVLC/library components where designated | `vendor/upstream/vlc/COPYING`, `COPYING.LIB` |
| ImageGlass Classic | GPL version 3 for source in the supplied repository; ImageGlass Pro has separate terms | `vendor/upstream/imageglass/LICENSE` |
| 7-Zip | LGPL-2.1 code plus file-specific BSD, public-domain and unRAR-restricted portions; consult per-file notices | `vendor/upstream/7zip/COPYING`, `DOC/License.txt`, `DOC/copying.txt` |
| ElixirOffice | GNU AGPL version 3 only; includes derived components and additional notices | `vendor/upstream/elixiroffice/LICENSE`, `NOTICE`, and nested license files |
| qBittorrent | GPL-2.0-or-later source with a stated OpenSSL linking exception; supplied binary assets are under GPL-3.0-or-later terms | `vendor/upstream/qbittorrent/COPYING`, `COPYING.GPLv2`, `COPYING.GPLv3` |
| Stirling PDF core flavor | MIT outside explicitly listed restricted subdirectories; AIOF retains only the MIT-licensed core source and excludes restricted editor/engine/SaaS paths | `vendor/upstream/stirling-pdf-core/LICENSE`, `AIOF-CORE-FLAVOR.md` |
| Zed | Not included as source or binary in AIOF; users install it through Zed Industries' official distribution | Install references in `platform/windows/install-zed.ps1` and `platform/linux/install-zed.sh` |

## AIOF shell dependencies

The AIOF shell directly depends on React, React DOM, Lucide React, Electron, Vite, the Vite React plugin, Electron Builder, `archiver` and `extract-zip`, plus development utilities `concurrently` and `wait-on`. Their package license metadata should be captured from the resolved dependency lockfile at release time. The current workspace was not able to resolve npm packages because the environment could not reach `registry.npmjs.org`, so no generated transitive dependency SBOM/license report is included.

## Distribution requirements

- Do not remove upstream copyright, license or NOTICE files when updating or building vendor components.
- Record the exact upstream commit/tag, patches, configure flags and binary dependencies for every component actually included in a release.
- For GPL/AGPL components, review source-offer and corresponding-source requirements, distribution conditions, and network interaction obligations before combining or distributing modified binaries.
- For LGPL components, retain the required notices and ensure the applicable relinking/replacement requirements are met.
- Review 7-Zip file-level licensing carefully; not every file in its source tree necessarily shares one license.
- Do not assume that an upstream project name or logo is granted for rebranding. Trademark rights are separate from source-code licenses.
- Generate a full SBOM and third-party license report from the exact installed `package-lock.json` and runtime bundle before publishing installers.

This inventory is provided for engineering traceability and is not a legal opinion. AIOF's own project-wide license has not yet been selected.

The Stirling-PDF source tree is a user-supplied archive. AIOF's core copy deliberately excludes the separately licensed directories enumerated in the upstream root LICENSE. Do not add files from those directories to the core distribution. Zed is invoked as an installed external application; it is not bundled or rebranded.
