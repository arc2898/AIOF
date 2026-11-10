'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, nativeTheme, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fss = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const net = require('node:net');
const archiver = require('archiver');
const extractZip = require('extract-zip');

// AIOF's private file scheme lets Chromium render local previews without relying
// on inconsistent file:// subresource permissions across Windows and Linux.
protocol.registerSchemesAsPrivileged([{ scheme: 'aiof-file', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

app.setName('AIOF');
// Keep Electron's own temporary artifacts in the AIOF profile so uninstall can
// remove them without touching the operating system's shared TEMP directory.
try { app.setPath('temp', path.join(app.getPath('userData'), 'Temp')); } catch { /* early Electron path override may be unavailable on some hosts */ }
try { fss.mkdirSync(app.getPath('temp'), { recursive: true }); } catch { /* Created by Electron on first temporary write. */ }
if (process.platform === 'win32') app.setAppUserModelId('org.aiof.desktop');
const isDev = !app.isPackaged;
const downloads = new Map();
const qbit = { cookie: '', host: '', lastLogin: 0, managed: false };
let torrentProcess = null;
let pdfProcess = null;
let pdfWindow = null;
let pdfBaseUrl = null;
let mainWindow;

const engines = {
  torrent: { label: 'qBittorrent engine', env: 'AIOF_QBITTORRENT_COMMAND', candidates: process.platform === 'win32' ? ['qbittorrent-nox.exe', 'qbittorrent.exe'] : ['qbittorrent-nox'] },
  archive: { label: '7-Zip engine', env: 'AIOF_7ZIP_COMMAND', candidates: process.platform === 'win32' ? ['7z.exe'] : ['7z'] }
};

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
function cleanName(name) {
  const value = path.basename(String(name || '').trim());
  if (!value || value === '.' || value === '..' || /[\0]/.test(value)) throw new Error('Invalid name');
  return value;
}
function resolvePath(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('A valid file path is required');
  return path.resolve(value);
}
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args.map(String), { windowsHide: true, ...options });
    let stdout = '', stderr = '';
    child.stdout?.on('data', b => { stdout += b.toString(); });
    child.stderr?.on('data', b => { stderr += b.toString(); });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr.trim() || `${command} exited with code ${code}`)));
  });
}
async function withTimeout(promise, timeoutMs, message = 'Operation timed out') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })
    ]);
  } finally { clearTimeout(timer); }
}
function findCommand(candidates) {
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32'
    ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')]
    : [''];
  for (const candidate of candidates) {
    const hasDirectory = path.isAbsolute(candidate) || candidate.includes('/') || candidate.includes('\\');
    const locations = hasDirectory ? [candidate] : pathEntries.flatMap(dir => extensions.map(ext => path.join(dir, candidate + ext)));
    for (const location of locations) {
      try {
        fss.accessSync(location, process.platform === 'win32' ? fss.constants.F_OK : fss.constants.X_OK);
        return location;
      } catch { /* try the next location */ }
    }
  }
  return null;
}
function resolveEngineCommand(key, spec) {
  const configured = process.env[spec.env];
  if (configured) return configured;
  const platformFolder = process.platform === 'win32' ? 'windows' : process.platform === 'linux' ? 'linux' : null;
  if (!platformFolder) return null;
  const engineRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'engines')
    : path.join(app.getAppPath(), 'resources', 'engines', platformFolder);
  const bundledRoot = path.join(engineRoot, key);
  for (const name of spec.candidates) {
    const candidate = path.join(bundledRoot, name);
    try { fss.accessSync(candidate, process.platform === 'win32' ? fss.constants.F_OK : fss.constants.X_OK); return candidate; }
    catch { /* matching platform binary is not bundled */ }
  }
  return null;
}
let rendererReady = false;
function createWindow() {
  rendererReady = false;
  const brandingRoot = app.isPackaged ? path.join(process.resourcesPath, 'branding') : path.join(app.getAppPath(), 'resources', 'branding');
  mainWindow = new BrowserWindow({
    width: 1500, height: 960, minWidth: 1000, minHeight: 680,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202124' : '#f3f5f8', title: 'AIOF — All-in-One File Manager',
    autoHideMenuBar: true, titleBarStyle: 'default',
    icon: path.join(brandingRoot, process.platform === 'win32' ? 'aiof-icon.ico' : 'aiof-logo.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.once('did-finish-load', () => {
    rendererReady = true;
    for (const target of pendingOpenFiles.splice(0)) mainWindow.webContents.send('aiof:open-file', target);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  if (isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let pendingOpenFiles = [];
function findOpenFileArgument(argv = []) {
  for (const raw of argv) {
    const candidate = String(raw || '').replace(/^\"|\"$/g, '');
    if (!candidate || candidate.startsWith('-') || candidate === '.' || candidate === app.getPath('exe')) continue;
    try { const absolute = path.resolve(candidate); if (fss.existsSync(absolute)) { const stat = fss.statSync(absolute); if (stat.isFile() || stat.isDirectory()) return absolute; } } catch { /* ignore command-line flags and invalid arguments */ }
  }
  return null;
}
function queueOpenFile(target) {
  if (!target) return;
  const absolute = path.resolve(String(target));
  if (mainWindow && !mainWindow.isDestroyed() && rendererReady) {
    mainWindow.webContents.send('aiof:open-file', absolute);
    mainWindow.show(); mainWindow.focus();
  } else pendingOpenFiles.push(absolute);
}
if (hasSingleInstanceLock) {
  app.on('second-instance', (_event, argv) => {
    const file = findOpenFileArgument(argv);
    if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
    queueOpenFile(file);
  });
  app.on('open-file', (event, filePath) => { event.preventDefault(); queueOpenFile(filePath); });
  app.whenReady().then(async () => {
    protocol.handle('aiof-file', async request => {
      try {
        const target = new URL(request.url).searchParams.get('path');
        const absolute = resolvePath(target);
        const stat = await fs.stat(absolute);
        if (!stat.isFile()) return new Response('Not a file', { status: 404 });
        const ext = path.extname(absolute).toLowerCase();
        const mime = ({ '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.bmp':'image/bmp','.svg':'image/svg+xml','.avif':'image/avif','.tif':'image/tiff','.tiff':'image/tiff','.pdf':'application/pdf','.mp4':'video/mp4','.m4v':'video/mp4','.webm':'video/webm','.ogv':'video/ogg','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.flac':'audio/flac','.m4a':'audio/mp4','.aac':'audio/aac','.opus':'audio/ogg' })[ext] || 'application/octet-stream';
        const headers = { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
        const range = request.headers.get('range');
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
          const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
          const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= stat.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
          headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
          headers['Content-Length'] = String(end - start + 1);
          return new Response(Readable.toWeb(fss.createReadStream(absolute, { start, end })), { status: 206, headers });
        }
        headers['Content-Length'] = String(stat.size);
        if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
        return new Response(Readable.toWeb(fss.createReadStream(absolute)), { status: 200, headers });
      } catch (error) {
        return new Response(error.code === 'ENOENT' ? 'Not found' : 'Unable to preview this file', { status: error.code === 'ENOENT' ? 404 : 403 });
      }
    });
    try { const prefs = await readSettings(); const legacyAppearance = ['glass','neo','minimal'].includes(prefs.appearance); nativeTheme.themeSource = legacyAppearance ? 'system' : (['dark','light','system'].includes(prefs.theme) ? prefs.theme : 'system'); } catch { nativeTheme.themeSource = 'system'; }
    createWindow();
    const firstFile = findOpenFileArgument(process.argv.slice(1));
    if (firstFile) pendingOpenFiles.push(firstFile);
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
} else app.quit();
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { for (const task of downloads.values()) task.controller?.abort(); torrentProcess?.kill(); pdfProcess?.kill(); });

// -----------------------------------------------------------------------------
// File manager
// -----------------------------------------------------------------------------
ipcMain.handle('aiof:home', () => app.getPath('home'));
async function getPlaces() {
  const home = app.getPath('home');
  const keys = ['desktop', 'documents', 'downloads', 'pictures', 'music', 'videos'];
  const places = [{ name: 'Home', path: home, kind: 'home' }];
  for (const key of keys) {
    try { const location = app.getPath(key); await fs.access(location); places.push({ name: key[0].toUpperCase() + key.slice(1), path: location, kind: key }); } catch { /* optional OS directory */ }
  }
  if (process.platform === 'win32') {
    // Probe drive letters concurrently with a short cap. Offline mapped/network
    // volumes must not hold up the first AIOF window.
    const drives = await Promise.all(Array.from({ length: 24 }, (_, index) => String.fromCharCode(67 + index) + ':\\').map(async drive => {
      try { await withTimeout(fs.access(drive), 450, 'Drive probe timed out'); return { name: drive, path: drive, kind: 'drive' }; }
      catch { return null; }
    }));
    places.push(...drives.filter(Boolean));
  } else {
    places.push({ name: 'File System', path: '/', kind: 'root' });
    const mountRoots = ['/mnt', '/media', '/run/media/' + os.userInfo().username];
    for (const mountRoot of mountRoots) {
      try {
        const entries = await fs.readdir(mountRoot, { withFileTypes: true });
        for (const entry of entries.filter(e => e.isDirectory())) {
          const location = path.join(mountRoot, entry.name);
          if (!places.some(item => item.path === location)) places.push({ name: entry.name, path: location, kind: 'drive' });
        }
      } catch { /* mount root may not exist */ }
    }
  }
  return places;
}
ipcMain.handle('aiof:places', () => getPlaces());
ipcMain.handle('aiof:choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('aiof:pick-files', async (_event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: Array.isArray(filters) ? filters : [] });
  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('aiof:is-directory', async (_event, target) => { const stat = await fs.stat(resolvePath(target)); return stat.isDirectory(); });
ipcMain.handle('aiof:list-dir', async (_event, dir, showHidden = false) => {
  const target = resolvePath(dir || app.getPath('home'));
  const entries = await fs.readdir(target, { withFileTypes: true });
  const rows = await Promise.all(entries
    .filter(entry => showHidden || !entry.name.startsWith('.'))
    .map(async entry => {
      const full = path.join(target, entry.name);
      try {
        const stat = await fs.lstat(full);
        return {
          name: entry.name, path: full, isDirectory: stat.isDirectory(), isSymlink: stat.isSymbolicLink(),
          size: stat.size, modified: stat.mtime.toISOString(), created: stat.birthtime.toISOString(),
          extension: stat.isDirectory() ? '' : path.extname(entry.name).slice(1).toLowerCase(),
          hidden: entry.name.startsWith('.'), isFile: stat.isFile()
        };
      } catch { return { name: entry.name, path: full, isDirectory: entry.isDirectory(), size: 0, modified: '', extension: '' }; }
    }));
  const sorted = rows.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  await recordFolderUse(target).catch(() => {});
  return sorted;
});
ipcMain.handle('aiof:open-path', async (_event, target) => {
  const absolute = resolvePath(target);
  const error = await shell.openPath(absolute);
  if (error) throw new Error(error);
  await recordRecentPath(absolute).catch(() => {});
  return true;
});
ipcMain.handle('aiof:show-item', (_event, target) => { shell.showItemInFolder(resolvePath(target)); return true; });
ipcMain.handle('aiof:file-url', async (_event, target) => `aiof-file://local/preview?path=${encodeURIComponent(resolvePath(target))}`);
ipcMain.handle('aiof:create-folder', async (_event, dir, name) => {
  const destination = path.join(resolvePath(dir), cleanName(name));
  await fs.mkdir(destination);
  return destination;
});
ipcMain.handle('aiof:create-file', async (_event, dir, name) => {
  const destination = path.join(resolvePath(dir), cleanName(name));
  const handle = await fs.open(destination, 'wx'); await handle.close(); return destination;
});

// Create minimal, valid OpenDocument starter packages. Editing remains delegated
// to the user's installed office suite until a native LibreOfficeKit runtime is staged.
function createOdfPackage(destination, format) {
  const specs = {
    odt: { mime: 'application/vnd.oasis.opendocument.text', body: '<office:text><text:p>Start writing here.</text:p></office:text>' },
    ods: { mime: 'application/vnd.oasis.opendocument.spreadsheet', body: '<office:spreadsheet><table:table table:name="Sheet1"><table:table-row><table:table-cell office:value-type="string"><text:p></text:p></table:table-cell></table:table-row></table:table></office:spreadsheet>' },
    odp: { mime: 'application/vnd.oasis.opendocument.presentation', body: '<office:presentation><draw:page draw:name="Slide 1" draw:style-name="dp1" draw:master-page-name="Default"><draw:frame draw:style-name="gr1" draw:text-style-name="P1" svg:width="20cm" svg:height="2cm" svg:x="2cm" svg:y="2cm"><draw:text-box><text:p>Title</text:p></draw:text-box></draw:frame></draw:page></office:presentation>' }
  };
  const spec = specs[format];
  if (!spec) throw new Error('Unsupported OpenDocument format.');
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="${spec.mime}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="settings.xml" manifest:media-type="text/xml"/></manifest:manifest>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.3"><office:automatic-styles/><office:body>${spec.body}</office:body></office:document-content>`;
  const styles = '<?xml version="1.0" encoding="UTF-8"?><office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.3"><office:styles/><office:automatic-styles/><office:master-styles/></office:document-styles>';
  const meta = `<?xml version="1.0" encoding="UTF-8"?><office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3"><office:meta><dc:title>${path.basename(destination).replace(/[&<>]/g, '')}</dc:title></office:meta></office:document-meta>`;
  const settings = '<?xml version="1.0" encoding="UTF-8"?><office:document-settings xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.3"><office:settings/></office:document-settings>';
  return new Promise((resolve, reject) => {
    const output = fss.createWriteStream(destination, { flags: 'wx' });
    const archive = archiver('zip', { zlib: { level: 6 } });
    let settled = false;
    const fail = error => { if (settled) return; settled = true; output.destroy(); fs.rm(destination, { force: true }).catch(() => {}); reject(error); };
    output.once('close', () => { if (!settled) { settled = true; resolve(destination); } });
    output.once('error', fail); archive.once('error', fail); archive.pipe(output);
    archive.append(spec.mime, { name: 'mimetype', store: true });
    archive.append(manifest, { name: 'META-INF/manifest.xml' });
    archive.append(content, { name: 'content.xml' });
    archive.append(styles, { name: 'styles.xml' });
    archive.append(meta, { name: 'meta.xml' });
    archive.append(settings, { name: 'settings.xml' });
    archive.finalize().catch(fail);
  });
}
ipcMain.handle('aiof:office-create', async (_event, directory, format, name) => {
  const root = resolvePath(directory);
  const extension = ({ odt: '.odt', ods: '.ods', odp: '.odp' })[format];
  if (!extension) throw new Error('Choose Writer (.odt), Calc (.ods) or Impress (.odp).');
  const safeName = cleanName(name);
  const finalName = safeName.toLowerCase().endsWith(extension) ? safeName : `${safeName.replace(/\\.[^.]+$/, '')}${extension}`;
  const destination = path.join(root, finalName);
  await fs.access(root);
  return createOdfPackage(destination, format);
});
ipcMain.handle('aiof:rename', async (_event, target, name) => {
  const source = resolvePath(target); const destination = path.join(path.dirname(source), cleanName(name));
  await fs.rename(source, destination); return destination;
});
ipcMain.handle('aiof:trash', async (_event, target) => {
  const p = resolvePath(target); await fs.access(p); await shell.trashItem(p); return true;
});
ipcMain.handle('aiof:copy', async (_event, target, destinationDir) => {
  const source = resolvePath(target), dir = resolvePath(destinationDir);
  const destination = path.join(dir, path.basename(source));
  await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false, dereference: false }); return destination;
});
ipcMain.handle('aiof:move', async (_event, target, destinationDir) => {
  const source = resolvePath(target), dir = resolvePath(destinationDir);
  const destination = path.join(dir, path.basename(source));
  try { await fs.rename(source, destination); }
  catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false, dereference: false, preserveTimestamps: true });
    await fs.rm(source, { recursive: true, force: false });
  }
  return destination;
});
ipcMain.handle('aiof:read-text', async (_event, target) => {
  const p = resolvePath(target); const stat = await fs.stat(p);
  if (!stat.isFile() || stat.size > 5 * 1024 * 1024) throw new Error('Text preview is limited to files up to 5 MB');
  await recordRecentPath(p).catch(() => {});
  return fs.readFile(p, 'utf8');
});
ipcMain.handle('aiof:write-text', async (_event, target, content) => {
  const p = resolvePath(target); const stat = await fs.stat(p);
  if (!stat.isFile() || stat.size > 5 * 1024 * 1024) throw new Error('Editing is limited to existing files up to 5 MB');
  await fs.writeFile(p, String(content), 'utf8'); return true;
});
ipcMain.handle('aiof:save-text-as', async (_event, content, defaultName = 'Untitled.txt') => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, String(content), 'utf8'); return result.filePath;
});
ipcMain.handle('aiof:search', async (_event, root, query, limit = 250) => {
  const base = resolvePath(root), needle = String(query || '').toLocaleLowerCase();
  if (!needle) return [];
  const results = []; const queue = [base];
  while (queue.length && results.length < Math.min(Number(limit) || 250, 500)) {
    const current = queue.shift(); let entries;
    try { entries = await fs.readdir(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.name.toLocaleLowerCase().includes(needle)) {
        try { const stat = await fs.stat(full); results.push({ name: entry.name, path: full, isDirectory: stat.isDirectory(), size: stat.size, modified: stat.mtime.toISOString(), extension: path.extname(entry.name).slice(1).toLowerCase() }); } catch { /* race */ }
      }
      if (entry.isDirectory() && !entry.isSymbolicLink() && queue.length < 2000) queue.push(full);
      if (results.length >= limit) break;
    }
  }
  return results;
});

// -----------------------------------------------------------------------------
// Archive manager: create ZIP in-app; use 7-Zip for other archive formats.
// -----------------------------------------------------------------------------
ipcMain.handle('aiof:archive-create', async (_event, sourcePaths, destination) => {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) throw new Error('Select at least one item to compress');
  const out = resolvePath(destination);
  const sources = sourcePaths.map(resolvePath);
  for (const source of sources) await fs.access(source);
  try { await fs.access(out); throw new Error('An item with that archive name already exists. Choose a different name.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(path.dirname(out), { recursive: true });
  const ext = path.extname(out).toLowerCase();
  if (ext === '.zip') {
    await new Promise((resolve, reject) => {
      const output = fss.createWriteStream(out, { flags: 'wx' });
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.once('close', resolve); output.once('error', reject); archive.once('error', reject);
      archive.pipe(output);
      for (const source of sources) {
        const stat = fss.statSync(source);
        if (stat.isDirectory()) archive.directory(source, path.basename(source));
        else archive.file(source, { name: path.basename(source) });
      }
      archive.finalize().catch(reject);
    });
  } else {
    const command = resolveEngineCommand('archive', engines.archive);
    if (!command) throw new Error('The selected format needs the bundled 7-Zip engine. ZIP is always available.');
    const format = ({ '.7z': '7z', '.tar': 'tar', '.gz': 'gzip', '.bz2': 'bzip2', '.xz': 'xz' })[ext];
    if (!format) throw new Error(`Unsupported archive output format: ${ext}`);
    await run(command, ['a', `-t${format}`, out, ...sources]);
  }
  return out;
});
ipcMain.handle('aiof:archive-extract', async (_event, archivePath, destination) => {
  const source = resolvePath(archivePath); const dest = resolvePath(destination);
  await fs.mkdir(dest, { recursive: true });
  const ext = path.extname(source).toLowerCase();
  if (ext === '.zip') await extractZip(source, { dir: dest });
  else {
    const command = resolveEngineCommand('archive', engines.archive);
    if (!command) throw new Error('AIOF 7-Zip runtime is not staged for this operating system. ZIP is built in; build the matching 7-Zip engine for this platform.');
    await run(command, ['x', '-y', `-o${dest}`, source]);
  }
  return dest;
});

// -----------------------------------------------------------------------------
// Built-in HTTP(S) download queue with pause/resume and partial-file retention.
// -----------------------------------------------------------------------------
function downloadSnapshot(task) {
  return { id: task.id, url: task.url, filename: task.filename, path: task.finalPath, status: task.status, received: task.received || 0, total: task.total || 0, segmented: Boolean(task.segmented), segmentCount: task.segmented ? (task.segmentCount || 0) : 0, error: task.error || '' };
}
function updateDownload(task, patch = {}) { Object.assign(task, patch); send('aiof:download-update', downloadSnapshot(task)); }
function safeFilename(name) {
  const cleaned = path.basename(String(name || 'download').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')).trim();
  return cleaned || `download-${Date.now()}`;
}
async function discoverDownloadName(response, task) {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  let responseName = '';
  if (match) {
    try { responseName = decodeURIComponent(match[1] || match[2]); }
    catch { responseName = match[1] || match[2] || ''; }
  }
  if (!task.filename || task.autoName) task.filename = safeFilename(responseName || path.basename(new URL(task.url).pathname) || 'download');
  task.finalPath = path.join(task.directory, task.filename);
  task.partPath = `${task.finalPath}.aiof-part`;
}
async function finaliseDownload(task) {
  let finalPath = task.finalPath;
  try { await fs.access(finalPath); finalPath = path.join(task.directory, `${path.parse(task.filename).name} (${Date.now()})${path.extname(task.filename)}`); }
  catch { /* free target */ }
  await fs.rename(task.partPath, finalPath);
  task.finalPath = finalPath;
  updateDownload(task, { status: 'completed', received: task.total || task.received, error: '' });
}
async function trySegmentedDownload(task) {
  // Only parallelize servers that explicitly support byte ranges and expose a
  // stable length. A one-byte probe avoids corrupting files on weak servers.
  let head;
  try { head = await fetch(task.url, { method: 'HEAD', signal: task.controller.signal, redirect: 'follow' }); }
  catch { return false; }
  if (!head.ok) return false;
  await discoverDownloadName(head, task);
  const total = Number(head.headers.get('content-length') || 0);
  const acceptsRanges = /\bbytes\b/i.test(head.headers.get('accept-ranges') || '');
  if (!acceptsRanges || !Number.isFinite(total) || total < 16 * 1024 * 1024) return false;
  try { await fs.access(task.partPath); return false; } catch { /* use independent segment files */ }
  const probe = await fetch(task.url, { signal: task.controller.signal, headers: { Range: 'bytes=0-0' }, redirect: 'follow' });
  if (probe.status !== 206) { await probe.body?.cancel(); return false; }
  await probe.body?.cancel();

  const segmentCount = Math.min(8, Math.max(2, Math.ceil(total / (8 * 1024 * 1024))));
  const segmentLength = Math.ceil(total / segmentCount);
  const parts = Array.from({ length: segmentCount }, (_, index) => {
    const start = index * segmentLength;
    return { index, start, end: Math.min(total - 1, start + segmentLength - 1), path: `${task.partPath}.seg-${index}` };
  });
  task.total = total;
  task.segmented = true;
  task.segmentCount = segmentCount;
  task.segmentProgress = [];
  task.received = 0;
  updateDownload(task, { status: 'downloading' });

  const transferResults = await Promise.allSettled(parts.map(async part => {
    let offset = 0;
    try { offset = (await fs.stat(part.path)).size; } catch { /* segment has not started */ }
    const segmentBytes = part.end - part.start + 1;
    if (offset >= segmentBytes) { task.segmentProgress[part.index] = segmentBytes; return; }
    const response = await fetch(task.url, {
      signal: task.controller.signal,
      headers: { Range: `bytes=${part.start + offset}-${part.end}` },
      redirect: 'follow'
    });
    if (response.status !== 206) {
      await response.body?.cancel();
      throw new Error(`Download server stopped honoring byte ranges (HTTP ${response.status}). Resume or retry this download.`);
    }
    const handle = await fs.open(part.path, offset ? 'a' : 'w');
    try {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await handle.writeFile(value);
        offset += value.byteLength;
        task.segmentProgress[part.index] = offset;
        task.received = task.segmentProgress.reduce((sum, value) => sum + (value || 0), 0);
        updateDownload(task, { status: 'downloading', received: task.received, total: task.total });
      }
    } finally { await handle.close(); }
    if (offset !== segmentBytes) throw new Error(`Segment ${part.index + 1} ended early (${offset} of ${segmentBytes} bytes). Resume to continue.`);
  }));
  const transferFailure = transferResults.find(result => result.status === 'rejected');
  if (transferFailure) throw transferFailure.reason;

  const output = await fs.open(task.partPath, 'w');
  try {
    for (const part of parts) {
      for await (const chunk of fss.createReadStream(part.path)) await output.writeFile(chunk);
    }
  } finally { await output.close(); }
  for (const part of parts) await fs.rm(part.path, { force: true });
  task.received = total;
  return true;
}
async function runDownload(task) {
  task.controller = new AbortController(); task.error = ''; updateDownload(task, { status: 'downloading' });
  try {
    const segmented = await trySegmentedDownload(task);
    if (!segmented) {
      // If this is a retry of an interrupted segmented transfer, preserve the
      // independent pieces and retry them instead of restarting as one stream.
      if (task.segmented && task.segmentCount) {
        const parts = Array.from({ length: task.segmentCount }, (_, index) => ({ path: `${task.partPath}.seg-${index}` }));
        const existing = await Promise.all(parts.map(async part => { try { return (await fs.stat(part.path)).size; } catch { return 0; } }));
        if (existing.some(Boolean) && Number(task.total) > 0) {
          // The server may have temporarily omitted HEAD metadata; keep the
          // last known segment plan and let the range workers continue below.
          const total = task.total;
          const count = task.segmentCount;
          const segmentLength = Math.ceil(total / count);
          const resumeParts = Array.from({ length: count }, (_, index) => ({ index, start: index * segmentLength, end: Math.min(total - 1, (index + 1) * segmentLength - 1), path: `${task.partPath}.seg-${index}` }));
          const resumeResults = await Promise.allSettled(resumeParts.map(async part => {
            let offset = 0; try { offset = (await fs.stat(part.path)).size; } catch { /* new */ }
            const expected = part.end - part.start + 1; if (offset >= expected) return;
            const response = await fetch(task.url, { signal: task.controller.signal, headers: { Range: `bytes=${part.start + offset}-${part.end}` }, redirect: 'follow' });
            if (response.status !== 206) { await response.body?.cancel(); throw new Error(`Cannot resume segment ${part.index + 1}: server returned HTTP ${response.status}`); }
            const handle = await fs.open(part.path, offset ? 'a' : 'w');
            try { const reader = response.body.getReader(); while (true) { const {done,value}=await reader.read(); if(done) break; await handle.writeFile(value); offset+=value.byteLength; task.received=existing.reduce((sum,n)=>sum+n,0)+(offset-(existing[part.index]||0)); updateDownload(task,{status:'downloading',received:Math.max(task.received,existing.reduce((sum,n)=>sum+n,0))}); } }
            finally { await handle.close(); }
            if (offset !== expected) throw new Error(`Segment ${part.index + 1} is incomplete. Resume again to continue.`);
          }));
          const resumeFailure = resumeResults.find(result => result.status === 'rejected');
          if (resumeFailure) throw resumeFailure.reason;
          const output=await fs.open(task.partPath,'w'); try { for(const part of resumeParts) for await(const chunk of fss.createReadStream(part.path)) await output.writeFile(chunk); } finally { await output.close(); }
          for(const part of resumeParts) await fs.rm(part.path,{force:true});
          task.received=total;
        } else {
          task.segmented = false;
        }
      }
      if (!task.segmented) {
        // Single-stream fallback supports servers without byte ranges and small files.
        let response = await fetch(task.url, { signal: task.controller.signal, redirect: 'follow' });
        await discoverDownloadName(response, task);
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        let offset = 0;
        try { offset = (await fs.stat(task.partPath)).size; } catch { /* first run */ }
        if (offset > 0) {
          await response.body?.cancel();
          response = await fetch(task.url, { signal: task.controller.signal, headers: { Range: `bytes=${offset}-` }, redirect: 'follow' });
          if (response.status === 416) {
            await response.body?.cancel();
            response = await fetch(task.url, { signal: task.controller.signal, redirect: 'follow' });
            offset = 0; await fs.writeFile(task.partPath, '');
          } else if (response.status !== 206) { offset = 0; await fs.writeFile(task.partPath, ''); }
        }
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const length = Number(response.headers.get('content-length') || 0);
        task.total = length ? length + offset : 0; task.received = offset;
        const handle = await fs.open(task.partPath, offset ? 'a' : 'w');
        try { const reader=response.body.getReader(); while(true){ const {done,value}=await reader.read(); if(done) break; await handle.writeFile(value); task.received+=value.byteLength; if(task.total&&task.received>task.total) task.total=task.received; updateDownload(task,{status:'downloading'}); } }
        finally { await handle.close(); }
      }
    }
    await finaliseDownload(task);
  } catch (error) {
    if (task.cancelled) {
      try { await fs.rm(task.partPath, { force: true }); for(let i=0;i<(task.segmentCount||0);i++) await fs.rm(`${task.partPath}.seg-${i}`,{force:true}); } catch { /* file may already be gone */ }
      updateDownload(task, { status: 'cancelled' });
    } else if (task.controller?.signal.aborted) updateDownload(task, { status: 'paused' });
    else updateDownload(task, { status: 'error', error: error.message || 'Download failed' });
  } finally { task.controller = null; }
}
ipcMain.handle('aiof:download-list', () => [...downloads.values()].map(downloadSnapshot));
ipcMain.handle('aiof:download-start', async (_event, url, filename, directory) => {
  let parsed; try { parsed = new URL(String(url)); } catch { throw new Error('Enter a valid HTTP or HTTPS URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS downloads are supported');
  const dir = resolvePath(directory || app.getPath('downloads')); await fs.mkdir(dir, { recursive: true });
  const name = filename ? safeFilename(filename) : safeFilename(path.basename(parsed.pathname));
  const id = randomUUID();
  const task = { id, url: parsed.href, filename: name, autoName: !filename, directory: dir, finalPath: path.join(dir, name), partPath: path.join(dir, `${name}.aiof-part`), status: 'queued', received: 0, total: 0, cancelled: false };
  downloads.set(id, task); updateDownload(task); runDownload(task);
  return downloadSnapshot(task);
});
ipcMain.handle('aiof:download-pause', (_event, id) => { const task = downloads.get(String(id)); if (task?.controller) task.controller.abort(); return true; });
ipcMain.handle('aiof:download-resume', async (_event, id) => { const task = downloads.get(String(id)); if (!task) throw new Error('Download not found'); if (['paused', 'error'].includes(task.status)) runDownload(task); return true; });
ipcMain.handle('aiof:download-cancel', async (_event, id) => {
  const task = downloads.get(String(id)); if (!task) return false;
  task.cancelled = true;
  if (task.controller) task.controller.abort();
  else { try { await fs.rm(task.partPath, { force: true }); for(let i=0;i<(task.segmentCount||0);i++) await fs.rm(`${task.partPath}.seg-${i}`,{force:true}); } catch { /* noop */ } }
  updateDownload(task, { status: 'cancelled' }); return true;
});

// -----------------------------------------------------------------------------
// Local system integrations: network speed and Windows context menu.
// The public speed-test endpoint is opt-in and never runs in the background.
// -----------------------------------------------------------------------------
ipcMain.handle('aiof:internet-speed-test', async () => {
  const base = 'https://speed.cloudflare.com';
  const ping = [];
  for (let index = 0; index < 4; index++) {
    const started = performance.now();
    const response = await fetch(`${base}/__down?bytes=0&aiof=${Date.now()}-${index}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Latency request returned HTTP ${response.status}`);
    await response.arrayBuffer(); ping.push(performance.now() - started);
  }
  const pingMs = ping.reduce((sum, value) => sum + value, 0) / ping.length;
  const downloadBytes = 8 * 1024 * 1024;
  const downloadStart = performance.now();
  const downloadResponse = await fetch(`${base}/__down?bytes=${downloadBytes}&aiof=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(25000) });
  if (!downloadResponse.ok) throw new Error(`Download test returned HTTP ${downloadResponse.status}`);
  const downloaded = await downloadResponse.arrayBuffer();
  const downloadSeconds = Math.max((performance.now() - downloadStart) / 1000, 0.001);
  const downloadMbps = downloaded.byteLength * 8 / downloadSeconds / 1_000_000;
  let uploadMbps = null;
  try {
    const uploadBytes = 3 * 1024 * 1024;
    const payload = Buffer.alloc(uploadBytes, 0x5a);
    const uploadStart = performance.now();
    const uploadResponse = await fetch(`${base}/__up?aiof=${Date.now()}`, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' }, signal: AbortSignal.timeout(25000) });
    if (uploadResponse.ok) {
      await uploadResponse.arrayBuffer();
      const uploadSeconds = Math.max((performance.now() - uploadStart) / 1000, 0.001);
      uploadMbps = uploadBytes * 8 / uploadSeconds / 1_000_000;
    }
  } catch { /* Upload can be blocked by captive portals or network filters; keep the other metrics. */ }
  return { pingMs, downloadMbps, uploadMbps, server: 'Cloudflare edge', testedAt: new Date().toISOString(), downloadBytes: downloaded.byteLength };
});

ipcMain.handle('aiof:context-menu-register', async (_event, enabled) => {
  if (process.platform !== 'win32') return { supported: false, enabled: false };
  const exe = app.getPath('exe');
  const entries = [
    { key: 'HKCU\\Software\\Classes\\*\\shell\\AIOF.OpenWith', label: 'Open with AIOF' },
    { key: 'HKCU\\Software\\Classes\\Directory\\shell\\AIOF.OpenWith', label: 'Open folder with AIOF' }
  ];
  if (enabled) {
    for (const entry of entries) {
      await run('reg.exe', ['add', entry.key, '/ve', '/d', entry.label, '/f']);
      await run('reg.exe', ['add', entry.key, '/v', 'Icon', '/d', exe, '/f']);
      await run('reg.exe', ['add', `${entry.key}\\command`, '/ve', '/d', `\"${exe}\" \"%1\"`, '/f']);
    }
    return { supported: true, enabled: true };
  }
  for (const entry of entries) {
    try { await run('reg.exe', ['delete', entry.key, '/f']); } catch { /* already absent */ }
  }
  return { supported: true, enabled: false };
});

// -----------------------------------------------------------------------------
// qBittorrent Web API adapter. qBittorrent remains a separately licensed engine.
// -----------------------------------------------------------------------------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
async function readSettings() {
  try {
    const data = JSON.parse(await fs.readFile(settingsFile(), 'utf8'));
    if (data.qbitPasswordEncrypted && safeStorage.isEncryptionAvailable()) data.qbitPassword = safeStorage.decryptString(Buffer.from(data.qbitPasswordEncrypted, 'base64'));
    return data;
  } catch { return {}; }
}
async function writeSettings(data) {
  const saved = { ...data };
  if (saved.qbitPassword && safeStorage.isEncryptionAvailable()) {
    saved.qbitPasswordEncrypted = safeStorage.encryptString(saved.qbitPassword).toString('base64');
    delete saved.qbitPassword;
  }
  await fs.mkdir(path.dirname(settingsFile()), { recursive: true });
  await fs.writeFile(settingsFile(), JSON.stringify(saved, null, 2), { mode: 0o600 });
  return true;
}
ipcMain.handle('aiof:settings-get', async () => {
  const settings = await readSettings();
  return { theme: ['glass','neo','minimal'].includes(settings.appearance) ? 'system' : (['dark','light','system'].includes(settings.theme) ? settings.theme : 'system'), showHidden: Boolean(settings.showHidden), qbitHost: settings.qbitHost || 'http://127.0.0.1:8080', qbitUsername: settings.qbitUsername || 'admin', qbitPasswordSet: Boolean(settings.qbitPassword || settings.qbitPasswordEncrypted), accent: settings.accent || 'blue', accentCustom: settings.accentCustom || '#2687df', roundness: settings.roundness || 'soft', wallpaperOpacity: Number.isFinite(settings.wallpaperOpacity) ? settings.wallpaperOpacity : 78, density: settings.density || 'comfortable', wallpaperPath: settings.wallpaperPath || '', appearance: ['system','fluent','classic'].includes(settings.appearance) ? settings.appearance : 'system', neonBorders: false, advancedImageTools: Boolean(settings.advancedImageTools), showQuickAccess: settings.showQuickAccess !== false, showDriveUsage: settings.showDriveUsage !== false, showSystemNav: settings.showSystemNav !== false, showInternetNav: settings.showInternetNav !== false, defaultView: settings.defaultView || 'list', contextMenuEnabled: Boolean(settings.contextMenuEnabled) };
});
function validateLocalWebUi(value) {
  let parsed;
  try { parsed = new URL(String(value || 'http://127.0.0.1:8080')); } catch { throw new Error('Enter a valid qBittorrent Web UI URL'); }
  const host = parsed.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(parsed.protocol) || !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host) || parsed.username || parsed.password) {
    throw new Error('For safety, AIOF only connects to a qBittorrent Web UI on this computer (localhost / 127.0.0.1).');
  }
  return parsed.origin;
}
ipcMain.handle('aiof:settings-save', async (_event, input) => {
  const prev = await readSettings();
  const next = {
    ...prev,
    theme: ['dark', 'light', 'system'].includes(input.theme) ? input.theme : (prev.theme || 'system'),
    showHidden: Boolean(input.showHidden),
    qbitHost: validateLocalWebUi(input.qbitHost),
    qbitUsername: String(input.qbitUsername || 'admin'),
    accent: ['slate', 'blue', 'teal', 'violet', 'rose', 'amber', 'custom'].includes(input.accent) ? input.accent : (prev.accent || 'blue'),
    accentCustom: /^#[0-9a-fA-F]{6}$/.test(String(input.accentCustom || '')) ? String(input.accentCustom) : (prev.accentCustom || '#2687df'),
    roundness: ['square', 'soft', 'rounded'].includes(input.roundness) ? input.roundness : (prev.roundness || 'soft'),
    wallpaperOpacity: Math.min(92, Math.max(15, Number(input.wallpaperOpacity) || 78)),
    appearance: ['system', 'fluent', 'classic'].includes(input.appearance) ? input.appearance : 'system',
    neonBorders: false,
    advancedImageTools: Boolean(input.advancedImageTools),
    showQuickAccess: input.showQuickAccess !== false,
    showDriveUsage: input.showDriveUsage !== false,
    showSystemNav: input.showSystemNav !== false,
    showInternetNav: input.showInternetNav !== false,
    defaultView: input.defaultView === 'grid' ? 'grid' : 'list',
    contextMenuEnabled: Boolean(input.contextMenuEnabled),
    density: ['compact', 'comfortable', 'spacious'].includes(input.density) ? input.density : 'comfortable',
    wallpaperPath: ''
  };
  if (input.wallpaperPath) {
    const wallpaper = resolvePath(input.wallpaperPath);
    const extension = path.extname(wallpaper).toLowerCase();
    if (!['.png','.jpg','.jpeg','.webp','.bmp'].includes(extension)) throw new Error('Wallpaper must be PNG, JPEG, WebP or BMP.');
    const stat = await fs.stat(wallpaper); if (!stat.isFile()) throw new Error('Wallpaper path is not a file.');
    next.wallpaperPath = wallpaper;
  }
  if (typeof input.qbitPassword === 'string' && input.qbitPassword.length) next.qbitPassword = input.qbitPassword;
  await writeSettings(next); nativeTheme.themeSource = next.theme; qbit.cookie = ''; qbit.managed = false; return true;
});

