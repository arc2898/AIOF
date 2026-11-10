# Linux package builders

- Debian / Ubuntu: `./platform/linux/build-deb.sh` produces `.deb`.
- Fedora: `./platform/linux/build-fedora.sh` produces `.rpm`.

Both scripts expect Node.js 22.12+, npm, and access to the npm registry on first install. Debian packaging needs `dpkg-deb` and its normal packaging helpers. Fedora RPM packaging needs `rpmbuild` (install `rpm-build` with `dnf`). Build on the target distribution for the most reliable package dependencies. AppImage is also available with `npm run dist:appimage`.
