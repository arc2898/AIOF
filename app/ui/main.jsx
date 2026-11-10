import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, Monitor, AlertCircle, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  ArrowUpDown, AudioLines, BookOpen, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleHelp, Clock3, CloudDownload, Copy, Download,
  ExternalLink, File, FileImage, FilePlus2, FileText, Film, Folder,
  FolderOpen, FolderPlus, Grid2X2, HardDrive, Home, Image, LayoutGrid,
  List, Loader2, LockKeyhole, Maximize2, Menu, MoreHorizontal, Moon,
  Music2, Package, Pause, Pencil, Play, Plus, RefreshCw, RotateCcw, Save,
  Search, Settings, ShieldCheck, SlidersHorizontal, Star, Sun, Trash2,
  Upload, Video, Wifi, X, LayoutDashboard, Pin, Gauge, Eraser,
  FolderSearch, FileSearch, ScrollText, Database, Code2, Presentation, FileSpreadsheet,
  RotateCw, FlipHorizontal, FileCode2, FilePlus
} from 'lucide-react';
import './style.css';
import aiofLogo from './branding/aiof-logo.png';

const isDesktop = typeof window !== 'undefined' && Boolean(window.aiof);
const moduleItems = [
  { id: 'files', name: 'File Explorer', desc: 'Browse, organize and preview files', icon: FolderOpen, color: 'blue', section: 'Workspace' },
  { id: 'downloads', name: 'Downloads', desc: 'Direct downloads with pause and resume', icon: CloudDownload, color: 'cyan', section: 'Internet' },
  { id: 'torrent', name: 'Torrent client', desc: 'Integrated qBittorrent transfers', icon: Wifi, color: 'violet', section: 'Internet' },
  { id: 'office', name: 'Office', desc: 'Word, Excel and PowerPoint documents', icon: BookOpen, color: 'orange', section: 'Productivity' },
  { id: 'pdf', name: 'PDF tools', desc: 'Merge, split, convert, sign and organize PDFs', icon: FileText, color: 'red', section: 'Productivity' },
  { id: 'code', name: 'Code Workspace', desc: 'Edit source files directly inside AIOF', icon: Code2, color: 'slate', section: 'Workspace' }
];
const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'tif', 'tiff'];
const audioExts = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus'];
const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mpg', 'mpeg', 'mkv', 'avi'];
const textExts = ['txt', 'md', 'markdown', 'csv', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'yml', 'yaml', 'toml', 'ini', 'log', 'conf', 'sh', 'ps1'];
const officeExts = ['doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp', 'pdf'];
const archiveExts = ['zip', '7z', 'rar', 'tar', 'gz', 'bz2', 'xz'];
const fallbackEntries = [
  { name: 'Documents', isDirectory: true, size: 0, extension: '' },
  { name: 'Downloads', isDirectory: true, size: 0, extension: '' },
  { name: 'Pictures', isDirectory: true, size: 0, extension: '' },
  { name: 'Projects', isDirectory: true, size: 0, extension: '' },
  { name: 'AIOF-Readme.md', isDirectory: false, size: 2500, extension: 'md' },
  { name: 'Project-Roadmap.csv', isDirectory: false, size: 5400, extension: 'csv' },
  { name: 'Sample-image.png', isDirectory: false, size: 83000, extension: 'png' }
];
const fmtBytes = value => {
  const n = Number(value || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};
const fmtDate = value => value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const joinPath = (a, b) => `${String(a || '').replace(/[\\/]+$/, '')}${String(a || '').includes('\\') ? '\\' : '/'}${String(b || '').replace(/^[\\/]+/, '')}`;
const baseName = value => String(value || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || value;
const parentPath = value => {
  const s = String(value || '').replace(/[\\/]+$/, '');
  const index = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  if (index === 2 && /^[A-Za-z]:/.test(s)) return `${s.slice(0, 2)}\\`;
  return index <= 0 ? (s.includes('\\') ? `${s.slice(0, 2)}\\` : '/') : s.slice(0, index);
};
const extensionOf = name => String(name || '').split('.').pop().toLowerCase();
const fileKind = item => {
  if (item.isDirectory) return 'folder';
  const ext = item.extension || extensionOf(item.name);
  if (imageExts.includes(ext)) return 'image';
  if (audioExts.includes(ext)) return 'audio';
  if (videoExts.includes(ext)) return 'video';
  if (archiveExts.includes(ext)) return 'archive';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc','docx','odt','rtf'].includes(ext)) return 'word';
  if (['xls','xlsx','ods','csv'].includes(ext)) return 'sheet';
  if (['ppt','pptx','odp'].includes(ext)) return 'slides';
  if (textExts.includes(ext)) return 'code';
  return 'file';
};
const FileGlyph = ({ item, size = 20 }) => {
  const kind = fileKind(item);
  const Icon = ({ folder: Folder, image: FileImage, audio: AudioLines, video: Video, archive: Archive, pdf: FileText, word: FileText, sheet: FileSpreadsheet, slides: Presentation, code: FileCode2, file: File })[kind] || File;
  const suffix = item.isDirectory ? '' : (item.extension || extensionOf(item.name)).slice(0, 4).toUpperCase();
  return <span className={`file-glyph-stack ${kind}`} aria-hidden="true"><Icon size={size} strokeWidth={1.8}/>{suffix && <small>{suffix}</small>}</span>;
};

const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const sourceTokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|^\s*#[^\n]*|\b(?:const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default|async|await|try|catch|throw|new|this|true|false|null|undefined|public|private|static|void|int|string|bool|def|elif|pass|with|as|yield|match|case|fn|mut|pub|use|mod|struct|enum|impl|trait|package|func|type|interface|switch|break|continue)\b|\b\d+(?:\.\d+)?\b)/gm;
function highlightSource(source = '') {
  return String(source).split(sourceTokenPattern).map(token => {
    if (!token) return '';
    let kind = '';
    if (token.startsWith('//') || token.startsWith('/*') || /^\s*#/.test(token)) kind = 'comment';
    else if (/^["'`]/.test(token)) kind = 'string';
    else if (/^\d/.test(token)) kind = 'number';
    else if (/^(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default|async|await|try|catch|throw|new|this|true|false|null|undefined|public|private|static|void|int|string|bool|def|elif|pass|with|as|yield|match|case|fn|mut|pub|use|mod|struct|enum|impl|trait|package|func|type|interface|switch|break|continue)$/.test(token)) kind = 'keyword';
    return kind ? `<span class="syntax-${kind}">${escapeHtml(token)}</span>` : escapeHtml(token);
  }).join('');
}

function App() {
  const [section, setSection] = useState('home');
  const [currentPath, setCurrentPath] = useState('');
  const [pathDraft, setPathDraft] = useState('');
  const [places, setPlaces] = useState([]);
  const [homeData, setHomeData] = useState({ disks: [], pinned: [], recent: [], mostUsed: [], places: [] });
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchPartial, setSearchPartial] = useState(false);
  const [diskRoot, setDiskRoot] = useState('');
  const [diskReport, setDiskReport] = useState(null);
  const [diskBusy, setDiskBusy] = useState(false);
  const [cacheRows, setCacheRows] = useState([]);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [entries, setEntries] = useState(fallbackEntries);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [sort, setSort] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [theme, setTheme] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [engineStatus, setEngineStatus] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [torrentStatus, setTorrentStatus] = useState({ connected: false });
  const [torrents, setTorrents] = useState([]);
  const [torrentInput, setTorrentInput] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [archiveFormat, setArchiveFormat] = useState('zip');
  const [previewAsset, setPreviewAsset] = useState(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewFlip, setPreviewFlip] = useState(false);
  const [previewBrightness, setPreviewBrightness] = useState(100);
  const [previewContrast, setPreviewContrast] = useState(100);
  const [previewSaturation, setPreviewSaturation] = useState(100);
  const [previewAdvancedOpen, setPreviewAdvancedOpen] = useState(false);
  const [previewHue, setPreviewHue] = useState(0);
  const [previewBlur, setPreviewBlur] = useState(0);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfStudioUrl, setPdfStudioUrl] = useState('');
  const [editor, setEditor] = useState({ path: '', name: '', content: '', dirty: false, mode: 'text' });
  const [officeFile, setOfficeFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [settings, setSettings] = useState({ theme: 'system', showHidden: false, qbitHost: 'http://127.0.0.1:8080', qbitUsername: 'admin', qbitPassword: '', accent: 'blue', accentCustom: '#2687df', roundness: 'soft', wallpaperOpacity: 78, density: 'comfortable', wallpaperPath: '', appearance: 'system', neonBorders: false, advancedImageTools: false, showQuickAccess: true, showDriveUsage: true, showSystemNav: true, showInternetNav: true, defaultView: 'list', contextMenuEnabled: false, advancedImageTools: false });
  const [speedTest, setSpeedTest] = useState(null);
  const [speedBusy, setSpeedBusy] = useState(false);
  const [speedStage, setSpeedStage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const pathInputRef = useRef(null);
  const codeTextareaRef = useRef(null);
  const codeHighlightRef = useRef(null);
  const searchRef = useRef(null);
  const toastTimer = useRef(null);

  const notify = useCallback(message => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);

  const refreshHome = useCallback(async () => {
    if (!isDesktop) return;
    try { const data = await window.aiof.homeData(); setHomeData(data); setPlaces(data.places || []); setDiskRoot(old => old || data.disks?.[0]?.path || ''); }
    catch (error) { notify(error.message); }
  }, [notify]);

  const loadPlaces = useCallback(async () => {
    if (!isDesktop) return;
    try { setPlaces(await window.aiof.places()); } catch (error) { notify(error.message); }
  }, [notify]);

  const loadDirectory = useCallback(async (directory = currentPath) => {
    if (!isDesktop) return;
    const target = directory || await window.aiof.home();
    setBusy(true);
    try {
      const result = await window.aiof.listDir(target, showHidden);
      setEntries(result);
      setCurrentPath(target);
      setPathDraft(target);
      setSelected([]);
    } catch (error) { notify(`Cannot open folder: ${error.message}`); }
    finally { setBusy(false); }
  }, [currentPath, notify, showHidden]);

  const refreshDownloads = useCallback(async () => {
    if (!isDesktop) return;
    try { setDownloads(await window.aiof.downloadList()); } catch (error) { notify(error.message); }
  }, [notify]);

  const refreshTorrents = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const status = await window.aiof.torrentStatus(); setTorrentStatus(status);
      if (status.connected) setTorrents(await window.aiof.torrentList());
      else setTorrents([]);
    } catch (error) { setTorrentStatus({ connected: false, error: error.message }); setTorrents([]); }
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let mounted = true;
    (async () => {
      try {
        const [home, pref, placeList, queue, homeSummary] = await Promise.all([window.aiof.home(), window.aiof.settingsGet(), window.aiof.places(), window.aiof.downloadList(), window.aiof.homeData()]);
        if (!mounted) return;
        setSettings(s => ({ ...s, ...pref, theme: pref.theme || 'system', appearance: pref.appearance || 'system', advancedImageTools: Boolean(pref.advancedImageTools) }));
        setTheme(pref.theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : (pref.theme || 'system')); setShowHidden(Boolean(pref.showHidden));
        if (pref.wallpaperPath) { try { setWallpaperUrl(await window.aiof.fileUrl(pref.wallpaperPath)); } catch { /* missing wallpaper is ignored */ } }
        setPlaces(placeList); setDownloads(queue); setHomeData(homeSummary);
        const rows = await window.aiof.listDir(home, Boolean(pref.showHidden));
        if (!mounted) return;
        setEntries(rows); setCurrentPath(home); setPathDraft(home);
      } catch (error) { notify(error.message); }
    })();
    const unsubscribe = window.aiof.onDownloadUpdate(update => {
      setDownloads(old => {
        const index = old.findIndex(item => item.id === update.id);
        if (index < 0) return [update, ...old];
        const next = [...old]; next[index] = update; return next;
      });
    });
    return () => { mounted = false; unsubscribe(); };
  }, [notify]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (settings.theme !== 'system' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setTheme(media.matches ? 'dark' : 'light');
    sync(); media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, [settings.theme]);
  useEffect(() => { if (section === 'torrent') refreshTorrents(); }, [section, refreshTorrents]);
  useEffect(() => { if (section === 'downloads') refreshDownloads(); }, [section, refreshDownloads]);
  useEffect(() => {
    if (section !== 'settings' || !isDesktop) return;
    let active = true;
    window.aiof.engineStatus().then(rows => { if (active) setEngineStatus(rows); }).catch(error => notify(`Engine status unavailable: ${error.message}`));
    return () => { active = false; };
  }, [section, notify]);
  useEffect(() => { if (section === 'home') refreshHome(); }, [section, refreshHome]);
  useEffect(() => { if (!isDesktop) return; const timer = window.setInterval(() => refreshHome(), 30000); return () => window.clearInterval(timer); }, [refreshHome]);
  useEffect(() => {
    if (section !== 'cleanup') return;
    let active = true; let running = false;
    const refresh = async () => { if (running || document.hidden) return; running = true; try { const rows = await window.aiof.cacheScan(); if (active) setCacheRows(rows); } catch (error) { if (active) notify(`Cache scan failed: ${error.message}`); } finally { running = false; if (active) setCacheBusy(false); } };
    setCacheBusy(true); refresh();
    const timer = window.setInterval(refresh, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, [section, notify]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => {
    const onKeyDown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (event.key === 'Escape' && previewAsset) { setPreviewAsset(null); setPreviewFullscreen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewAsset]);

  useEffect(() => {
    if (!isDesktop) return undefined;
    return window.aiof.onOpenFile(async filePath => {
      if (!filePath) return;
      try {
        if (await window.aiof.isDirectory(filePath)) { setSection('files'); return loadDirectory(filePath); }
        const ext = extensionOf(filePath);
        return openEntry({path:filePath,name:baseName(filePath),extension:ext,isDirectory:false});
      } catch(error) { notify(`Could not open file: ${error.message}`); }
    });
  }, [notify]);

  const visibleEntries = useMemo(() => {
    let list = entries.filter(item => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    list = [...list].sort((a, b) => {
      if (sort === 'type') return fileKind(a).localeCompare(fileKind(b));
      if (sort === 'size') return (a.size || 0) - (b.size || 0);
      if (sort === 'modified') return new Date(a.modified || 0) - new Date(b.modified || 0);
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    if (sortDirection === 'desc') list.reverse();
    return list;
  }, [entries, query, sort, sortDirection]);
  const selectedEntries = useMemo(() => selected.map(p => entries.find(item => item.path === p)).filter(Boolean), [selected, entries]);
  useEffect(() => {
    const item = selectedEntries.length === 1 ? selectedEntries[0] : null;
    if (!isDesktop || !item || item.isDirectory || !['image','video','audio','pdf'].includes(fileKind(item))) { setSelectedPreviewUrl(''); return undefined; }
    let live = true; setSelectedPreviewUrl('');
    window.aiof.fileUrl(item.path).then(url => { if (live) setSelectedPreviewUrl(url); }).catch(() => { if (live) setSelectedPreviewUrl(''); });
    return () => { live = false; };
  }, [selectedEntries, isDesktop]);
  const activeModule = moduleItems.find(item => item.id === section);

  const chooseEntry = (item, event) => {
    if (event.ctrlKey || event.metaKey) {
      setSelected(old => old.includes(item.path) ? old.filter(p => p !== item.path) : [...old, item.path]);
    } else if (event.shiftKey && selected.length) {
      const start = visibleEntries.findIndex(entry => entry.path === selected[selected.length - 1]);
      const end = visibleEntries.findIndex(entry => entry.path === item.path);
      const range = visibleEntries.slice(Math.min(start, end), Math.max(start, end) + 1).map(entry => entry.path);
      setSelected(range);
    } else setSelected([item.path]);
  };

  const openText = async file => {
    try {
      const content = await window.aiof.readText(file.path);
      setEditor({ path: file.path, name: file.name, content, dirty: false, mode: file.extension === 'csv' ? 'csv' : 'text' });
      setSection('code');
    } catch (error) { notify(error.message); }
  };
  const openImage = async file => {
    try {
      const url = await window.aiof.fileUrl(file.path);
      setPreviewAsset({ ...file, url, kind: 'image' });
      setPreviewZoom(1); setPreviewRotation(0); setPreviewFlip(false);
      setPreviewBrightness(100); setPreviewContrast(100); setPreviewSaturation(100);
    } catch (error) { notify(error.message); }
  };
  const openMedia = async file => {
    try {
      const url = await window.aiof.fileUrl(file.path);
      const ext = file.extension || extensionOf(file.name);
      setPreviewAsset({ ...file, url, kind: videoExts.includes(ext) ? 'video' : 'audio' });
      setPreviewZoom(1); setPreviewFullscreen(false);
    } catch (error) { notify(error.message); }
  };
  const openPdf = async file => {
    try {
      const url = await window.aiof.fileUrl(file.path);
      setPreviewAsset({ ...file, url, kind: 'pdf' });
      setPreviewFullscreen(false);
    } catch (error) { notify(error.message); }
  };
  const closePreview = () => { setPreviewAsset(null); setPreviewFullscreen(false); };
  const saveImageCopy = async () => {
    const image = document.getElementById('aiof-preview-image');
    if (!image?.naturalWidth) { notify('The image is not ready yet.'); return; }
    try {
      const swap = Math.abs(previewRotation % 180) === 90;
      const canvas = document.createElement('canvas');
      canvas.width = swap ? image.naturalHeight : image.naturalWidth;
      canvas.height = swap ? image.naturalWidth : image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(previewRotation * Math.PI / 180);
      ctx.scale(previewFlip ? -1 : 1, 1);
      ctx.filter = `brightness(${previewBrightness}%) contrast(${previewContrast}%) saturate(${previewSaturation}%) hue-rotate(${previewHue}deg) blur(${previewBlur}px)`;
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const target = await window.aiof.savePreviewImage(canvas.toDataURL('image/png'), `${baseName(previewAsset.name).replace(/\.[^.]+$/, '')}-edited.png`);
      if (target) notify(`Edited image saved: ${target}`);
    } catch (error) { notify(`Could not export image: ${error.message}`); }
  };
  const openEntry = async item => {
    if (item.isDirectory) return loadDirectory(item.path);
    const ext = item.extension || extensionOf(item.name);
    if (imageExts.includes(ext)) return openImage(item);
    if (audioExts.includes(ext) || videoExts.includes(ext)) return openMedia(item);
    if (textExts.includes(ext)) return openText(item);
    if (ext === 'pdf') return openPdf(item);
    if (officeExts.includes(ext)) { setOfficeFile(item); setSection('office'); return; }
    if (archiveExts.includes(ext)) { await extractArchiveEntry(item); return; }
    setPreviewAsset({ ...item, kind: 'unknown', url: '' }); setPreviewFullscreen(false);
  };

  const toggleHidden = async () => {
    const next = !showHidden; setShowHidden(next); setSettings(old => ({ ...old, showHidden: next }));
    try { setEntries(await window.aiof.listDir(currentPath, next)); } catch (error) { notify(error.message); }
  };
  const createFolder = async () => {
    const name = window.prompt('New folder name'); if (!name?.trim()) return;
    try { await window.aiof.createFolder(currentPath, name); await loadDirectory(); notify('Folder created'); }
    catch (error) { notify(error.message); }
  };
  const createFile = async () => {
    const name = window.prompt('New file name', 'New file.txt'); if (!name?.trim()) return;
    try {
      const filePath = await window.aiof.createFile(currentPath, name);
      await loadDirectory();
      const newFile = { name: baseName(filePath), path: filePath, isDirectory: false, extension: extensionOf(name) };
      if (textExts.includes(newFile.extension)) openText(newFile);
      notify('File created');
    } catch (error) { notify(error.message); }
  };
  const renameSelected = async () => {
    if (selected.length !== 1) return;
    const item = selectedEntries[0]; const name = window.prompt('Rename item', item.name);
    if (!name?.trim() || name === item.name) return;
    try { await window.aiof.rename(item.path, name); await loadDirectory(); notify('Item renamed'); }
    catch (error) { notify(error.message); }
  };
  const trashSelected = async () => {
    if (!selected.length) return;
    const label = selected.length === 1 ? selectedEntries[0]?.name : `${selected.length} selected items`;
    if (!window.confirm(`Move ${label} to the system trash?`)) return;
    try { for (const p of selected) await window.aiof.trash(p); await loadDirectory(); notify('Moved to trash'); }
    catch (error) { notify(error.message); }
  };
  const copyOrMove = async mode => {
    if (!selected.length) return;
    const destination = await window.aiof.chooseFolder();
    if (!destination) return;
    try {
      for (const p of selected) {
        if (mode === 'copy') await window.aiof.copy(p, destination);
        else await window.aiof.move(p, destination);
      }
      await loadDirectory(); notify(mode === 'copy' ? 'Items copied' : 'Items moved');
    } catch (error) { notify(error.message); }
  };
  const compressSelected = async (sourcePaths = selected) => {
    if (!sourcePaths.length) { notify('Select one or more files first.'); return; }
    const suggested = sourcePaths.length === 1 ? `${baseName(sourcePaths[0]).replace(/\.[^.]+$/, '')}.zip` : 'Archive.zip';
    const name = window.prompt('ZIP archive name', suggested); if (!name?.trim()) return;
    const output = joinPath(currentPath, name.toLowerCase().endsWith('.zip') ? name : `${name}.zip`);
    try { await window.aiof.createArchive(sourcePaths, output); await loadDirectory(); notify('ZIP archive created'); }
    catch (error) { notify(`Compression failed: ${error.message}`); }
  };
  const extractArchiveEntry = async item => {
    if (!item?.path) return;
    const folderName = baseName(item.name).replace(/\.[^.]+$/, '') || 'Extracted';
    const folder = joinPath(currentPath, folderName);
    if (!window.confirm(`Extract ${item.name} into ${folderName}?`)) return;
    try {
      await window.aiof.extractArchive(item.path, folder);
      await loadDirectory();
      notify(`Extracted to ${folder}`);
    } catch (error) { notify(`Extraction failed: ${error.message}`); }
  };
  const extractSelected = async () => {
    const item = selectedEntries.find(entry => archiveExts.includes(entry.extension || extensionOf(entry.name)));
    if (!item) { notify('Select a supported archive first.'); return; }
    const folder = joinPath(currentPath, baseName(item.name).replace(/\.[^.]+$/, ''));
    try { await window.aiof.extractArchive(item.path, folder); await loadDirectory(); notify('Archive extracted'); }
    catch (error) { notify(`Extraction failed: ${error.message}`); }
  };

  const changeFileType = async () => {
    if (selected.length !== 1) return;
    const file = selectedEntries[0];
    if (!file || file.isDirectory) return;
    const currentExt = file.extension || extensionOf(file.name);
    const nextExt = window.prompt("Change the filename extension only. This does not convert the file’s internal format. New extension:", currentExt);
    if (nextExt == null) return;
    const normalized = nextExt.trim().replace(/^\./, '').toLowerCase();
    if (!/^[a-z0-9]{1,16}$/.test(normalized)) { notify('Enter a valid extension using letters and numbers.'); return; }
    const stem = file.name.replace(/\.[^.]*$/, '');
    try {
      await window.aiof.rename(file.path, `${stem}.${normalized}`);
      await loadDirectory();
      notify(`Extension changed to .${normalized}. The file contents were not converted.`);
    } catch (error) { notify(`Could not change extension: ${error.message}`); }
  };
  const runInternetSpeedTest = async () => {
    setSpeedBusy(true); setSpeedTest(null); setSpeedStage('Measuring latency, download and upload');
    try {
      const result = await window.aiof.internetSpeedTest();
      setSpeedTest(result);
    } catch (error) { notify(`Speed test failed: ${error.message}`); }
    finally { setSpeedBusy(false); setSpeedStage(''); }
  };

  const openPdfTools = async () => {
    setPdfBusy(true);
    try { const result = await window.aiof.openPdfStudio(); if (result?.url) setPdfStudioUrl(result.url); }
    catch (error) { notify(error.message); }
    finally { setPdfBusy(false); }
  };

  const startDownload = async event => {
    event?.preventDefault();
    if (!downloadUrl.trim()) return;
    try {
      await window.aiof.downloadStart(downloadUrl.trim(), downloadName.trim() || undefined);
      setDownloadUrl(''); setDownloadName(''); notify('Download started');
    } catch (error) { notify(error.message); }
  };
  const downloadAction = async (action, id) => {
    try {
      if (action === 'pause') await window.aiof.downloadPause(id);
      if (action === 'resume') await window.aiof.downloadResume(id);
      if (action === 'cancel') await window.aiof.downloadCancel(id);
    } catch (error) { notify(error.message); }
  };
  const addTorrent = async event => {
    event?.preventDefault();
    if (!torrentInput.trim()) return;
    try { await window.aiof.torrentAdd(torrentInput.trim()); setTorrentInput(''); await refreshTorrents(); notify('Torrent added to qBittorrent'); }
    catch (error) { notify(error.message); }
  };
  const addTorrentFile = async () => {
    const file = await window.aiof.pickFile([{ name: 'BitTorrent files', extensions: ['torrent'] }]);
    if (!file) return;
    try { await window.aiof.torrentAdd(file); await refreshTorrents(); notify('Torrent file added'); }
    catch (error) { notify(error.message); }
  };
  const torrentAction = async (action, hash) => {
    try { await window.aiof.torrentAction(action, [hash]); await refreshTorrents(); }
    catch (error) { notify(error.message); }
  };

  const saveEditor = async () => {
    try {
      if (editor.path) await window.aiof.writeText(editor.path, editor.content);
      else {
        const filePath = await window.aiof.saveTextAs(editor.content, editor.name || 'Untitled.txt');
        if (!filePath) return;
        setEditor(old => ({ ...old, path: filePath, name: baseName(filePath), dirty: false }));
      }
      setEditor(old => ({ ...old, dirty: false })); notify('File saved');
    } catch (error) { notify(error.message); }
  };
  const newTextDocument = (type = 'txt') => {
    const names = { txt: 'Untitled.txt', md: 'Untitled.md', csv: 'Untitled.csv', html: 'Untitled.html' };
    const templates = {
      csv: 'Name,Value\n,\n',
      html: '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Untitled</title></head>\n<body>\n  <h1>Untitled document</h1>\n  <p>Start writing here.</p>\n</body>\n</html>\n'
    };
    setOfficeFile(null);
    setEditor({ path: '', name: names[type], content: templates[type] || '', dirty: true, mode: type === 'csv' ? 'csv' : 'text' });
    setSection('code');
  };
  const resolveTheme = preference => preference === 'system' && window.matchMedia
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : (preference === 'dark' ? 'dark' : 'light');

  const saveSettings = async event => {
    event?.preventDefault();
    try {
      await window.aiof.settingsSave(settings);
      setTheme(resolveTheme(settings.theme)); setShowHidden(settings.showHidden);
      if (settings.defaultView) setView(settings.defaultView);
      if (isDesktop && window.aiof.platform === 'win32') {
        const registration = await window.aiof.contextMenuRegister(Boolean(settings.contextMenuEnabled));
        if (!registration.supported) notify('Windows Explorer context-menu integration is not available on this platform.');
      }
      if (settings.showHidden !== showHidden) await loadDirectory(currentPath);
      notify('Personalization saved');
    } catch (error) { notify(error.message); }
  };

  const updateTheme = async next => {
    setSettings(old => ({ ...old, theme: next }));
    setTheme(resolveTheme(next));
    try { await window.aiof.settingsSave({ ...settings, theme: next }); }
    catch (error) { notify(`Theme changed for this session but could not be saved: ${error.message}`); }
  };

  const applyAppearancePreset = preset => {
    const presets = {
      system: { theme: 'system', accent: 'blue', appearance: 'system', neonBorders: false, density: 'comfortable', roundness: 'soft' },
      windows: { theme: 'light', accent: 'blue', appearance: 'fluent', neonBorders: false, density: 'comfortable', roundness: 'soft' },
      nord: { theme: 'system', accent: 'slate', appearance: 'system', neonBorders: false, density: 'comfortable', roundness: 'soft' },
      midnight: { theme: 'dark', accent: 'teal', appearance: 'classic', neonBorders: false, density: 'compact', roundness: 'soft' }
    };
    const next = { ...settings, ...(presets[preset] || presets.windows) };
    setSettings(next); setTheme(resolveTheme(next.theme));
  };

  const pinFolder = async folder => {
    try { await window.aiof.pinFolder(folder); await refreshHome(); notify('Folder pinned to Home'); }
    catch (error) { notify(error.message); }
  };
  const unpinFolder = async folder => {
    try { await window.aiof.unpinFolder(folder); await refreshHome(); }
    catch (error) { notify(error.message); }
  };
  const runGlobalSearch = async (event) => {
    event?.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (term.length < 2) { notify('Enter at least two characters to search this computer.'); return; }
    setSearchBusy(true); setSearchPartial(false); setSection('search');
    try {
      const result = await window.aiof.searchEverywhere(term, { limit: 500, maxMs: 18000 });
      setSearchResults(result.results || []); setSearchPartial(Boolean(result.partial));
    } catch (error) { notify(`Search failed: ${error.message}`); }
    finally { setSearchBusy(false); }
  };
  const scanDisk = async (target = diskRoot) => {
    if (!target) { notify('Choose a folder or drive to analyze.'); return; }
    setDiskBusy(true); setDiskReport(null);
    try { setDiskReport(await window.aiof.diskUsageScan(target)); }
    catch (error) { notify(`Disk analysis failed: ${error.message}`); }
    finally { setDiskBusy(false); }
  };
  const scanCache = async () => {
    setCacheBusy(true);
    try { setCacheRows(await window.aiof.cacheScan()); }
    catch (error) { notify(`Cache scan failed: ${error.message}`); }
    finally { setCacheBusy(false); }
  };
  const cleanCache = async id => {
    const label = cacheRows.find(row => row.id === id)?.name || 'selected cache';
    if (!window.confirm(`Clean eligible stale files in ${label}?\n\nOnly files older than the stated retention period are removed. Newer files and symbolic links are left untouched.`)) return;
    try { setCacheBusy(true); const result = await window.aiof.cacheClean(id); notify(`Removed ${result.removedFiles} stale files (${fmtBytes(result.removedBytes)}); skipped ${result.skippedFiles || 0} in-use or protected files.`); await scanCache(); }
    catch (error) { notify(`Cleanup failed: ${error.message}`); }
  };

  useEffect(() => {
    const onKey = event => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') { event.preventDefault(); setSection('files'); pathInputRef.current?.focus(); pathInputRef.current?.select(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); searchRef.current?.focus(); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n' && section === 'files') { event.preventDefault(); createFolder(); }
      if (!typing && event.key === 'Delete' && section === 'files') { event.preventDefault(); trashSelected(); }
      if (event.altKey && event.key === 'ArrowLeft' && section === 'files') loadDirectory(parentPath(currentPath));
      if (event.key === 'Escape') setQuery('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const renderHome = () => (
    <div className="workspace-page home-page">
      <div className="home-welcome">
        <div><div className="eyebrow">AIOF · LOCAL WORKSPACE</div><h1>Good to see you.</h1><p>Your drives, frequent folders and recent work in one place.</p></div>
        <div className="home-actions"><button className="btn btn-quiet" onClick={() => refreshHome()}><RefreshCw size={14}/> Refresh</button><button className="btn btn-primary" onClick={async () => { const p = await window.aiof.chooseFolder(); if (p) { setSection('files'); loadDirectory(p); } }}><FolderOpen size={14}/> Open folder</button></div>
      </div>
      <div className="home-section"><div className="section-title-row"><div><h2>Drives and storage</h2><p>Available local volumes</p></div><button className="text-button" onClick={() => { setDiskRoot(old => old || homeData.disks[0]?.path || ''); setSection('disk'); }}>Analyze storage <ChevronRight size={14}/></button></div>
        <div className="drive-grid">{homeData.disks.length ? homeData.disks.map(drive => <button className="drive-card" key={drive.path} onClick={() => { setSection('files'); loadDirectory(drive.path); }} title={drive.path}><div className="drive-card-top"><span className="drive-icon"><HardDrive size={18}/></span><span className="drive-label">{drive.name}</span><span className="drive-percent">{drive.percent}% used</span></div><div className="drive-path">{drive.path}</div><div className="storage-track"><i style={{ width: `${Math.min(100, drive.percent)}%` }}/></div><div className="drive-meta"><span>{fmtBytes(drive.used)} used</span><span>{fmtBytes(drive.free)} free of {fmtBytes(drive.total)}</span></div></button>) : <div className="surface home-empty">Drive information is not available on this system.</div>}</div>
      </div>
      <div className="home-two-col">
        <section className="home-section"><div className="section-title-row"><div><h2>Pinned folders</h2><p>Your quick access locations</p></div><button className="text-button" onClick={() => setSection('files')}>Browse files <ChevronRight size={14}/></button></div>
          <div className="home-list surface">{homeData.pinned.length ? homeData.pinned.map(item => <div className="home-list-row" key={item.path}><button className="home-list-main" onClick={() => { setSection('files'); loadDirectory(item.path); }}><span className="home-list-icon"><Folder size={17}/></span><span><strong>{item.name}</strong><small title={item.path}>{item.path}</small></span></button><button className="icon-button compact" title="Unpin folder" onClick={() => unpinFolder(item.path)}><X size={14}/></button></div>) : <div className="home-empty">Pin folders from File Manager to keep them here.</div>}</div>
        </section>
        <section className="home-section"><div className="section-title-row"><div><h2>Most used</h2><p>Folders you open frequently</p></div></div>
          <div className="home-list surface">{homeData.mostUsed.length ? homeData.mostUsed.map(item => <button className="home-list-row home-list-main" key={item.path} onClick={() => { setSection('files'); loadDirectory(item.path); }}><span className="home-list-icon"><Activity size={17}/></span><span><strong>{item.name}</strong><small>{item.count} opens · {item.path}</small></span></button>) : <div className="home-empty">Folders you visit will appear here automatically.</div>}</div>
        </section>
      </div>
      <div className="home-section"><div className="section-title-row"><div><h2>Recent</h2><p>Recently opened files and folders on this device</p></div><button className="text-button" onClick={() => { setQuery(''); setSection('search'); }}>Search this PC <ChevronRight size={14}/></button></div>
        <div className="recent-list surface">{homeData.recent.length ? homeData.recent.map(item => <div className="recent-row" key={`${item.path}-${item.lastOpened}`}><button className="recent-main" onClick={async () => { try { if (item.kind === 'folder') { setSection('files'); await loadDirectory(item.path); } else { await openEntry({ path:item.path, name:item.name, extension:extensionOf(item.name), isDirectory:false }); } } catch (error) { notify(`Cannot open recent item: ${error.message}`); } }}><span className="home-list-icon">{item.kind === 'folder' ? <Folder size={16}/> : <File size={16}/>}</span><span><strong>{item.name}</strong><small title={item.path}>{item.path}</small></span></button><span className="recent-date">{fmtDate(item.lastOpened)}</span><button className="icon-button compact" title="Remove from recent" onClick={async () => { await window.aiof.removeRecent(item.path); await refreshHome(); }}><X size={13}/></button></div>) : <div className="home-empty">Your recently opened items will appear here.</div>}</div>
      </div>
      <div className="home-tool-strip"><button onClick={() => setSection('disk')}><Gauge size={17}/><span><strong>Disk analyzer</strong><small>Find large files and folders</small></span></button><button onClick={() => setSection('cleanup')}><Eraser size={17}/><span><strong>Storage cleanup</strong><small>Review temporary and cache files</small></span></button><button onClick={() => setSection('code')}><Code2 size={17}/><span><strong>Zed IDE</strong><small>Open a development workspace</small></span></button></div>
    </div>
  );

  const renderSearch = () => (
    <div className="workspace-page">
      <PageHeader title="Search this PC" subtitle="Find files and folders across the available local drives." icon={FolderSearch} action={<button className="btn btn-quiet" onClick={() => { setQuery(''); setSection('home'); }}><ArrowLeft size={14}/> Home</button>} />
      <div className="search-summary surface"><div><strong>{searchResults.length} results</strong><span>{searchPartial ? ' · Search reached its time or scan limit; some locations may remain.' : ' · Local filename search'}</span></div><button className="btn btn-quiet" onClick={runGlobalSearch} disabled={searchBusy}><RefreshCw size={14}/> Search again</button></div>
      <div className="search-results surface">{searchBusy ? <div className="empty-state"><Loader2 className="spin" size={22}/> Searching local drives…</div> : searchResults.length ? searchResults.map(item => <div role="button" tabIndex={0} className={`search-result-row ${diskRoot === item.path ? 'selected' : ''}`} key={item.path} onDoubleClick={() => { if (item.isDirectory) { setSection('files'); loadDirectory(item.path); } else openEntry({path:item.path,name:item.name,extension:item.extension||extensionOf(item.name),isDirectory:false}); }} onClick={() => setDiskRoot(item.path)}><span className={`entry-icon ${item.isDirectory ? 'folder' : 'file'}`}>{item.isDirectory ? <Folder size={19}/> : <File size={19}/>}</span><span className="search-result-info"><strong>{item.name}</strong><small title={item.path}>{item.path}</small></span><span className="search-result-meta">{item.isDirectory ? 'Folder' : fmtBytes(item.size)}</span><button className="icon-button compact" title="Open location" onClick={event => { event.stopPropagation(); window.aiof.showItem(item.path); }}><ExternalLink size={14}/></button></div>) : <div className="empty-state"><FileSearch size={23}/><strong>No results yet</strong><span>Use the search box above with at least two characters.</span></div>}</div>
    </div>
  );

  const renderDisk = () => (
    <div className="workspace-page">
      <PageHeader title="Disk usage analyzer" subtitle="Scan a drive or folder to find where storage is being used." icon={Gauge} action={<button className="btn btn-quiet" onClick={() => refreshHome()}><RefreshCw size={14}/> Refresh drives</button>} />
      <form className="disk-scan-bar surface" onSubmit={event => { event.preventDefault(); scanDisk(); }}><input className="field" value={diskRoot} onChange={event => setDiskRoot(event.target.value)} placeholder="Enter a full drive or folder path"/><button className="btn btn-quiet" type="button" onClick={async () => { const selected = await window.aiof.chooseFolder(); if (selected) setDiskRoot(selected); }}><FolderOpen size={14}/> Choose folder</button><button className="btn btn-primary" type="submit" disabled={diskBusy}>{diskBusy ? <Loader2 className="spin" size={14}/> : <Gauge size={14}/>} Analyze</button></form>
      {diskBusy && <div className="surface scan-progress">Scanning directory tree… This can take some time on large drives.</div>}
      {diskReport && <><div className="disk-stats-grid"><div className="surface disk-stat"><small>Total discovered file data</small><strong>{fmtBytes(diskReport.totalBytes)}</strong></div><div className="surface disk-stat"><small>Files</small><strong>{diskReport.fileCount.toLocaleString()}</strong></div><div className="surface disk-stat"><small>Folders</small><strong>{diskReport.folderCount.toLocaleString()}</strong></div><div className="surface disk-stat"><small>Entries scanned</small><strong>{diskReport.scanned.toLocaleString()}{diskReport.partial ? ' +' : ''}</strong></div></div>
      <div className="disk-two-col"><section className="surface disk-panel"><h2>Largest files</h2>{diskReport.topFiles.map(item => <button className="disk-file-row" key={item.path} onClick={() => window.aiof.showItem(item.path)}><span><strong>{item.name}</strong><small title={item.path}>{item.path}</small></span><b>{fmtBytes(item.size)}</b></button>)}{!diskReport.topFiles.length && <div className="home-empty">No files found.</div>}</section><section className="surface disk-panel"><h2>File types</h2>{diskReport.byType.map(item => <div className="type-size-row" key={item.extension}><span>{item.extension}</span><div className="storage-track"><i style={{ width: `${Math.max(1, item.size / Math.max(1, diskReport.totalBytes) * 100)}%` }}/></div><b>{fmtBytes(item.size)}</b></div>)}</section></div><p className="field-hint">{diskReport.partial ? 'Partial scan: the scan limit was reached. Run against a smaller folder for a complete result.' : 'Scan excludes symbolic links and inaccessible system locations. File sizes do not represent filesystem allocation exactly.'}</p></>}
      {!diskReport && !diskBusy && <div className="surface home-empty">Choose a drive or folder to inspect its largest files and file-type distribution.</div>}
    </div>
  );

  const renderCleanup = () => (
    <div className="workspace-page">
      <PageHeader title="Temporary files & cache" subtitle="Review user-level temporary and cache locations before cleaning stale files." icon={Eraser} action={<button className="btn btn-quiet" onClick={scanCache}><RefreshCw size={14}/> Rescan</button>} />
      <div className="command-warning"><ShieldCheck size={17}/><span>AIOF scans these user-level cache locations every 20 seconds while this page is open. Cleaning skips symbolic links, files that are in use, and protected system folders. Browser caches are cleaned immediately where safe; temporary files are kept for 24 hours.</span></div>
      {cacheBusy ? <div className="surface scan-progress">Calculating temporary and cache folder sizes…</div> : <div className="cache-grid">{cacheRows.map(row => <section className="surface cache-card" key={row.id}><div className="cache-card-head"><span className="home-list-icon"><Database size={18}/></span><div><h2>{row.name}</h2><p>{row.description}</p></div></div><strong className="cache-size">{fmtBytes(row.bytes)}</strong><div className="cache-path" title={row.path}>{row.path}</div><div className="cache-meta">{row.files.toLocaleString()} files{row.partial ? ' · size scan partial' : ''}{row.scannedAt ? ` · scanned ${new Date(row.scannedAt).toLocaleTimeString()}` : ''}</div><button className="btn btn-quiet" disabled={!row.bytes} onClick={() => cleanCache(row.id)}><Eraser size={14}/> Clean stale files</button></section>)}</div>}
      <p className="field-hint">Retention: temporary files older than 24 hours; browser cache entries are eligible immediately. The Linux user cache keeps files newer than 30 days. Browser profiles, package-manager caches and application databases are not automatically removed.</p>
    </div>
  );

  const renderLegal = kind => (
    <div className="workspace-page legal-page"><PageHeader title={kind === 'terms' ? 'Terms & conditions' : 'Privacy policy'} subtitle="AIOF Desktop · User information" icon={kind === 'terms' ? ScrollText : ShieldCheck}/>
      {kind === 'terms' ? <article className="surface legal-card"><p className="legal-updated">Draft for AIOF Desktop · 9 November 2026</p><h2>1. Use of the application</h2><p>AIOF is a local desktop utility for managing files and using productivity tools. You are responsible for the files you access and the downloads or transfers you initiate.</p><h2>2. Your files and actions</h2><p>File operations can modify or remove data. Review destinations and confirmations carefully. Cleanup only targets the user temporary and cache locations described in the application. Keep independent backups of important information.</p><h2>3. Third-party components</h2><p>AIOF includes or references third-party open-source projects. Each component remains subject to its own license and notices in the distribution. AIOF does not claim ownership of those projects.</p><h2>4. Network features</h2><p>Downloads and torrent controls connect to endpoints you provide or configure. You are responsible for ensuring that your use complies with applicable laws, service terms and copyright requirements.</p><h2>5. Warranty and liability</h2><p>The application is provided on an “as is” basis, without warranties to the extent permitted by applicable law. Nothing in these terms excludes rights that cannot lawfully be excluded.</p><h2>6. Changes and contact</h2><p>These draft terms may change as AIOF develops. Before public distribution, the project owner should replace this draft with reviewed terms and a real support contact.</p></article> : <article className="surface legal-card"><p className="legal-updated">Draft for AIOF Desktop · 9 November 2026</p><h2>1. Local-first operation</h2><p>AIOF stores preferences, pinned folders, recent locations and usage counts in its local application data directory. The current application does not include an AIOF analytics or advertising service.</p><h2>2. File access</h2><p>When you browse, search, analyze storage or clean temporary files, AIOF accesses the local paths you request. File operations are performed using your current account permissions and ask for confirmation where appropriate.</p><h2>3. Network connections</h2><p>When you start a download, add a torrent, open a link or connect to qBittorrent, the relevant network request is sent to the destination shown or configured in the application. qBittorrent credentials are stored using the operating-system encryption facility when available.</p><h2>4. Data sharing</h2><p>AIOF does not intentionally send your file names, file contents, usage history or preferences to an AIOF server. Third-party services and engines you choose to connect may have their own privacy practices.</p><h2>5. Retention and deletion</h2><p>A full uninstall removes AIOF-owned preferences, profile databases, caches, private temporary files, shortcuts, file associations and AIOF shell-menu entries. It does not remove your personal documents, shared operating-system caches, system logs or data owned by other applications.</p><h2>6. Privacy contact and review</h2><p>This is a project privacy notice draft, not legal advice. Before distribution, add a maintained privacy contact and review the behavior of every bundled third-party engine and installer.</p></article>}
    </div>
  );

  const renderFileManager = () => (
    <div className="workspace-page files-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="live-dot" /> PERSONAL WORKSPACE</div><h1>File Manager</h1><p>Your files, folders and connected tools in one workspace.</p></div>
        <div className="heading-actions"><button className="btn btn-quiet" onClick={() => loadDirectory()}><RefreshCw size={15} /> Refresh</button><button className="btn btn-primary" onClick={() => window.aiof.chooseFolder().then(p => p && loadDirectory(p))}><FolderOpen size={15} /> Open location</button></div>
      </div>
      <div className="file-toolbar">
        <button className="icon-button" title="Back" onClick={() => loadDirectory(parentPath(currentPath))}><ArrowLeft size={17} /></button>
        <button className="icon-button" title="Home" onClick={() => window.aiof.home().then(loadDirectory)}><Home size={16} /></button>
        <button className="icon-button" title="Refresh" onClick={() => loadDirectory()}><RefreshCw size={15} /></button>
        <form className="path-input-wrap" onSubmit={event => { event.preventDefault(); loadDirectory(pathDraft); }}><HardDrive size={15} /><input ref={pathInputRef} value={pathDraft} title={pathDraft} onChange={event => setPathDraft(event.target.value)} aria-label="Current path" /><button type="button" title="Copy full path" onClick={() => navigator.clipboard.writeText(currentPath)}><Copy size={14}/></button><button type="submit" title="Go to path"><ArrowRight size={15} /></button></form>
        <div className="toolbar-spacer" />
        <div className="toolbar-group"><button className={`icon-button ${view === 'grid' ? 'selected' : ''}`} title="Grid view" onClick={() => setView('grid')}><Grid2X2 size={16} /></button><button className={`icon-button ${view === 'list' ? 'selected' : ''}`} title="List view" onClick={() => setView('list')}><List size={17} /></button></div>
        <button className={`icon-button ${showHidden ? 'selected' : ''}`} title="Toggle hidden files" onClick={toggleHidden}><SlidersHorizontal size={16} /></button>
        <button className="icon-button" title="New file" onClick={createFile}><FilePlus2 size={16} /></button>
        <button className="icon-button" title="New folder" onClick={createFolder}><FolderPlus size={16} /></button>
        <span className="toolbar-divider"/>
        <button className="btn btn-quiet toolbar-action" title="Open the selected item inside AIOF" disabled={selected.length!==1} onClick={()=>openEntry(selectedEntries[0])}><FolderOpen size={14}/> Open</button>
        <button className="btn btn-quiet toolbar-action" title="Change selected file extension; does not convert its contents" disabled={selected.length!==1||Boolean(selectedEntries[0]?.isDirectory)} onClick={changeFileType}><FileText size={14}/> File type</button>
      </div>
      <div className="browser-body">
        <div className="file-list-panel">
          <div className="list-topline"><div className="item-count">{visibleEntries.length} items <span>·</span> {baseName(currentPath) || currentPath}</div><div className="sort-controls"><span>Sort by</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="name">Name</option><option value="type">Type</option><option value="size">Size</option><option value="modified">Modified</option></select><button className="icon-button compact" title="Toggle sort direction" onClick={() => setSortDirection(old => old === 'asc' ? 'desc' : 'asc')}><ArrowUpDown size={14} /></button></div></div>
          <div className={`file-collection ${view === 'grid' ? 'grid-view' : 'list-view'}`}>
            {busy && <div className="loading-state"><Loader2 className="spin" size={22} /> Reading folder…</div>}
            {!busy && visibleEntries.map(item => {
              const isSelected = selected.includes(item.path);
              return <button key={item.path || item.name} className={`file-entry ${isSelected ? 'active' : ''}`} onClick={event => { setContextMenu(null); chooseEntry(item, event); }} onContextMenu={event=>{event.preventDefault();setSelected([item.path]);setContextMenu({x:Math.min(event.clientX,window.innerWidth-230),y:Math.min(event.clientY,window.innerHeight-260),item});}} onDoubleClick={() => {setContextMenu(null);openEntry(item);}}>
                <div className={`entry-icon ${fileKind(item)}`}><FileGlyph item={item} size={view === 'grid' ? 23 : 19} /></div>
                <div className="entry-main"><strong title={item.name}>{item.name}</strong><span>{item.isDirectory ? 'Folder' : `${fmtBytes(item.size)} · ${item.extension?.toUpperCase() || 'FILE'}`}</span></div>
                {view === 'list' && <><span className="entry-modified">{fmtDate(item.modified)}</span><MoreHorizontal className="entry-more" size={16} /></>}
              </button>;
            })}
            {!busy && visibleEntries.length === 0 && <div className="empty-state"><Search size={24} /><strong>No items found</strong><span>Try another search or open a different folder.</span></div>}
          </div>
          <div className="list-footer"><span>{selected.length ? `${selected.length} selected` : 'Select an item to see its details'}</span><div className="selection-tools">
            <button disabled={!selected.length} title="Copy" onClick={() => copyOrMove('copy')}><Copy size={15} /></button>
            <button disabled={!selected.length} title="Move" onClick={() => copyOrMove('move')}><ArrowRight size={15} /></button>
            <button disabled={!selected.length} title="Rename" onClick={renameSelected}><Pencil size={15} /></button>
            <button disabled={!selected.length} title="Move to trash" onClick={trashSelected}><Trash2 size={15} /></button>
          </div></div>
        </div>
        {previewOpen && <aside className="preview-panel">
          <div className="panel-heading"><strong>Details</strong><button className="icon-button compact" title="Hide details" onClick={() => setPreviewOpen(false)}><X size={15} /></button></div>
          {selectedEntries.length === 1 ? <>
            <div className={`preview-pane-media ${fileKind(selectedEntries[0]) === 'pdf' ? 'is-pdf' : ''}`}>
              {selectedPreviewUrl && fileKind(selectedEntries[0]) === 'image' ? <img src={selectedPreviewUrl} alt={selectedEntries[0].name}/> : null}
              {selectedPreviewUrl && fileKind(selectedEntries[0]) === 'video' ? <video src={selectedPreviewUrl} controls preload="metadata"/> : null}
              {selectedPreviewUrl && fileKind(selectedEntries[0]) === 'audio' ? <div className="preview-pane-audio"><AudioLines size={28}/><audio src={selectedPreviewUrl} controls preload="metadata"/></div> : null}
              {selectedPreviewUrl && fileKind(selectedEntries[0]) === 'pdf' ? <iframe className="preview-pane-pdf" title={`Preview ${selectedEntries[0].name}`} src={selectedPreviewUrl}/> : null}
              {(!selectedPreviewUrl || !['image','video','audio','pdf'].includes(fileKind(selectedEntries[0]))) && <div className={`preview-icon ${fileKind(selectedEntries[0])}`}><FileGlyph item={selectedEntries[0]} size={34} /></div>}
            </div>
            <h3 className="preview-name">{selectedEntries[0].name}</h3>
            <div className="preview-type">{selectedEntries[0].isDirectory ? 'Folder' : `${selectedEntries[0].extension?.toUpperCase() || 'FILE'} file`}</div>
            <div className="detail-list"><div><span>Size</span><b>{selectedEntries[0].isDirectory ? '—' : fmtBytes(selectedEntries[0].size)}</b></div><div><span>Modified</span><b>{fmtDate(selectedEntries[0].modified)}</b></div><div><span>Location</span><b title={selectedEntries[0].path}>{parentPath(selectedEntries[0].path)}</b></div></div>
            <div className="preview-actions"><button className="btn btn-primary full" onClick={() => openEntry(selectedEntries[0])}><ExternalLink size={15} /> Open</button><button className="btn btn-quiet full" onClick={() => window.aiof.showItem(selectedEntries[0].path)}><FolderOpen size={15} /> Show in folder</button>{selectedEntries[0].isDirectory && <button className="btn btn-quiet full" onClick={() => pinFolder(selectedEntries[0].path)}><Pin size={14}/> Pin to Home</button>}</div>
          </> : selectedEntries.length > 1 ? <div className="preview-empty"><CheckCircle2 size={26} /><strong>{selectedEntries.length} items selected</strong><span>Use the toolbar to copy, move, compress or remove them.</span></div> : <div className="preview-empty"><File size={26} /><strong>No selection</strong><span>Choose a file or folder to inspect its details and actions.</span></div>}
        </aside>}
        {!previewOpen && <button className="show-preview" onClick={() => setPreviewOpen(true)}><PanelIcon /> Details</button>}
      </div>
    </div>
  );

  const renderInternet = () => (
    <div className="workspace-page internet-page">
      <PageHeader title="Internet speed test" subtitle="Measure this device's route to Cloudflare's edge network. Results vary with Wi-Fi, VPN and network load." icon={Gauge} action={<button className="btn btn-primary" onClick={runInternetSpeedTest} disabled={speedBusy}>{speedBusy?<Loader2 className="spin" size={14}/>:<Activity size={14}/>} {speedBusy?'Testing…':'Run speed test'}</button>} />
      <section className="speedtest-hero surface"><div className="speedtest-orb"><Gauge size={34}/><strong>{speedTest?speedTest.downloadMbps.toFixed(1):'—'}</strong><span>Mbps download</span></div><div className="speedtest-copy"><span className="eyebrow">NETWORK DIAGNOSTICS</span><h2>{speedBusy?speedStage:speedTest?'Test complete':'Check your connection'}</h2><p>{speedBusy?'AIOF is measuring latency and transfer throughput. Avoid other large downloads during the test.':speedTest?`Measured against ${speedTest.server}. Run again later to compare conditions.`:'A short test sends traffic to Cloudflare’s public speed-test endpoints. It does not change your network settings.'}</p><button className="btn btn-quiet" onClick={runInternetSpeedTest} disabled={speedBusy}><RefreshCw size={14}/> {speedTest?'Test again':'Start test'}</button></div></section>
      <div className="speedtest-metrics"><div className="surface speed-metric"><small>Latency</small><strong>{speedTest?`${speedTest.pingMs.toFixed(0)} ms`:'—'}</strong><span>Round trip average</span></div><div className="surface speed-metric"><small>Download</small><strong>{speedTest?`${speedTest.downloadMbps.toFixed(1)} Mbps`:'—'}</strong><span>Measured throughput</span></div><div className="surface speed-metric"><small>Upload</small><strong>{speedTest?.uploadMbps!=null?`${speedTest.uploadMbps.toFixed(1)} Mbps`:'—'}</strong><span>{speedTest?.uploadMbps==null?'Not available':'Measured throughput'}</span></div></div>
      {speedBusy&&<div className="surface speed-progress"><Loader2 className="spin" size={17}/><span>{speedStage||'Running speed test'}…</span></div>}
      <div className="inline-note"><ShieldCheck size={15}/> The test contacts speed.cloudflare.com for latency, download and upload samples. The service receives standard network request information (including your IP address); AIOF does not store the results remotely. See the <button className="inline-link" onClick={()=>window.aiof.openUrl('https://github.com/cloudflare/speedtest')}>Cloudflare speed-test implementation</button>.</div>
    </div>
  );

  const renderDownloads = () => (
    <div className="workspace-page">
      <PageHeader title="Downloads" subtitle="AIOF Download Service · parallel range transfers when supported, with pause and resume." icon={CloudDownload} />
      <form className="surface download-form" onSubmit={startDownload}>
        <div className="form-title"><div className="tile-icon cyan"><Download size={19} /></div><div><strong>New download</strong><span>Paste a direct HTTP or HTTPS file URL.</span></div></div>
        <div className="download-fields"><input className="field" value={downloadUrl} onChange={event => setDownloadUrl(event.target.value)} placeholder="https://example.com/file.zip" type="url" required /><input className="field name-field" value={downloadName} onChange={event => setDownloadName(event.target.value)} placeholder="Filename (optional)" /><button className="btn btn-primary" type="submit"><ArrowDown size={16} /> Start download</button></div>
        <div className="form-hint"><ShieldCheck size={14} /> Downloads are saved to your system Downloads folder. Large files use up to 8 parallel connections when the server supports byte ranges; other servers use one stream.</div>
      </form>
      <div className="section-toolbar"><div><h2>Transfer queue</h2><p>{downloads.length} download tasks in this session</p></div><button className="btn btn-quiet" onClick={refreshDownloads}><RefreshCw size={15} /> Refresh</button></div>
      <div className="surface transfer-list">
        {downloads.length === 0 ? <EmptyState icon={CloudDownload} title="Nothing downloading" subtitle="Start a download by pasting a file URL above." /> : downloads.map(task => <div className="transfer-row" key={task.id}>
          <div className="transfer-file-icon"><File size={20} /></div><div className="transfer-info"><div className="transfer-title"><strong title={task.filename}>{task.filename}</strong><span className={`status ${task.status}`}>{task.status}</span>{task.status==='downloading'&&<span className="transfer-connections">{task.segmented?`${task.segmentCount} connections`:'single stream'}</span>}</div><div className="progress-track"><i style={{ width: `${task.total ? Math.min(100, task.received / task.total * 100) : task.status === 'completed' ? 100 : 0}%` }} /></div><div className="transfer-meta"><span>{fmtBytes(task.received)} {task.total ? `of ${fmtBytes(task.total)}` : 'received'}</span><span>{task.error || task.path || task.url}</span></div></div>
          <div className="transfer-actions">{task.status === 'downloading' ? <button title="Pause" onClick={() => downloadAction('pause', task.id)}><Pause size={16} /></button> : ['paused', 'error'].includes(task.status) ? <button title="Resume" onClick={() => downloadAction('resume', task.id)}><Play size={16} /></button> : null}{!['completed', 'cancelled'].includes(task.status) && <button title="Cancel" onClick={() => downloadAction('cancel', task.id)}><X size={16} /></button>}{task.status === 'completed' && <button title="Show downloaded file" onClick={() => window.aiof.showItem(task.path)}><FolderOpen size={16} /></button>}</div>
        </div>)}
      </div>
      <div className="inline-note"><Activity size={15} /> AIOF manages direct HTTP(S) downloads inside this window. Large files use parallel byte-range segments when supported; otherwise AIOF falls back to a single stream. Partial segments are retained for resume.</div>
    </div>
  );

  const renderTorrents = () => (
    <div className="workspace-page">
      <PageHeader title="Torrent manager" subtitle="Manage transfers through the qBittorrent engine owned by AIOF." icon={Wifi} action={<div className="button-row"><button className="btn btn-primary" onClick={async () => { try { await window.aiof.startTorrentEngine(); await refreshTorrents(); notify('AIOF torrent engine started.'); } catch (error) { notify(error.message); } }}><Play size={14}/> Start built-in engine</button><button className="btn btn-quiet" onClick={addTorrentFile} disabled={!torrentStatus.connected}><Plus size={14} /> .torrent file</button></div>} />
      <form className="surface torrent-add" onSubmit={addTorrent}><div className="connection-status"><span className={`connection-dot ${torrentStatus.connected ? 'online' : 'offline'}`} /><div><strong>{torrentStatus.connected ? `Connected · ${torrentStatus.version || 'qBittorrent'}` : 'qBittorrent not connected'}</strong><span>{torrentStatus.connected ? 'Local Web UI session is active.' : torrentStatus.error || 'Configure qBittorrent Web UI address and credentials in Settings.'}</span></div><button type="button" className="icon-button" onClick={refreshTorrents} title="Reconnect"><RefreshCw size={16} /></button></div><div className="download-fields"><input className="field" value={torrentInput} onChange={event => setTorrentInput(event.target.value)} placeholder="Paste a magnet link, torrent URL or local .torrent file path" /><button className="btn btn-primary" type="submit" disabled={!torrentStatus.connected}><Plus size={16} /> Add torrent</button></div></form>
      <div className="section-toolbar"><div><h2>Transfers</h2><p>{torrents.length} torrents reported by qBittorrent</p></div><button className="btn btn-quiet" onClick={refreshTorrents}><RefreshCw size={15} /> Refresh</button></div>
      <div className="surface torrent-table">
        {torrents.length === 0 ? <EmptyState icon={Wifi} title={torrentStatus.connected ? 'No active torrents' : 'Connect qBittorrent'} subtitle={torrentStatus.connected ? 'Add a magnet link or torrent file to get started.' : 'Start the built-in qBittorrent engine above. Its executable must be staged into this AIOF build.'} /> : <>
          <div className="torrent-table-head"><span>Name</span><span>Progress</span><span>Down</span><span>Up</span><span>Status</span><span /></div>
          {torrents.map(torrent => <div className="torrent-row" key={torrent.hash}><div className="torrent-name"><strong title={torrent.name}>{torrent.name}</strong><small>{fmtBytes(torrent.size)} · {torrent.num_seeds || 0} seeds</small></div><div className="torrent-progress"><div className="progress-track"><i style={{ width: `${(torrent.progress || 0) * 100}%` }} /></div><span>{((torrent.progress || 0) * 100).toFixed(1)}%</span></div><span>{fmtBytes(torrent.dlspeed)}/s</span><span>{fmtBytes(torrent.upspeed)}/s</span><span className="status-text">{torrent.state}</span><div className="transfer-actions"><button title={String(torrent.state).includes('paused') ? 'Resume' : 'Pause'} onClick={() => torrentAction(String(torrent.state).includes('paused') ? 'resume' : 'pause', torrent.hash)}>{String(torrent.state).includes('paused') ? <Play size={15} /> : <Pause size={15} />}</button><button title="Remove from qBittorrent" onClick={() => torrentAction('delete', torrent.hash)}><X size={15} /></button></div></div>)}
        </>}
      </div>
      <div className="inline-note"><LockKeyhole size={15} /> AIOF connects only to the qBittorrent Web UI host you configure. Keep that interface bound to localhost unless you intentionally secure remote access.</div>
    </div>
  );

  const createOfficeFile = async (format, targetDirectory = '') => {
    const meta = ({ odt: { label: 'Writer document', extension: 'odt' }, ods: { label: 'Calc spreadsheet', extension: 'ods' }, odp: { label: 'Impress presentation', extension: 'odp' } })[format];
    if (!meta) return;
    try {
      const summary = await window.aiof.homeData();
      const directory = targetDirectory || summary.places?.find(place => place.kind === 'documents')?.path || await window.aiof.home();
      const suggested = `Untitled.${meta.extension}`;
      const requested = window.prompt(`Create ${meta.label}`, suggested);
      if (!requested?.trim()) return;
      const name = requested.toLowerCase().endsWith(`.${meta.extension}`) ? requested : `${requested}.${meta.extension}`;
      const createdPath = await window.aiof.officeCreate(directory, format, name);
      setOfficeFile({ path: createdPath, name: baseName(createdPath), extension: meta.extension, isDirectory: false, created: true });
      setSection('office');
      const error = await window.aiof.openPath(createdPath);
      if (error) notify(`${meta.label} saved, but no compatible desktop office app could open it: ${error}`);
      else notify(`${meta.label} created. Opened with your installed office suite.`);
    } catch (error) { notify(`Office document could not be created: ${error.message}`); }
  };
  const openOfficeFile = async file => {
    if (!file?.path) return;
    try { const error = await window.aiof.openPath(file.path); if (error) notify(`No compatible office application is registered: ${error}`); else notify('Opened with your installed office suite.'); }
    catch (error) { notify(`Could not open office file: ${error.message}`); }
  };

  const renderOffice = () => (
    <div className="workspace-page office-page">
      <PageHeader title="Office" subtitle="Office editing is not bundled in this build yet. Create starter files or open documents with a compatible installed suite." icon={BookOpen} />
      {officeFile&&<section className="surface office-file-notice"><div className="office-product-icon"><FileText size={22}/></div><div><strong>{officeFile.name}</strong><small title={officeFile.path}>{officeFile.path}</small><p>{officeFile.created ? 'Your new document is saved locally.' : 'This document is selected. Open it with your installed office suite.'} AIOF will open it using the system document association. Embedded LibreOfficeKit editing is not enabled until its native runtime is built and staged.</p></div><button className="btn btn-primary" onClick={()=>openOfficeFile(officeFile)}><ExternalLink size={14}/> Open document</button><button className="icon-button" onClick={()=>setOfficeFile(null)} title="Dismiss"><X size={15}/></button></section>}
      <div className="office-launch-grid">
        <section className="surface office-launch-card"><div className="office-product-icon word"><FileText size={26}/></div><div><h2>Writer documents</h2><p>Create an OpenDocument text starter (.odt); editing needs a compatible office engine.</p></div><button className="btn btn-primary" onClick={() => createOfficeFile('odt')}><FilePlus size={15}/> New document</button></section>
        <section className="surface office-launch-card"><div className="office-product-icon excel"><FileSpreadsheet size={26}/></div><div><h2>Calc spreadsheets</h2><p>Create an OpenDocument spreadsheet starter (.ods); editing needs a compatible office engine.</p></div><button className="btn btn-primary" onClick={() => createOfficeFile('ods')}><FilePlus size={15}/> New spreadsheet</button></section>
        <section className="surface office-launch-card"><div className="office-product-icon powerpoint"><Presentation size={26}/></div><div><h2>Impress presentations</h2><p>Create an OpenDocument presentation starter (.odp); editing needs a compatible office engine.</p></div><button className="btn btn-primary" onClick={() => createOfficeFile('odp')}><FilePlus size={15}/> New presentation</button></section>
      </div>
      <section className="surface office-open-row"><div><strong>Open an existing document</strong><span>Choose a Word, Excel, PowerPoint or OpenDocument file. AIOF hands it to the compatible office app registered on your system.</span></div><button className="btn btn-quiet" onClick={async () => { const file = await window.aiof.pickFile([{ name: 'Office documents', extensions: ['docx','xlsx','pptx','odt','ods','odp','doc','xls','ppt','rtf','csv'] }]); if (file) { const item={path:file,name:baseName(file),extension:extensionOf(file),isDirectory:false}; setOfficeFile(item); } }}><FolderOpen size={15}/> Browse documents</button></section>
      <div className="setting-note office-runtime-note"><strong>Office runtime status</strong><small>AIOF can create valid OpenDocument starter files. Embedded Writer, Calc and Impress are not active in this build: the LibreOfficeKit bridge and matching per-platform runtime are not packaged. AIOF will not display a fake editor. Starter files can be created, then opened by a compatible office suite installed on this device.</small></div>
      <section className="surface office-notes-card"><div><h2>Text & Code Editor</h2><p>Open scripts, configuration files, Markdown and plain text directly in AIOF.</p></div><button className="btn btn-quiet" onClick={()=>setSection('code')}><Code2 size={14}/> Open editor</button></section>
    </div>
  );

  const renderPdf = () => (
    <div className="workspace-page pdf-page">
      <PageHeader title="PDF workspace" subtitle="Open, organize and process PDF files in AIOF. Your local PDF engine runs on this device." icon={FileText} action={<div className="button-row"><button className="btn btn-quiet" onClick={async()=>{const file=await window.aiof.pickFile([{name:'PDF documents',extensions:['pdf']}]);if(file)openPdf({path:file,name:baseName(file),extension:'pdf',isDirectory:false});}}><FolderOpen size={14}/> Open PDF</button><button className="btn btn-primary" disabled={pdfBusy} onClick={openPdfTools}>{pdfBusy?<Loader2 className="spin" size={14}/>:<FileText size={14}/>} {pdfStudioUrl?'Reload PDF tools':'Launch PDF tools'}</button></div>} />
      {pdfStudioUrl ? <section className="surface pdf-embedded-shell"><div className="pdf-embedded-toolbar"><div><strong>Stirling PDF · Local engine</strong><small>{pdfStudioUrl}</small></div><div className="button-row"><button className="icon-button" title="Reload" onClick={()=>setPdfStudioUrl(`${pdfStudioUrl.split('?')[0]}?aiof=${Date.now()}`)}><RefreshCw size={15}/></button><button className="btn btn-quiet" onClick={()=>setPdfStudioUrl('')}><X size={14}/> Close workspace</button></div></div><iframe title="AIOF PDF workspace" src={pdfStudioUrl} allow="clipboard-read; clipboard-write"/></section> : <>
        <section className="pdf-welcome surface"><div className="pdf-welcome-art"><FileText size={42}/><span>PDF</span></div><div className="pdf-welcome-copy"><span className="eyebrow">DOCUMENT WORKSPACE</span><h2>Everything for your PDF workflow</h2><p>Preview PDFs directly inside AIOF. Start the local Stirling PDF engine for page organization, conversion, compression, OCR and document protection.</p><div className="button-row"><button className="btn btn-primary" onClick={openPdfTools} disabled={pdfBusy}>{pdfBusy?<Loader2 className="spin" size={14}/>:<Play size={14}/>} Start PDF workspace</button><button className="btn btn-quiet" onClick={async()=>{const file=await window.aiof.pickFile([{name:'PDF documents',extensions:['pdf']}]);if(file)openPdf({path:file,name:baseName(file),extension:'pdf',isDirectory:false});}}><FolderOpen size={14}/> Open a PDF</button></div></div></section>
        <div className="pdf-feature-grid">{[{name:'Organize pages',desc:'Merge, split, reorder, rotate and remove pages',icon:LayoutGrid},{name:'Convert files',desc:'Convert office documents and images to PDF',icon:RefreshCw},{name:'Optimize PDF',desc:'Compress documents and reduce file size',icon:Archive},{name:'OCR & extract',desc:'Make scans searchable and extract text',icon:FileSearch},{name:'Protect documents',desc:'Password protection, redaction and permissions',icon:LockKeyhole},{name:'Sign & annotate',desc:'Sign, stamp and add watermarks',icon:Pencil}].map((tool,index)=><button className="surface pdf-feature-card" key={tool.name} onClick={openPdfTools}><span className="pdf-feature-icon"><tool.icon size={20}/></span><span><strong>{tool.name}</strong><small>{tool.desc}</small></span><ChevronRight size={16}/></button>)}</div>
        <div className="inline-note"><ShieldCheck size={15}/> The PDF workspace is served locally by Stirling PDF. It sends no documents to a cloud service from AIOF, although the included PDF engine's own configuration and optional features should be reviewed before distribution.</div>
      </>}
    </div>
  );

  const renderCode = () => {
    const lineCount = Math.max(1, (editor.content || '').split('\n').length);
    const language = (editor.name || '').split('.').pop().toUpperCase();
    return <div className="workspace-page code-page">
      <PageHeader title="Code Editor" subtitle="A fast, native-feeling code editor built into AIOF, with tabs-ready editing, syntax colors and local saves." icon={Code2} action={<div className="button-row"><button className="btn btn-quiet" onClick={() => newTextDocument('txt')}><Plus size={14}/> New</button><button className="btn btn-quiet" onClick={async () => { const file = await window.aiof.pickFile([{ name: 'Code and text files', extensions: textExts }]); if (file) openEntry({ path:file, name:baseName(file), extension:extensionOf(file), isDirectory:false }); }}><FolderOpen size={14}/> Open file</button><button className="btn btn-primary" disabled={!editor.name} onClick={saveEditor}><Save size={14}/> Save</button></div>} />
      <div className="code-workspace surface">
        <div className="code-toolbar"><div className="code-file-tab"><Code2 size={15}/><strong>{editor.name || 'Untitled source file'}</strong>{editor.dirty && <i className="dirty-dot"/>}<small>{language || 'TEXT'}</small></div><div className="button-row"><button className="icon-button" title="Save as" onClick={async () => { const file = await window.aiof.saveTextAs(editor.content, editor.name || 'Untitled.txt'); if (file) setEditor(old => ({...old,path:file,name:baseName(file),dirty:false})); }}><Save size={15}/></button><button className="icon-button" title="Open containing folder" disabled={!editor.path} onClick={() => window.aiof.showItem(editor.path)}><FolderOpen size={15}/></button></div></div>
        {editor.name ? <div className="code-editor-area"><pre className="code-line-numbers" aria-hidden="true">{Array.from({length:lineCount}, (_,i) => i+1).join('\n')}</pre><div className="code-surface"><pre ref={codeHighlightRef} className="code-highlight" aria-hidden="true"><code dangerouslySetInnerHTML={{__html:highlightSource(editor.content)}}/></pre><textarea ref={codeTextareaRef} className="code-textarea" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={editor.content} onChange={event => setEditor(old => ({...old,content:event.target.value,dirty:true}))} onScroll={event=>{if(codeHighlightRef.current){codeHighlightRef.current.scrollTop=event.currentTarget.scrollTop;codeHighlightRef.current.scrollLeft=event.currentTarget.scrollLeft;}}} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveEditor();}if(event.key==='Tab'){event.preventDefault();const node=event.currentTarget;const start=node.selectionStart;const end=node.selectionEnd;const content=editor.content.slice(0,start)+'  '+editor.content.slice(end);setEditor(old=>({...old,content,dirty:true}));requestAnimationFrame(()=>{node.selectionStart=node.selectionEnd=start+2;});}}} aria-label="Code and text editor" /></div></div> : <div className="code-empty"><div className="code-empty-mark"><Code2 size={34}/></div><h2>Your code workspace</h2><p>Open a source file or create a new text file. Changes stay local until you save them.</p><div className="button-row"><button className="btn btn-primary" onClick={() => newTextDocument('txt')}><Plus size={14}/> New file</button><button className="btn btn-quiet" onClick={async () => { const file = await window.aiof.pickFile([{name:'Code files',extensions:textExts}]); if (file) openEntry({path:file,name:baseName(file),extension:extensionOf(file),isDirectory:false}); }}><FolderOpen size={14}/> Browse files</button></div></div>}
        <div className="code-statusbar"><span>{editor.path || 'No file opened'}</span><span>{language || 'Plain text'} · {lineCount} lines · {(editor.content || '').length.toLocaleString()} chars</span></div>
      </div>
      <div className="inline-note"><ShieldCheck size={15}/> The AIOF editor runs in this window. It is a compact text editor with syntax highlighting; it does not yet include Zed's full language-server, extension or debugger runtime.</div>
    </div>;
  };

  const renderArchive = () => (
    <div className="workspace-page">
      <PageHeader title="Compressor & Extractor" subtitle="Create ZIP archives in-app. Extract ZIP directly; other formats require a 7-Zip-compatible executable." icon={Archive} />
      <div className="archive-cards">
        <div className="surface archive-card"><div className="archive-illustration green"><Package size={25} /></div><h2>Create an archive</h2><p>Select files and folders in File Manager, then create a compressed ZIP archive.</p><button className="btn btn-primary" onClick={() => { setSection('files'); notify('Select one or more items, then choose Compress to ZIP.'); }}><FolderOpen size={15} /> Select files</button><span className="small-hint">Currently selected: {selected.length} item(s)</span></div>
        <div className="surface archive-card"><div className="archive-illustration blue"><Download size={25} /></div><h2>Extract an archive</h2><p>Choose an archive file and extract it into a new folder under the current location.</p><button className="btn btn-primary" onClick={async () => { const file = await window.aiof.pickFile([{ name: 'Archive files', extensions: archiveExts }]); if (!file) return; const target = joinPath(currentPath || await window.aiof.home(), baseName(file).replace(/\.[^.]+$/, '')); try { await window.aiof.extractArchive(file, target); await loadDirectory(currentPath); notify('Archive extracted'); } catch (error) { notify(error.message); } }}><Archive size={15} /> Choose archive</button><span className="small-hint">ZIP works natively; the bundled 7-Zip engine adds 7z and other formats on supported builds.</span></div>
      </div>
      <div className="surface format-panel"><h3>Supported formats</h3><div className="format-tags"><span>ZIP · create / extract</span><span>7Z · create / extract with 7-Zip</span><span>RAR · extract with 7-Zip</span><span>TAR / GZ / BZ2 / XZ · extract with 7-Zip</span></div><p>The matching 7-Zip runtime is packaged per operating system. Build it with the Windows or Linux helper if it is not available in this development copy.</p></div>
    </div>
  );

  const renderSettings = () => (
    <div className="workspace-page settings-page">
      <PageHeader title="Personalization & settings" subtitle="Make AIOF feel like your desktop. Changes preview immediately; save to keep them." icon={Settings}/>
      <form className="settings-layout" onSubmit={saveSettings}>
        <section className="surface settings-card settings-wide"><div className="settings-section-title"><div className="tile-icon"><SlidersHorizontal size={18}/></div><div><h2>Appearance studio</h2><p>Choose a visual language, color system and surface treatment.</p></div></div>
          <div className="appearance-choice-grid">{[{id:'system',name:'System native',copy:'Follow the desktop color scheme and platform conventions'},{id:'fluent',name:'Windows Fluent',copy:'A familiar Windows 11 layout and control language'},{id:'classic',name:'AIOF Classic',copy:'A restrained neutral theme with consistent controls'}].map(option=><button type="button" key={option.id} className={`appearance-choice ${settings.appearance===option.id?'active':''}`} onClick={()=>setSettings(old=>({...old,appearance:option.id}))}><span className={`appearance-preview ${option.id}`}><i/><b/><em/></span><strong>{option.name}</strong><small>{option.copy}</small></button>)}</div>
          <div className="preset-row"><div><strong>Quick presets</strong><small>Start with a practical desktop palette, then fine-tune it below.</small></div><div className="preset-chips">{[{id:'system',label:'System default'},{id:'windows',label:'Windows Fluent'},{id:'nord',label:'Nordic'},{id:'midnight',label:'Midnight'}].map(preset=><button type="button" key={preset.id} className="preset-chip" onClick={()=>applyAppearancePreset(preset.id)}>{preset.label}</button>)}</div></div>
          <div className="setting-note"><strong>{window.aiof?.platform === 'linux' ? 'Linux desktop integration' : 'Windows desktop integration'}</strong><small>{window.aiof?.platform === 'linux' ? 'System mode follows the desktop color preference and preserves GTK_THEME, XDG_CURRENT_DESKTOP and compositor environment. Native file dialogs follow your installed GTK/desktop integration. AIOF does not replace your GTK theme.' : 'System mode follows Windows light/dark preference. Native file dialogs and platform controls use Windows conventions.'}</small></div>
          <div className="theme-row"><div><strong>Color mode</strong><small>System is recommended. It follows the operating system appearance.</small></div><div className="segmented"><button type="button" className={settings.theme==='light'?'selected':''} onClick={()=>updateTheme('light')}><Sun size={14}/> Light</button><button type="button" className={settings.theme==='dark'?'selected':''} onClick={()=>updateTheme('dark')}><Moon size={14}/> Dark</button><button type="button" className={settings.theme==='system'?'selected':''} onClick={()=>updateTheme('system')}><Monitor size={14}/> System</button></div></div>
          <div className="theme-row"><div><strong>Accent color</strong><small>Used consistently for selection, focus rings, controls and active states.</small></div><div className="accent-swatches">{[{id:'blue',color:'#2887e3',label:'Blue'},{id:'violet',color:'#8b70ed',label:'Violet'},{id:'teal',color:'#17a79d',label:'Teal'},{id:'rose',color:'#d85d8f',label:'Rose'},{id:'amber',color:'#ce922e',label:'Amber'},{id:'slate',color:'#73839a',label:'Graphite'}].map(item=><button type="button" key={item.id} title={item.label} aria-label={`${item.label} accent`} className={settings.accent===item.id?'active':''} style={{'--swatch':item.color}} onClick={()=>setSettings(old=>({...old,accent:item.id}))}/>)}</div></div>
          <div className="theme-row custom-accent-row"><div><strong>Custom accent</strong><small>Pick an exact brand color.</small></div><div className="custom-color-control"><input type="color" aria-label="Custom accent color" value={settings.accentCustom||'#2687df'} onChange={event=>setSettings(old=>({...old,accent:'custom',accentCustom:event.target.value}))}/><code>{settings.accent==='custom' ? settings.accentCustom : 'Choose custom'}</code></div></div>
          <div className="setting-note"><strong>Native surfaces</strong><small>Liquid glass, neon borders and animated edge effects are intentionally disabled. On Linux, AIOF follows the system color preference and uses native GTK dialogs and desktop integration where available.</small></div>
          <label className="setting-row"><span><strong>Advanced image tools</strong><small>Show layers, selections, drawing, retouching and advanced filters in the image editor.</small></span><input type="checkbox" checked={Boolean(settings.advancedImageTools)} onChange={event=>setSettings(old=>({...old,advancedImageTools:event.target.checked}))}/></label>
          <label className="setting-row"><span><strong>Explorer density</strong><small>Adjust file row spacing.</small></span><select className="field setting-select" value={settings.density||'comfortable'} onChange={event=>setSettings(old=>({...old,density:event.target.value}))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
          <label className="setting-row"><span><strong>Corner style</strong><small>Adjust the shape of cards, fields and buttons.</small></span><select className="field setting-select" value={settings.roundness||'soft'} onChange={event=>setSettings(old=>({...old,roundness:event.target.value}))}><option value="square">Square</option><option value="soft">Soft</option><option value="rounded">Rounded</option></select></label>
          <label className="setting-row"><span><strong>Wallpaper dim</strong><small>Increase the tint for clearer text over custom backgrounds.</small></span><input className="setting-range" type="range" min="25" max="92" value={settings.wallpaperOpacity ?? 78} onChange={event=>setSettings(old=>({...old,wallpaperOpacity:Number(event.target.value)}))}/></label>
          <label className="setting-row"><span><strong>Default file layout</strong><small>Used when opening File Explorer.</small></span><select className="field setting-select" value={settings.defaultView||'list'} onChange={event=>{setView(event.target.value);setSettings(old=>({...old,defaultView:event.target.value}));}}><option value="list">Details list</option><option value="grid">Icon tiles</option></select></label>
          <div className="setting-row wallpaper-setting"><span><strong>Custom explorer wallpaper</strong><small>Wallpaper is tinted for readability and stored as a local path.</small>{settings.wallpaperPath&&<small className="settings-path" title={settings.wallpaperPath}>{settings.wallpaperPath}</small>}</span><div className="button-row"><button className="btn btn-quiet" type="button" onClick={async()=>{const file=await window.aiof.pickFile([{name:'Wallpaper images',extensions:['png','jpg','jpeg','webp','bmp']}]);if(!file)return;try{const url=await window.aiof.fileUrl(file);setWallpaperUrl(url);setSettings(old=>({...old,wallpaperPath:file}));}catch(error){notify(error.message);}}}><Image size={14}/> Choose image</button><button className="btn btn-quiet" type="button" disabled={!settings.wallpaperPath} onClick={()=>{setWallpaperUrl('');setSettings(old=>({...old,wallpaperPath:''}));}}>Remove</button></div></div>
        </section>
        <section className="surface settings-card"><div className="settings-section-title"><div className="tile-icon"><LayoutDashboard size={18}/></div><div><h2>Sidebar layout</h2><p>Show only the navigation areas you use.</p></div></div>
          {[['showQuickAccess','Quick Access folders'],['showDriveUsage','Drive storage meters'],['showSystemNav','System tools'],['showInternetNav','Internet tools']].map(([key,label])=><label className="setting-row" key={key}><span><strong>{label}</strong><small>Show this section in the navigation sidebar.</small></span><input type="checkbox" checked={settings[key]!==false} onChange={event=>setSettings(old=>({...old,[key]:event.target.checked}))}/></label>)}
          <label className="setting-row"><span><strong>Show hidden files</strong><small>Include hidden entries in folder listings.</small></span><input type="checkbox" checked={Boolean(settings.showHidden)} onChange={event=>setSettings(old=>({...old,showHidden:event.target.checked}))}/></label>
          {window.aiof?.platform==='win32'&&<label className="setting-row"><span><strong>Windows Explorer · Open with AIOF</strong><small>Add or remove a right-click command for files and folders. Windows still controls default-app selection.</small></span><input type="checkbox" checked={Boolean(settings.contextMenuEnabled)} onChange={event=>setSettings(old=>({...old,contextMenuEnabled:event.target.checked}))}/></label>}
        </section>
        <section className="surface settings-card"><div className="settings-section-title"><div className="tile-icon"><Wifi size={18}/></div><div><h2>Torrent service</h2><p>Local qBittorrent engine settings.</p></div></div><label className="field-label">Web UI address<input className="field" value={settings.qbitHost||''} onChange={event=>setSettings(old=>({...old,qbitHost:event.target.value}))}/></label><label className="field-label">Username<input className="field" value={settings.qbitUsername||''} onChange={event=>setSettings(old=>({...old,qbitUsername:event.target.value}))}/></label><label className="field-label">Password<input className="field" type="password" value={settings.qbitPassword||''} onChange={event=>setSettings(old=>({...old,qbitPassword:event.target.value}))} placeholder={settings.qbitPasswordSet?'Saved password retained':'Local service password'}/></label><p className="field-hint">AIOF limits this service connection to localhost.</p><div className="button-row"><button className="btn btn-quiet" type="button" onClick={refreshTorrents}><Activity size={14}/> Test connection</button><span className={`connection-label ${torrentStatus.connected?'online':'offline'}`}>{torrentStatus.connected?'Connected':'Not connected'}</span></div></section>
        <section className="surface settings-card"><div className="settings-section-title"><div className="tile-icon"><Package size={18}/></div><div><h2>Built-in engine bundle</h2><p>Engine availability inside this AIOF installation.</p></div></div>{engineStatus.map(engine=><div className="engine-setting" key={engine.key}><div className="tile-icon"><Code2 size={16}/></div><div><strong>{engine.label}</strong><small>{engine.command}</small></div><span className={`connection-label ${engine.available?'online':'offline'}`}>{engine.bundled?'Bundled':engine.available?'Found on system':'Not staged'}</span></div>)}<p className="field-hint">Source code alone is not a runnable engine. AIOF needs platform-ready engine binaries and their runtime libraries in its bundle.</p></section>
        <section className="surface settings-card legal-links-card"><div className="settings-section-title"><div className="tile-icon"><ShieldCheck size={18}/></div><div><h2>Legal & privacy</h2><p>Review app usage and local data handling.</p></div></div><div className="legal-link-row"><button className="btn btn-quiet" type="button" onClick={()=>setSection('terms')}><ScrollText size={14}/> Terms</button><button className="btn btn-quiet" type="button" onClick={()=>setSection('privacy')}><ShieldCheck size={14}/> Privacy</button></div></section>
        <div className="settings-save"><span><ShieldCheck size={15}/> Preferences are stored locally.</span><button className="btn btn-primary" type="submit"><Save size={15}/> Save settings</button></div>
      </form>
    </div>
  );

  return <div className={`app-shell ${theme} ${wallpaperUrl ? 'has-wallpaper' : ''}`} data-accent={settings.accent || 'blue'} data-density={settings.density || 'comfortable'} data-appearance={settings.appearance || 'system'} data-platform={isDesktop ? window.aiof.platform : 'web'} data-roundness={settings.roundness || 'soft'} style={{'--accent-custom':settings.accentCustom || '#2687df','--wallpaper-opacity':`${settings.wallpaperOpacity ?? 78}%`}}>
    <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <div className="brand-row"><div className="brand-mark"><FolderOpen size={21} aria-hidden="true"/><img src={aiofLogo} alt="AIOF" onError={event => { event.currentTarget.style.display = 'none'; }}/></div>{sidebarOpen&&<div className="brand-copy"><strong>AIOF</strong><span>All-in-One File Manager</span></div>}<button className="icon-button sidebar-toggle" title="Collapse navigation" onClick={()=>setSidebarOpen(value=>!value)}><Menu size={17}/></button></div>
      <div className="sidebar-scroll">
        {settings.showQuickAccess!==false&&<div className="nav-group quick-access-group"><div className="nav-section-label">{sidebarOpen?'QUICK ACCESS':'·'}</div>{(homeData.pinned.length?homeData.pinned:places.filter(place=>['desktop','documents','downloads','pictures'].includes(place.kind))).slice(0,10).map(place=><button key={place.path} className={`nav-link place-link ${currentPath===place.path?'active':''}`} onClick={()=>{setSection('files');loadDirectory(place.path);}} title={place.path}><span className="nav-icon muted"><Folder size={15}/></span>{sidebarOpen&&<span>{place.name}</span>}</button>)}</div>}
        <div className="nav-group"><button className={`nav-link ${section==='home'?'active':''}`} onClick={()=>setSection('home')} title="Home"><span className="nav-icon muted"><LayoutDashboard size={17}/></span>{sidebarOpen&&<span>Home</span>}</button></div>
        <div className="nav-group"><div className="nav-section-label">{sidebarOpen?'WORKSPACE':'·'}</div>{moduleItems.filter(item=>item.id==='files'||item.id==='office'||item.id==='code').map(item=><button key={item.id} className={`nav-link ${section===item.id?'active':''}`} onClick={()=>setSection(item.id)} title={item.name}><span className={`nav-icon ${item.color}`}><item.icon size={17}/></span>{sidebarOpen&&<span>{item.name}</span>}</button>)}</div>
        {settings.showDriveUsage!==false&&<div className="nav-group sidebar-drives"><div className="nav-section-label">{sidebarOpen?'STORAGE':'·'}</div>{homeData.disks.map(drive=><button className="sidebar-drive" key={drive.path} title={`${drive.path} · ${fmtBytes(drive.used)} used of ${fmtBytes(drive.total)}`} onClick={()=>{setDiskRoot(drive.path);setSection('files');loadDirectory(drive.path);}}><span className="sidebar-drive-top"><HardDrive size={14}/>{sidebarOpen&&<><strong>{drive.name}</strong><small>{drive.percent}%</small></>}</span>{sidebarOpen&&<><span className="sidebar-drive-track"><i style={{width:`${Math.min(100,drive.percent)}%`}}/></span><span className="sidebar-drive-meta">{fmtBytes(drive.used)} of {fmtBytes(drive.total)}</span></>}</button>)}</div>}
        {settings.showSystemNav!==false&&<div className="nav-group"><div className="nav-section-label">{sidebarOpen?'SYSTEM':'·'}</div><button className={`nav-link ${section==='disk'?'active':''}`} onClick={()=>setSection('disk')} title="Disk usage"><span className="nav-icon muted"><Gauge size={17}/></span>{sidebarOpen&&<span>Disk usage</span>}</button><button className={`nav-link ${section==='cleanup'?'active':''}`} onClick={()=>setSection('cleanup')} title="Temporary & cache"><span className="nav-icon muted"><Eraser size={17}/></span>{sidebarOpen&&<span>Temporary & cache</span>}</button></div>}
      </div>
      <div className="sidebar-bottom">
        {settings.showInternetNav!==false&&<div className="sidebar-internet"><div className="nav-section-label">{sidebarOpen?'INTERNET':'·'}</div><button className={`nav-link ${section==='downloads'?'active':''}`} onClick={()=>setSection('downloads')} title="Downloads"><span className="nav-icon cyan"><CloudDownload size={17}/></span>{sidebarOpen&&<span>Downloads</span>}</button><button className={`nav-link ${section==='torrent'?'active':''}`} onClick={()=>setSection('torrent')} title="Torrent client"><span className="nav-icon violet"><Wifi size={17}/></span>{sidebarOpen&&<span>Torrent client</span>}</button><button className={`nav-link ${section==='internet'?'active':''}`} onClick={()=>setSection('internet')} title="Internet speed test"><span className="nav-icon muted"><Gauge size={17}/></span>{sidebarOpen&&<span>Speed test</span>}</button></div>}
        <button className={`nav-link ${section==='settings'?'active':''}`} onClick={()=>setSection('settings')} title="Settings"><span className="nav-icon muted"><Settings size={17}/></span>{sidebarOpen&&<span>Settings</span>}</button>
        {sidebarOpen&&<div className="sidebar-footnote"><span className="system-dot"/> Local workspace · Windows & Linux</div>}
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-crumb"><span>AIOF</span><ChevronRight size={14}/><strong>{({home:'Home',files:'File Explorer',downloads:'Downloads',torrent:'Torrent client',office:'Office',pdf:'PDF tools',code:'Code Workspace',settings:'Settings',search:'Search results',disk:'Disk usage',cleanup:'Temporary & cache',terms:'Terms & conditions',privacy:'Privacy policy'})[section] || 'Workspace'}</strong></div><div className="topbar-right"><form className="global-search" onSubmit={runGlobalSearch}><Search size={16}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search files and folders" title="Search local drives and folders"/><kbd>Ctrl F</kbd>{query && <button type="button" onClick={() => setQuery('')} title="Clear search"><X size={13}/></button>}</form><button className="icon-button" title="Help" onClick={() => notify('AIOF · File Explorer and local desktop tools.')}><CircleHelp size={17}/></button><button className="icon-button" title="Toggle theme" onClick={() => updateTheme(theme==='dark'?'light':'dark')}><span className="theme-icon">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</span></button></div></header>
      <div className={`content-scroll ${section === 'files' ? 'no-outer-scroll' : ''}`} style={wallpaperUrl ? {backgroundImage:`linear-gradient(color-mix(in srgb,var(--bg) var(--wallpaper-opacity),transparent),color-mix(in srgb,var(--bg) var(--wallpaper-opacity),transparent)),url("${wallpaperUrl}")`} : undefined}>
        {section === 'home' && renderHome()}
        {section === 'files' && renderFileManager()}
        {section === 'search' && renderSearch()}
        {section === 'disk' && renderDisk()}
        {section === 'cleanup' && renderCleanup()}
        {section === 'terms' && renderLegal('terms')}
        {section === 'privacy' && renderLegal('privacy')}
        {section === 'downloads' && renderDownloads()}
        {section === 'internet' && renderInternet()}
        {section === 'torrent' && renderTorrents()}
        {section === 'office' && renderOffice()}
        {section === 'pdf' && renderPdf()}
        {section === 'code' && renderCode()}
        
        {section === 'settings' && renderSettings()}
      </div>
      <footer className="app-footer"><span><i/> AIOF Desktop <b>v0.7.1</b></span><span><button onClick={() => setSection('terms')}>Terms</button><em>·</em><button onClick={() => setSection('privacy')}>Privacy</button><em>·</em> Local workspace · Windows & Linux</span></footer>
    </main>
    {contextMenu&&<><div className="context-menu-dismiss" onClick={()=>setContextMenu(null)} onContextMenu={event=>{event.preventDefault();setContextMenu(null);}}/><div className="aiof-context-menu" style={{left:contextMenu.x,top:contextMenu.y}} role="menu"><button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);openEntry(item);}}><FolderOpen size={14}/> Open in AIOF</button><button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);window.aiof.showItem(item.path);}}><ExternalLink size={14}/> Show in folder</button>{contextMenu.item?.isDirectory&&<button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);pinFolder(item.path);}}><Pin size={14}/> Pin to Home</button>}{!contextMenu.item?.isDirectory&&<button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);setSelected([item.path]);setTimeout(changeFileType,0);}}><FileText size={14}/> Change file type</button>}{contextMenu.item?.isDirectory&&<button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);compressSelected([item.path]);}}><Archive size={14}/> Compress to ZIP</button>}{!contextMenu.item?.isDirectory&&<button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);compressSelected([item.path]);}}><Archive size={14}/> Compress to ZIP</button>}{!contextMenu.item?.isDirectory&&<button role="menuitem" onClick={()=>{const item=contextMenu.item;setContextMenu(null);extractArchiveEntry(item);}} disabled={!archiveExts.includes(contextMenu.item?.extension||extensionOf(contextMenu.item?.name||''))}><Package size={14}/> Extract archive</button>}<div className="context-menu-divider"/><div className="context-menu-group-label">Create in this folder</div><button role="menuitem" onClick={async()=>{const item=contextMenu.item;const dir=item?.isDirectory?item.path:currentPath;setContextMenu(null);const name=window.prompt('New folder name','New folder');if(name?.trim()){try{await window.aiof.createFolder(dir,name);await loadDirectory(currentPath);notify('Folder created');}catch(error){notify(error.message);}}}}><FolderPlus size={14}/> Folder</button><button role="menuitem" onClick={async()=>{const item=contextMenu.item;const dir=item?.isDirectory?item.path:currentPath;setContextMenu(null);const name=window.prompt('New text file name','New text file.txt');if(name?.trim()){try{const path=await window.aiof.createFile(dir,name);await window.aiof.writeText(path,'');await loadDirectory(currentPath);notify('Text file created');}catch(error){notify(error.message);}}}}><FileText size={14}/> Text file</button><button role="menuitem" onClick={()=>{const item=contextMenu.item;const dir=item?.isDirectory?item.path:currentPath;setContextMenu(null);createOfficeFile('odt',dir);}}><FileText size={14}/> Writer document</button><button role="menuitem" onClick={()=>{const item=contextMenu.item;const dir=item?.isDirectory?item.path:currentPath;setContextMenu(null);createOfficeFile('ods',dir);}}><FileSpreadsheet size={14}/> Calc spreadsheet</button><button role="menuitem" onClick={()=>{const item=contextMenu.item;const dir=item?.isDirectory?item.path:currentPath;setContextMenu(null);createOfficeFile('odp',dir);}}><Presentation size={14}/> Impress presentation</button></div></>}
    {previewAsset && <div className={`preview-overlay ${previewFullscreen ? 'preview-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-label={`Preview ${previewAsset.name}`}>
      <div className="preview-window">
        <div className="preview-titlebar"><div><strong>{previewAsset.name}</strong><small title={previewAsset.path}>{previewAsset.path}</small></div><div className="button-row">{(previewAsset.kind==='audio'||previewAsset.kind==='video')&&<span className="preview-engine-label">AIOF Media</span>}<button className="icon-button" title={previewFullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => setPreviewFullscreen(value => !value)}><Maximize2 size={15}/></button><button className="icon-button" title="Close preview" onClick={closePreview}><X size={16}/></button></div></div>
        {previewAsset.kind === 'image' ? <><div className="preview-image-stage"><img id="aiof-preview-image" src={previewAsset.url} alt={previewAsset.name} style={{transform:`rotate(${previewRotation}deg) scale(${previewZoom}) scaleX(${previewFlip ? -1 : 1})`,filter:`brightness(${previewBrightness}%) contrast(${previewContrast}%) saturate(${previewSaturation}%) hue-rotate(${previewHue}deg) blur(${previewBlur}px)`}}/></div><div className="preview-edit-toolbar"><button className="icon-button" title="Rotate left" onClick={() => setPreviewRotation(value => value-90)}><RotateCcw size={15}/></button><button className="icon-button" title="Rotate right" onClick={() => setPreviewRotation(value => value+90)}><RotateCw size={15}/></button><button className={`icon-button ${previewFlip ? 'selected':''}`} title="Flip horizontal" onClick={() => setPreviewFlip(value => !value)}><FlipHorizontal size={15}/></button><button className="icon-button" title="Zoom out" onClick={() => setPreviewZoom(value => Math.max(.25,value-.25))}><MinusIcon/></button><span className="zoom-value">{Math.round(previewZoom*100)}%</span><button className="icon-button" title="Zoom in" onClick={() => setPreviewZoom(value => Math.min(4,value+.25))}><Plus size={15}/></button><button className="icon-button" title="Reset adjustments" onClick={() => {setPreviewZoom(1);setPreviewRotation(0);setPreviewFlip(false);setPreviewBrightness(100);setPreviewContrast(100);setPreviewSaturation(100);}}><RotateCcw size={15}/></button><button className="btn btn-quiet" onClick={()=>setPreviewAdvancedOpen(value=>!value)}>{previewAdvancedOpen?'Hide':'Advanced'} tools</button><button className="btn btn-primary" onClick={saveImageCopy}><Save size={14}/> Save copy</button></div><div className="preview-adjustments"><label>Brightness <input type="range" min="50" max="150" value={previewBrightness} onChange={event => setPreviewBrightness(Number(event.target.value))}/><span>{previewBrightness}%</span></label><label>Contrast <input type="range" min="50" max="150" value={previewContrast} onChange={event => setPreviewContrast(Number(event.target.value))}/><span>{previewContrast}%</span></label><label>Saturation <input type="range" min="0" max="200" value={previewSaturation} onChange={event => setPreviewSaturation(Number(event.target.value))}/><span>{previewSaturation}%</span></label>{settings.advancedImageTools&&previewAdvancedOpen&&<><label>Hue <input type="range" min="-180" max="180" value={previewHue} onChange={event=>setPreviewHue(Number(event.target.value))}/><span>{previewHue}°</span></label><label>Soft focus <input type="range" min="0" max="4" step="0.25" value={previewBlur} onChange={event=>setPreviewBlur(Number(event.target.value))}/><span>{previewBlur}px</span></label></>}</div>{settings.advancedImageTools&&previewAdvancedOpen&&<div className="preview-advanced-note">Advanced image controls are enabled. Layer-based retouching and non-destructive masks are not included in this build.</div>}</> : previewAsset.kind === 'pdf' ? <div className="preview-pdf-stage"><iframe title={previewAsset.name} src={previewAsset.url}/><div className="preview-pdf-footer"><span>PDF preview · use PDF Studio for editing, conversion, OCR and page tools.</span><button className="btn btn-primary" onClick={async () => { setPreviewAsset(null); setSection('pdf'); await openPdfTools(); }}><FileText size={14}/> Open PDF tools</button></div></div> : previewAsset.kind === 'unknown' ? <div className="preview-unknown-stage"><div className="preview-unknown-card"><div className="preview-unknown-icon"><FileSearch size={38}/></div><span className="eyebrow">FILE DETAILS</span><h2>{previewAsset.name}</h2><p>This file type has no dedicated in-app viewer yet. It remains inside AIOF; you can inspect it as text or locate it in File Explorer.</p><dl><div><dt>Full path</dt><dd>{previewAsset.path}</dd></div><div><dt>Type</dt><dd>{previewAsset.extension ? `.${previewAsset.extension}` : 'Unknown'}</dd></div><div><dt>Size</dt><dd>{fmtBytes(previewAsset.size)}</dd></div><div><dt>Modified</dt><dd>{fmtDate(previewAsset.modified)}</dd></div></dl><div className="button-row"><button className="btn btn-primary" onClick={async()=>{try{await openText(previewAsset);closePreview();}catch(error){notify(`Cannot open as text: ${error.message}`);}}}><FileText size={14}/> Open as text</button><button className="btn btn-quiet" onClick={()=>window.aiof.showItem(previewAsset.path)}><FolderOpen size={14}/> Show in folder</button></div></div></div> : <div className="preview-media-stage">{previewAsset.kind === 'video' ? <video key={previewAsset.path} controls autoPlay src={previewAsset.url}/> : <div className="preview-audio"><div className="audio-art"><AudioLines size={48}/></div><strong>{previewAsset.name}</strong><audio key={previewAsset.path} controls autoPlay src={previewAsset.url}/></div>}<div className="preview-media-footer"><span>Playing inside AIOF. Codec support is provided by the built-in media layer.</span><span className="status">Native AIOF playback</span></div></div>}
      </div>
    </div>}
    {toast && <div className="toast"><CheckCircle2 size={16}/>{toast}<button onClick={() => setToast('')}><X size={14}/></button></div>}
  </div>;

}

function PageHeader({ title, subtitle, icon: Icon, action }) {
  return <div className="page-heading"><div className="heading-title"><div className="heading-icon"><Icon size={21} /></div><div><div className="eyebrow">AIOF WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div></div>{action && <div className="heading-actions">{action}</div>}</div>;
}
function EmptyState({ icon: Icon, title, subtitle }) {
  return <div className="empty-state tall"><div className="empty-icon"><Icon size={24} /></div><strong>{title}</strong><span>{subtitle}</span></div>;
}
function PanelIcon() { return <MoreHorizontal size={16} />; }
function MinusIcon() { return <span className="minus-icon">−</span>; }

createRoot(document.getElementById('root')).render(<App />);