function trimPathEntry(entry) {
  if (!entry || typeof entry.path !== 'string') return null;
  return { path: path.resolve(entry.path), name: String(entry.name || path.basename(entry.path) || entry.path).slice(0, 240), kind: String(entry.kind || 'folder'), lastOpened: entry.lastOpened || new Date().toISOString() };
}
async function recordRecentPath(target) {
  const p = resolvePath(target);
  const stat = await fs.stat(p);
  const settings = await readSettings();
  const item = { path: p, name: path.basename(p) || p, kind: stat.isDirectory() ? 'folder' : 'file', lastOpened: new Date().toISOString() };
  settings.recentItems = [item, ...(settings.recentItems || []).filter(row => row.path !== p)].slice(0, 24);
  await writeSettings(settings);
}
async function recordFolderUse(target) {
  const settings = await readSettings();
  const p = path.resolve(target);
  const use = settings.folderUsage || {};
  use[p] = { count: Math.min(100000, Number(use[p]?.count || 0) + 1), lastOpened: new Date().toISOString() };
  settings.folderUsage = use;
  const folderItem = { path: p, name: path.basename(p) || p, kind: 'folder', lastOpened: new Date().toISOString() };
  settings.recentFolders = [folderItem, ...(settings.recentFolders || []).filter(row => row.path !== p)].slice(0, 24);
  settings.recentItems = [folderItem, ...(settings.recentItems || []).filter(row => row.path !== p)].slice(0, 24);
  await writeSettings(settings);
}
async function getDiskStats(location) {
  try {
    const stat = await withTimeout(fs.statfs(location), 900, 'Drive statistics timed out');
    const total = Number(stat.blocks) * Number(stat.bsize);
    const free = Number(stat.bavail) * Number(stat.bsize);
    return { total, free, used: Math.max(0, total - free), percent: total ? Math.round(((total - free) / total) * 1000) / 10 : 0 };
  } catch { return null; }
}
ipcMain.handle('aiof:home-data', async () => {
  const settings = await readSettings();
  const places = await getPlaces();
  const seen = new Set();
  const diskPlaces = places.filter(item => ['drive', 'root'].includes(item.kind)).filter(place => {
    const signature = path.resolve(place.path).toLowerCase();
    if (seen.has(signature)) return false;
    seen.add(signature); return true;
  });
  const disks = (await Promise.all(diskPlaces.map(async place => {
    const stats = await getDiskStats(place.path);
    return stats ? { ...place, ...stats } : null;
  }))).filter(Boolean);
  const usage = settings.folderUsage || {};
  const mostUsed = Object.entries(usage).map(([folder, data]) => ({ path: folder, name: path.basename(folder) || folder, count: Number(data.count || 0), lastOpened: data.lastOpened || '' })).sort((a, b) => b.count - a.count).slice(0, 8);
  const pinnedSource = Array.isArray(settings.pinnedFolders) ? settings.pinnedFolders : places.filter(item => ['desktop', 'documents', 'downloads', 'pictures'].includes(item.kind));
  const pinned = pinnedSource.map(trimPathEntry).filter(Boolean);
  const recent = (settings.recentItems || []).map(trimPathEntry).filter(Boolean).slice(0, 16);
  return { disks, pinned, recent, mostUsed, places };
});
ipcMain.handle('aiof:pin-folder', async (_event, target) => {
  const p = resolvePath(target); const stat = await fs.stat(p);
  if (!stat.isDirectory()) throw new Error('Only folders can be pinned');
  const settings = await readSettings();
  const defaults = (await getPlaces()).filter(item => ['desktop', 'documents', 'downloads', 'pictures'].includes(item.kind)).map(item => ({ ...item, kind: 'folder' }));
  const rows = (Array.isArray(settings.pinnedFolders) ? settings.pinnedFolders : defaults).filter(item => item.path !== p);
  rows.unshift({ path: p, name: path.basename(p) || p, kind: 'folder' });
  settings.pinnedFolders = rows.slice(0, 24);
  await writeSettings(settings); return true;
});
ipcMain.handle('aiof:unpin-folder', async (_event, target) => {
  const p = resolvePath(target); const settings = await readSettings();
  const defaults = (await getPlaces()).filter(item => ['desktop', 'documents', 'downloads', 'pictures'].includes(item.kind)).map(item => ({ ...item, kind: 'folder' }));
  settings.pinnedFolders = (Array.isArray(settings.pinnedFolders) ? settings.pinnedFolders : defaults).filter(item => item.path !== p);
  await writeSettings(settings); return true;
});
ipcMain.handle('aiof:remove-recent', async (_event, target) => {
  const p = resolvePath(target); const settings = await readSettings();
  settings.recentItems = (settings.recentItems || []).filter(item => item.path !== p);
  await writeSettings(settings); return true;
});

