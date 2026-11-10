'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const exists = relative => fs.existsSync(path.join(root, relative));
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('AIOF has a separate UI and Electron main-process source tree', () => {
  assert.ok(exists('app/ui/index.html'));
  assert.ok(exists('app/ui/main.jsx'));
  assert.ok(exists('app/ui/style.css'));
  assert.ok(exists('app/main/main.cjs'));
  assert.ok(exists('app/main/preload.cjs'));
  assert.equal(exists('src'), false);
  assert.equal(exists('electron'), false);
});

test('Windows and Linux build scripts are in their requested OS folders', () => {
  assert.ok(exists('platform/windows/build.ps1'));
  assert.ok(exists('platform/linux/build-deb.sh'));
  assert.ok(exists('platform/linux/build-fedora.sh'));
});

test('all eight supplied upstream projects are retained independently', () => {
  const projects = ['xdm', 'files', 'idm', 'vlc', 'imageglass', '7zip', 'elixiroffice', 'qbittorrent'];
  for (const project of projects) {
    const dir = path.join(root, 'vendor', 'upstream', project);
    assert.ok(fs.existsSync(dir), `missing upstream source: ${project}`);
    assert.ok(fs.readdirSync(dir).length > 0, `empty upstream source: ${project}`);
  }
  const agentsPath = path.join(root, 'vendor/upstream/files/AGENTS.md');
  const claudePath = path.join(root, 'vendor/upstream/files/CLAUDE.md');
  assert.ok(fs.existsSync(claudePath), 'missing Files documentation alias: CLAUDE.md');
  assert.equal(fs.readFileSync(claudePath, 'utf8'), fs.readFileSync(agentsPath, 'utf8'));
  const vlcBootstrap = path.join(root, 'vendor/upstream/vlc/bootstrap');
  assert.ok(fs.existsSync(vlcBootstrap), 'missing VLC bootstrap script');
  if (process.platform !== 'win32') assert.ok(fs.statSync(vlcBootstrap).mode & 0o111, 'VLC bootstrap must be executable on POSIX');
  assert.ok(exists('vendor/SOURCE-ARCHIVES.md'));
  assert.ok(exists('vendor/UPSTREAM-MANIFEST.md'));
});

test('AIOF package version and platform packaging targets are current', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'aiof-desktop');
  assert.equal(pkg.main, 'app/main/main.cjs');
  assert.equal(pkg.version, '0.7.2');
  assert.ok(pkg.scripts['dist:windows']);
  assert.ok(pkg.scripts['dist:deb']);
  assert.ok(pkg.scripts['dist:fedora']);
});