// Local search: breadth-first scan, skips OS-managed folders and symbolic links.
// The result cap and time budget keep a search from monopolizing the UI.
ipcMain.handle('aiof:search-everywhere', async (_event, query, options = {}) => {
  const needle = String(query || '').trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  const places = await getPlaces();
  const driveRoots = places.filter(p => p.kind === 'drive').map(p => p.path);
  const defaultRoots = places.some(p => p.kind === 'root')
    ? places.filter(p => p.kind === 'root' || p.kind === 'drive').map(p => p.path)
    : (driveRoots.length ? driveRoots : places.filter(p => p.kind === 'home').map(p => p.path));
  const roots = Array.isArray(options.roots) && options.roots.length ? options.roots.map(resolvePath) : defaultRoots;
  const limit = Math.max(1, Math.min(Number(options.limit) || 300, 500));
  const started = Date.now(); const maxMs = Math.max(1500, Math.min(Number(options.maxMs) || 12000, 20000));
  const skipNames = new Set(['node_modules', '.git', '.cache', '.npm', 'windows', 'program files', 'program files (x86)', 'system volume information', '$recycle.bin', 'proc', 'sys', 'dev', 'run', 'snap']);
  const results = []; const resultPaths = new Set(); const visited = new Set(); const queue = [...roots]; let scanned = 0;
  while (queue.length && results.length < limit && Date.now() - started < maxMs && scanned < 60000) {
    const current = queue.shift(); const normalized = path.resolve(current);
    if (visited.has(normalized)) continue; visited.add(normalized);
    let entries; try { entries = await fs.readdir(normalized, { withFileTypes: true }); } catch { continue; }
    scanned += entries.length;
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(normalized, entry.name);
      if (entry.isDirectory()) {
        if (!skipNames.has(entry.name.toLowerCase())) queue.push(full);
        if (entry.name.toLocaleLowerCase().includes(needle) && !resultPaths.has(full)) { resultPaths.add(full); results.push({ name: entry.name, path: full, isDirectory: true, size: 0, modified: '', extension: '' }); }
      } else if (entry.name.toLocaleLowerCase().includes(needle)) {
        try { const stat = await fs.stat(full); if (!resultPaths.has(full)) { resultPaths.add(full); results.push({ name: entry.name, path: full, isDirectory: false, size: stat.size, modified: stat.mtime.toISOString(), extension: path.extname(entry.name).slice(1).toLowerCase() }); } } catch { /* item may disappear */ }
      }
      if (results.length >= limit) break;
    }
  }
  results.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const partial = queue.length > 0 || Date.now() - started >= maxMs || scanned >= 60000;
  return { results, partial, scanned, elapsedMs: Date.now() - started };
});

ipcMain.handle('aiof:disk-usage-scan', async (_event, target, maxEntries = 25000) => {
  const root = resolvePath(target); const rootStat = await fs.stat(root);
  if (!rootStat.isDirectory()) throw new Error('Choose a folder or drive, not an individual file.');
  const deadline = Date.now() + 15000;
  const queue = [root]; const topFiles = []; const byType = new Map(); let totalBytes = 0; let fileCount = 0; let folderCount = 0; let scanned = 0;
  while (queue.length && scanned < Math.min(Number(maxEntries) || 25000, 50000) && Date.now() < deadline) {
    const dir = queue.shift(); let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      try {
        const stat = await fs.lstat(full); scanned++;
        if (stat.isDirectory()) { folderCount++; queue.push(full); }
        else if (stat.isFile()) {
          fileCount++; totalBytes += stat.size;
          const ext = path.extname(entry.name).slice(1).toLowerCase() || 'no extension';
          byType.set(ext, (byType.get(ext) || 0) + stat.size);
          topFiles.push({ name: entry.name, path: full, size: stat.size, modified: stat.mtime.toISOString() });
          if (topFiles.length > 500) { topFiles.sort((a, b) => b.size - a.size); topFiles.length = 100; }
        }
      } catch { /* permission denied or file changed */ }
      if (scanned >= Number(maxEntries) || Date.now() > deadline) break;
    }
  }
  topFiles.sort((a, b) => b.size - a.size);
  return { root, totalBytes, fileCount, folderCount, scanned, partial: queue.length > 0, topFiles: topFiles.slice(0, 30), byType: [...byType.entries()].map(([extension, size]) => ({ extension, size })).sort((a, b) => b.size - a.size).slice(0, 12) };
});