test('main process exposes the Home, search, disk, cleanup and engine services', () => {
  const main = read('app/main/main.cjs');
  for (const channel of [
    'aiof:list-dir', 'aiof:trash', 'aiof:archive-create', 'aiof:download-start', 'aiof:torrent-list',
    'aiof:home-data', 'aiof:pin-folder', 'aiof:unpin-folder', 'aiof:remove-recent', 'aiof:search-everywhere',
    'aiof:disk-usage-scan', 'aiof:cache-scan', 'aiof:cache-clean', 'aiof:torrent-start', 'aiof:pdf-open', 'aiof:is-directory'
  ]) assert.ok(main.includes(channel), `missing IPC handler ${channel}`);
  assert.doesNotMatch(main, /aiof:exec-command/);
  assert.doesNotMatch(main, /Firefox\\', 'Profiles/);
  assert.match(main, /rootStat\.isSymbolicLink\(\)/);
  assert.match(main, /withTimeout\(fs\.access\(drive\), 450/);
  assert.match(main, /withTimeout\(fs\.statfs\(location\), 900/);
  assert.match(main, /qbit\.managed \? ''/);
  assert.match(main, /return \{ results, partial, scanned, elapsedMs:/);
});

test('preload exposes only the finite local system APIs needed by the UI', () => {
  const preload = read('app/main/preload.cjs');
  for (const api of ['homeData', 'pinFolder', 'unpinFolder', 'removeRecent', 'searchEverywhere', 'diskUsageScan', 'cacheScan', 'cacheClean', 'startTorrentEngine', 'openPdfStudio', 'isDirectory']) {
    assert.match(preload, new RegExp(`\\b${api}:`), `missing preload API ${api}`);
  }
  assert.match(preload, /contextBridge\.exposeInMainWorld\('aiof', api\)/);
  assert.match(preload, /platform: process\.platform/);
});

test('installer upgrade settings preserve app identity and user data', () => {
  const config = JSON.parse(read('configs/electron-builder.json'));
  assert.equal(config.appId, 'org.aiof.desktop');
  assert.equal(config.productName, 'AIOF');
  // electron-builder 26.18.1 on the reported Windows environment rejects
  // an object at configuration.nsis. null selects its supported defaults.
  // The stable appId keeps upgrades tied to the same installed application.
  assert.equal(config.nsis, null);
  assert.ok(config.extraResources.some(item => item.from === 'resources/engines/common'));
  assert.ok(config.linux.extraResources.some(item => item.from === 'resources/engines/linux'));
  assert.ok(config.win.extraResources.some(item => item.from === 'resources/engines/windows'));
});

test('Home, local search, system tools, appearance and legal pages are present in the UI', () => {
  const ui = read('app/ui/main.jsx');
  for (const phrase of ['Pinned folders', 'Most used', 'Drives and storage', 'Search this PC', 'Disk usage analyzer', 'Temporary files & cache', 'Terms & conditions', 'Privacy policy', 'data-accent', 'data-density', 'Start built-in engine', 'Code Editor', 'PDF tools', 'Windows Fluent', 'System native', 'accentCustom', 'wallpaperOpacity', 'Native AIOF playback']) {
    assert.ok(ui.includes(phrase), `missing UI feature: ${phrase}`);
  }
});

test('brand, PDF core and platform helper scripts are present', () => {
  assert.ok(exists('resources/branding/aiof-logo.png'));
  assert.ok(exists('resources/branding/aiof-icon.ico'));
  assert.ok(exists('app/ui/public/branding/aiof-logo.png'));
  assert.ok(exists('vendor/upstream/stirling-pdf-core/AIOF-CORE-FLAVOR.md'));
  assert.ok(exists('platform/windows/build-pdf-engine.ps1'));
  assert.ok(exists('platform/linux/build-pdf-engine.sh'));
  assert.ok(exists('platform/windows/install-zed.ps1'));
  assert.ok(exists('platform/windows/build-7zip.ps1'));
  assert.ok(exists('platform/linux/build-7zip.sh'));
  assert.ok(exists('platform/linux/install-zed.sh'));
});

test('AIOF no longer advertises a command runner or terminal page', () => {
  const ui = read('app/ui/main.jsx');
  assert.doesNotMatch(ui, /Command runner|setSection\('terminal'\)/i);
  assert.match(ui, /global-search/);
});

test('personalization and code editor provide usable theme controls', () => {
  const ui = read('app/ui/main.jsx');
  const css = read('app/ui/style.css');
  assert.match(ui, /applyAppearancePreset/);
  assert.match(ui, /matchMedia/);
  assert.match(ui, /highlightSource/);
  assert.match(ui, /onKeyDown=.*saveEditor/s);
  assert.ok(ui.includes("data-appearance={settings.appearance || 'system'}"));
  assert.match(css, /data-platform=\"linux\"/);
  assert.doesNotMatch(css, /aiof-glass-orbit|backdrop-filter:blur\(20px\)/);
  assert.match(css, /sidebar-drive-track/);
});

test('7-Zip Linux runtime and build recipe are included', () => {
  const bin = path.join(root, 'resources/engines/linux/archive/7z');
  const plugin = path.join(root, 'resources/engines/linux/archive/7z.so');
  assert.ok(fs.existsSync(bin));
  assert.ok(fs.existsSync(plugin));
  assert.ok(fs.existsSync(path.join(root, 'platform/linux/build-7zip.sh')));
});

test('downloads and torrent views do not expose companion application launch buttons', () => {
  const ui = fs.readFileSync(path.join(root, 'app/ui/main.jsx'), 'utf8');
  assert.doesNotMatch(ui, /launchEngine\('xdm'\)/);
  assert.doesNotMatch(ui, /launchEngine\('idm'\)/);
  assert.doesNotMatch(ui, /Open qBittorrent/);
});

test('compression actions are kept out of the address and navigation toolbar', () => {
  const ui = read('app/ui/main.jsx');
  const toolbar = ui.slice(ui.indexOf('<div className=\"file-toolbar\">'), ui.indexOf('<div className=\"browser-body\">'));
  assert.doesNotMatch(toolbar, /Compress|Extract|toolbar-format-select/);
  assert.match(ui, /Compress to ZIP/);
  assert.match(ui, /Extract archive/);
});

test('Quick Access is placed above Home and context actions open files inside AIOF', () => {
  const ui = read('app/ui/main.jsx');
  const quick = ui.indexOf("QUICK ACCESS");
  const home = ui.indexOf("title=\"Home\"", quick);
  assert.ok(quick >= 0 && home > quick);
  assert.match(ui, /aiof-context-menu/);
  assert.doesNotMatch(ui, /launchEngine\(/);
  assert.doesNotMatch(read('app/main/preload.cjs'), /launchEngine/);
  assert.match(ui, /setOfficeFile\(item\); setSection\('office'\)/);
});

test('Engine payloads are kept platform-specific in packages', () => {
  const config = JSON.parse(read('configs/electron-builder.json'));
  assert.ok(config.linux.extraResources.some(item => item.from === 'resources/engines/linux'));
  assert.ok(config.win.extraResources.some(item => item.from === 'resources/engines/windows'));
  assert.ok(!config.extraResources.some(item => item.from === 'resources/engines'));
});


test('download service uses parallel HTTP ranges with a single-stream fallback and resumable parts', () => {
  const main = read('app/main/main.cjs');
  assert.match(main, /method: 'HEAD'/);
  assert.match(main, /Range: 'bytes=0-0'/);
  assert.match(main, /Math\.min\(8, Math\.max\(2/);
  assert.match(main, /\.seg-\$\{index\}/);
  assert.match(main, /server byte ranges|byte ranges/i);
  assert.match(main, /response\.status !== 206/);
});

test('unknown file types stay in the AIOF preview instead of launching another application', () => {
  const ui = read('app/ui/main.jsx');
  assert.match(ui, /kind: 'unknown'/);
  assert.match(ui, /preview-unknown-stage/);
  const openStart = ui.indexOf('const openEntry = async item => {');
  const openEnd = ui.indexOf('const toggleHidden', openStart);
  assert.ok(openStart >= 0 && openEnd > openStart);
  assert.doesNotMatch(ui.slice(openStart, openEnd), /window\.aiof\.openPath/);
});

test('PDF build scripts stage the shared Stirling JAR into packaged common resources', () => {
  assert.match(read('platform/linux/build-pdf-engine.sh'), /resources\/engines\/common\/pdf\/stirling-pdf\.jar/);
  assert.match(read('platform/windows/build-pdf-engine.ps1'), /resources\/engines\/common\/pdf\/stirling-pdf\.jar/);
});


test('v0.7.0 follows system theme, removes glass effects and hides PDF sidebar entry', () => {
  const ui = read('app/ui/main.jsx');
  const main = read('app/main/main.cjs');
  const css = read('app/ui/style.css');
  assert.match(ui, /theme: 'system'/);
  assert.match(ui, /System native/);
  assert.match(ui, /advancedImageTools/);
  assert.match(main, /nativeTheme\.themeSource = next\.theme/);
  assert.match(main, /appearance: \['system', 'fluent', 'classic'\]/);
  assert.doesNotMatch(css, /aiof-glass-orbit|data-appearance=\"glass\"|data-neon/);
  const sidebarBlock = ui.slice(ui.indexOf("WORKSPACE':'·'"), ui.indexOf("sidebar-bottom"));
  assert.doesNotMatch(sidebarBlock, /item\.id==='pdf'/);
});

test('LibreOfficeKit embedded-office integration has a native bridge specification', () => {
  assert.ok(exists('native/office-lok/README.md'));
  const spec = read('native/office-lok/README.md');
  assert.match(spec, /tile payloads/i);
  assert.match(spec, /postKeyEvent/);
  assert.ok(spec.includes('Windows') && spec.includes('Linux'));
});


test('legacy glass preferences migrate to system mode and nativeTheme follows saved theme', () => {
  const main = read('app/main/main.cjs');
  assert.match(main, /legacyAppearance \? 'system'/);
  assert.match(main, /nativeTheme\.themeSource = next\.theme/);
});


test('preview panel renders local file previews and remains fixed beside the scrollable list', () => {
  const ui = read('app/ui/main.jsx');
  const css = read('app/ui/style.css');
  assert.match(ui, /preview-pane-pdf/);
  assert.match(ui, /selectedPreviewUrl.*fileKind/);
  assert.match(css, /\.files-page[^{]*\{[^}]*height:100%/s);
  assert.match(css, /\.file-collection[^{]*\{[^}]*overflow:auto/s);
  assert.match(css, /\.preview-panel[^{]*\{[^}]*flex:0 0/);
});

test('uninstall removes only AIOF-owned state and skips destructive cleanup during upgrades', () => {
  const nsis = read('build/installer.nsh');
  const linux = read('platform/linux/after-remove.sh');
  assert.match(nsis, /DELETE_APP_DATA_ON_UNINSTALL/);
  assert.match(nsis, /\$\{ifNot\} \$\{isUpdated\}/);
  assert.match(nsis, /Software\\Classes/);
  assert.match(linux, /upgrade\|failed-upgrade\|abort-upgrade\|1/);
  assert.match(linux, /\.cache\/AIOF/);
  assert.doesNotMatch(linux, /rm -rf.*\.cache\/"?\s*$/m);
});


test('local preview protocol supports range requests for PDF and video previews', () => {
  const main = read('app/main/main.cjs');
  assert.match(main, /registerSchemesAsPrivileged\(\[\{ scheme: 'aiof-file'/);
  assert.match(main, /protocol\.handle\('aiof-file'/);
  assert.match(main, /Accept-Ranges/);
  assert.match(main, /Content-Range/);
  assert.match(main, /aiof-file:\/\/local\/preview/);
});

test('full Windows uninstall removes AIOF profile and local cache roots', () => {
  const nsis = read('build/installer.nsh');
  for (const root of ['$APPDATA\\AIOF','$APPDATA\\aiof-desktop','$LOCALAPPDATA\\AIOF','$LOCALAPPDATA\\aiof-desktop','$TEMP\\AIOF']) {
    assert.ok(nsis.includes(root), `missing uninstall cleanup path ${root}`);
  }
  assert.match(nsis, /\$\{ifNot\} \$\{isUpdated\}/);
});


test('logo is imported into the Vite bundle and file glyphs use the stacked icon treatment', () => {
  const ui = read('app/ui/main.jsx');
  const css = read('app/ui/style.css');
  assert.match(ui, /import aiofLogo from '\.\/branding\/aiof-logo\.png'/);
  assert.match(ui, /src=\{aiofLogo\}/);
  assert.match(ui, /file-glyph-stack/);
  assert.match(css, /\.file-glyph-stack/);
});

test('Office workspace clearly identifies that the embedded LibreOfficeKit runtime is not yet bundled', () => {
  const ui = read('app/ui/main.jsx');
  assert.match(ui, /Embedded Writer, Calc and Impress are not active in this build/);
  assert.match(ui, /system office application instead of showing a non-functional blank editor|will not display a fake editor/i);
});

test('AppImage users get an explicit current-user data purge helper', () => {
  const script = read('platform/linux/uninstall-appimage.sh');
  assert.match(script, /--purge/);
  assert.match(script, /\.config\/AIOF/);
  assert.match(script, /\.cache\/AIOF/);
  assert.match(script, /current account only/);
  assert.doesNotMatch(script, /\/var\/log|\/tmp\/\*|\.cache\"?\s*$/m);
});