async function folderSize(target, maxEntries = 25000) {
  let bytes = 0, files = 0, scanned = 0; const queue = [target];
  while (queue.length && scanned < maxEntries) {
    const dir = queue.shift(); let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name); scanned++;
      try { const stat = await fs.lstat(full); if (stat.isDirectory()) queue.push(full); else if (stat.isFile()) { bytes += stat.size; files++; } } catch { /* permission denied */ }
      if (scanned >= maxEntries) break;
    }
  }
  return { bytes, files, partial: queue.length > 0 };
}
function cacheTargets() {
  const rows = [{ id: 'temp', name: 'Temporary files (%TEMP%)', path: os.tmpdir(), ageDays: 1, description: 'Temporary files older than 24 hours' }, { id: 'aiof-temp', name: 'AIOF temporary files', path: app.getPath('temp'), ageDays: 0, description: 'Temporary files created by AIOF; removed on uninstall' }];
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA;
    if (local) {
      rows.push({ id: 'windows-temp', name: 'User temporary files', path: path.join(local, 'Temp'), ageDays: 1, description: 'Per-user temporary files older than 24 hours' });
      const browsers = [
        ['edge-cache', 'Microsoft Edge', path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache', 'Cache_Data')],
        ['chrome-cache', 'Google Chrome', path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'Cache_Data')],
        ['brave-cache', 'Brave', path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache', 'Cache_Data')],
        ['vivaldi-cache', 'Vivaldi', path.join(local, 'Vivaldi', 'User Data', 'Default', 'Cache', 'Cache_Data')]
      ];
      for (const [id, name, cachePath] of browsers) rows.push({ id, name: `${name} cache`, path: cachePath, ageDays: 0, description: 'Browser cache entries (locked/in-use files are skipped)' });
      rows.push({ id: 'inet-cache', name: 'Windows internet cache', path: path.join(local, 'Microsoft', 'Windows', 'INetCache'), ageDays: 0, description: 'Internet cache entries (locked/in-use files are skipped)' });
    }
  } else if (process.platform === 'linux') {
    rows.push({ id: 'user-cache', name: 'User application and browser cache', path: path.join(os.homedir(), '.cache'), ageDays: 30, description: 'User cache files older than 30 days' });
  }
  return rows.filter((row, index, all) => all.findIndex(other => path.resolve(other.path).toLowerCase() === path.resolve(row.path).toLowerCase()) === index);
}
ipcMain.handle('aiof:cache-scan', async () => {
  const rows = [];
  for (const target of cacheTargets()) {
    try { await fs.access(target.path); const size = await folderSize(target.path); rows.push({ ...target, ...size }); } catch { rows.push({ ...target, bytes: 0, files: 0, partial: false, available: false }); }
  }
  return rows.map(row => ({ ...row, scannedAt: new Date().toISOString() }));
});
ipcMain.handle('aiof:cache-clean', async (_event, id) => {
  const target = cacheTargets().find(item => item.id === String(id));
  if (!target) throw new Error('Unknown cleanup location');
  const safeRoots = [os.tmpdir(), app.getPath('temp'), ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Temp'), path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache', 'Cache_Data'), path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'Cache_Data'), path.join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache', 'Cache_Data'), path.join(process.env.LOCALAPPDATA, 'Vivaldi', 'User Data', 'Default', 'Cache', 'Cache_Data'), path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'INetCache')] : []), path.join(os.homedir(), '.cache')];
  if (!safeRoots.some(root => path.resolve(target.path).toLowerCase() === path.resolve(root).toLowerCase())) throw new Error('Cleanup path is outside AIOF safe cache locations.');
  const rootStat = await fs.lstat(target.path);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Cleanup location is not a real directory; refusing to follow it.');
  const cutoff = Date.now() - target.ageDays * 24 * 60 * 60 * 1000; let removedBytes = 0, removedFiles = 0, scanned = 0, skippedFiles = 0;
  async function cleanDirectory(dir) {
    let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name); scanned++;
      try {
        const stat = await fs.lstat(full);
        if (stat.isDirectory()) { await cleanDirectory(full); try { await fs.rmdir(full); } catch { /* not empty */ } }
        else if (stat.isFile() && stat.mtimeMs < cutoff) { removedBytes += stat.size; await fs.rm(full); removedFiles++; }
      } catch { skippedFiles++; /* in-use or permission restricted */ }
      if (scanned > 50000) return;
    }
  }
  await cleanDirectory(target.path);
  return { removedBytes, removedFiles, skippedFiles, scanned, ageDays: target.ageDays, completedAt: new Date().toISOString() };
});



ipcMain.handle('aiof:save-preview-image', async (_event, dataUrl, defaultName = 'Edited image.png') => {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Only PNG image exports are supported.');
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: cleanName(defaultName), filters: [{ name: 'PNG image', extensions: ['png'] }] });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, Buffer.from(match[1], 'base64'));
  return result.filePath;
});

async function qbitRequest(endpoint, options = {}) {
  const cfg = await readSettings();
  const host = validateLocalWebUi(cfg.qbitHost);
  const user = cfg.qbitUsername || 'admin'; const pass = qbit.managed ? '' : (cfg.qbitPassword || '');
  if (pass && (qbit.host !== host || !qbit.cookie || Date.now() - qbit.lastLogin > 20 * 60 * 1000)) {
    const login = await fetch(`${host}/api/v2/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: user, password: pass }) });
    if (!login.ok || (await login.text()) !== 'Ok.') throw new Error('qBittorrent login failed. Check Web UI address, username and password.');
    qbit.cookie = login.headers.getSetCookie?.().map(v => v.split(';')[0]).join('; ') || login.headers.get('set-cookie')?.split(';')[0] || '';
    if (!qbit.cookie) throw new Error('qBittorrent did not return an authentication cookie');
    qbit.host = host; qbit.lastLogin = Date.now();
  }
  // Passwordless access is used only for the AIOF-managed loopback profile,
  // whose Web UI is explicitly bound to 127.0.0.1 with localhost auth bypass.
  const headers = { ...(options.headers || {}) };
  if (pass) headers.Cookie = qbit.cookie;
  const response = await fetch(`${host}${endpoint}`, { ...options, headers });
  if (response.status === 403) { qbit.cookie = ''; throw new Error('qBittorrent rejected the session. Reconnect and try again.'); }
  if (!response.ok) throw new Error(`qBittorrent API returned HTTP ${response.status}`);
  return response;
}

async function waitForHttp(url, child, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Engine exited with code ${child.exitCode}`);
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); if (response.ok) return response; } catch { /* still starting */ }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Engine did not respond at ${url} within ${Math.round(timeoutMs / 1000)} seconds`);
}
async function writeTorrentProfile() {
  const profile = path.join(app.getPath('userData'), 'engines', 'qbittorrent-profile');
  await fs.mkdir(profile, { recursive: true });
  const config = [
    '[Preferences]',
    'WebUI\\Address=127.0.0.1',
    'WebUI\\Port=8080',
    'WebUI\\LocalHostAuth=false',
    'WebUI\\CSRFProtection=false',
    'WebUI\\HostHeaderValidation=false',
    'Downloads\\SavePath=' + path.join(app.getPath('downloads'), 'AIOF'),
    ''
  ].join('\n');
  await fs.mkdir(path.join(app.getPath('downloads'), 'AIOF'), { recursive: true });
  await fs.writeFile(path.join(profile, 'qBittorrent.conf'), config, { mode: 0o600 });
  const nested = path.join(profile, 'qBittorrent');
  await fs.mkdir(nested, { recursive: true });
  await fs.writeFile(path.join(nested, 'qBittorrent.conf'), config, { mode: 0o600 });
  return profile;
}
ipcMain.handle('aiof:torrent-start', async () => {
  if (torrentProcess && torrentProcess.exitCode === null) return { started: true, alreadyRunning: true };
  const command = resolveEngineCommand('torrent', engines.torrent);
  if (!command) throw new Error('qBittorrent runtime is not bundled. Build/stage it under resources/engines/torrent/.');
  const profile = await writeTorrentProfile();
  const args = [`--profile=${profile}`, '--webui-port=8080'];
  const child = spawn(command, args, { cwd: profile, stdio: 'ignore', windowsHide: true });
  torrentProcess = child;
  child.once('exit', () => { if (torrentProcess === child) torrentProcess = null; qbit.cookie = ''; qbit.managed = false; });
  try {
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    await waitForHttp('http://127.0.0.1:8080/api/v2/app/version', child, 60000);
    qbit.host = ''; qbit.cookie = ''; qbit.managed = true;
    return { started: true, host: 'http://127.0.0.1:8080' };
  } catch (error) { child.kill(); if (torrentProcess === child) torrentProcess = null; qbit.managed = false; throw error; }
});
async function chooseFreeLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
ipcMain.handle('aiof:pdf-open', async () => {
  if (!pdfProcess || pdfProcess.exitCode !== null) {
    const jar = app.isPackaged
      ? path.join(process.resourcesPath, 'engines', 'pdf', 'stirling-pdf.jar')
      : path.join(app.getAppPath(), 'resources', 'engines', 'common', 'pdf', 'stirling-pdf.jar');
    try { await fs.access(jar); } catch { throw new Error('Stirling PDF core is not built yet. Run the platform PDF engine builder, then rebuild AIOF.'); }
    const java = findCommand(['java']);
    if (!java) throw new Error('Java 25+ is required to run the bundled Stirling PDF core engine.');
    const port = await chooseFreeLoopbackPort();
    const base = `http://127.0.0.1:${port}`;
    const profile = path.join(app.getPath('userData'), 'engines', 'stirling-pdf');
    await fs.mkdir(profile, { recursive: true });
    const child = spawn(java, ['-jar', jar, '--server.address=127.0.0.1', `--server.port=${port}`, '--security.enableLogin=false', '--spring.main.banner-mode=off'], { cwd: profile, env: { ...process.env, SERVER_ADDRESS: '127.0.0.1', SERVER_PORT: String(port) }, stdio: 'ignore', windowsHide: true });
    pdfProcess = child; pdfBaseUrl = base;
    child.once('exit', () => { if (pdfProcess === child) { pdfProcess = null; pdfBaseUrl = null; } });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    await waitForHttp(base, child, 90000);
  }
  if (!pdfBaseUrl) throw new Error('PDF engine did not provide a local address.');
  return { opened: true, url: pdfBaseUrl, embedded: true };
});

ipcMain.handle('aiof:torrent-status', async () => {
  try { const response = await qbitRequest('/api/v2/app/version'); return { connected: true, version: await response.text() }; }
  catch (error) { return { connected: false, error: error.message }; }
});
ipcMain.handle('aiof:torrent-list', async () => {
  const response = await qbitRequest('/api/v2/torrents/info?filter=all'); return response.json();
});
ipcMain.handle('aiof:torrent-add', async (_event, input) => {
  const value = String(input || '').trim();
  if (/^(magnet:\?|https?:\/\/)/i.test(value)) {
    const body = new FormData(); body.append('urls', value);
    const response = await qbitRequest('/api/v2/torrents/add', { method: 'POST', body });
    return response.text();
  }
  const filePath = resolvePath(value); const bytes = await fs.readFile(filePath);
  const form = new FormData(); form.append('torrents', new Blob([bytes]), path.basename(filePath));
  const response = await qbitRequest('/api/v2/torrents/add', { method: 'POST', body: form }); return response.text();
});
ipcMain.handle('aiof:torrent-action', async (_event, action, hashes) => {
  const allowed = { pause: '/api/v2/torrents/pause', resume: '/api/v2/torrents/resume', delete: '/api/v2/torrents/delete' };
  if (!allowed[action]) throw new Error('Unsupported torrent action');
  const body = new URLSearchParams({ hashes: Array.isArray(hashes) ? hashes.join('|') : String(hashes), deleteFiles: 'false' });
  const response = await qbitRequest(allowed[action], { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return response.text();
});

// -----------------------------------------------------------------------------
// External upstream engines: launch by executable + argument array, never shell.
// -----------------------------------------------------------------------------
ipcMain.handle('aiof:engine-status', async () => Object.entries(engines).map(([key, spec]) => { const command = resolveEngineCommand(key, spec); return { key, label: spec.label, configured: Boolean(process.env[spec.env]), bundled: Boolean(command && command.startsWith(app.isPackaged ? process.resourcesPath : app.getAppPath())), available: Boolean(command), command: command || `${spec.candidates[0]} (not bundled)` }; }));
ipcMain.handle('aiof:pick-file', async (_event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: Array.isArray(filters) ? filters : [] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('aiof:open-url', async (_event, url) => {
  const parsed = new URL(String(url)); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS links can be opened');
  await shell.openExternal(parsed.href); return true;
});
