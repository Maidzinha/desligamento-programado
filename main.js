const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const ICON = path.join(__dirname, 'icon.png');
const CFG = () => path.join(app.getPath('userData'), 'config.json');
const DEFAULTS = {
  action: 'shutdown', force: false, warn: true,
  startWithWindows: false, minimizeToTray: false, alwaysOnTop: false,
  target: 0, pendingAction: null
};
let cfg = { ...DEFAULTS };
let win, tray, timer, warnTimer, quitting = false;

function load() { try { cfg = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CFG(), 'utf8')) }; } catch {} }
function save() { try { fs.writeFileSync(CFG(), JSON.stringify(cfg, null, 2)); } catch {} }
const run = (cmd, args) => execFile(cmd, args, { windowsHide: true }, () => {});

function execAction(action, force) {
  if (process.platform !== 'win32') { console.log('[simulado] ação:', action); return; }
  switch (action) {
    case 'shutdown': run('shutdown', ['/s', ...(force ? ['/f'] : []), '/t', '0']); break;
    case 'restart':  run('shutdown', ['/r', ...(force ? ['/f'] : []), '/t', '0']); break;
    case 'logoff':   run('shutdown', ['/l', ...(force ? ['/f'] : [])]); break;
    case 'hibernate':run('shutdown', ['/h']); break;
    case 'sleep':    run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']); break;
  }
}

function clearTimers() { clearTimeout(timer); clearTimeout(warnTimer); timer = warnTimer = null; }

function schedule(seconds, action, force) {
  clearTimers();
  if (process.platform === 'win32') run('shutdown', ['/a']); // limpa agendamento nativo anterior
  cfg.target = Date.now() + seconds * 1000;
  cfg.pendingAction = action;
  save(); arm(); updateTray();
}

function arm() {
  clearTimers();
  if (!cfg.target) return;
  const ms = cfg.target - Date.now();
  if (ms <= 0) { fire(); return; }
  // Para desligar/reiniciar também agenda no Windows (continua valendo se o app for fechado)
  if (process.platform === 'win32' && (cfg.pendingAction === 'shutdown' || cfg.pendingAction === 'restart')) {
    run('shutdown', [cfg.pendingAction === 'shutdown' ? '/s' : '/r', ...(cfg.force ? ['/f'] : []), '/t', String(Math.ceil(ms / 1000))]);
  }
  timer = setTimeout(fire, ms);
  if (cfg.warn && ms > 60000) {
    warnTimer = setTimeout(() => {
      if (Notification.isSupported())
        new Notification({ title: 'Desligamento Programado', body: 'Falta 1 minuto para a ação programada.', icon: ICON }).show();
    }, ms - 60000);
  }
}

function fire() {
  const a = cfg.pendingAction, f = cfg.force;
  cfg.target = 0; cfg.pendingAction = null; save(); clearTimers(); updateTray();
  execAction(a, f);
  win && win.webContents.send('status', status());
}

function cancel() {
  clearTimers();
  if (process.platform === 'win32') run('shutdown', ['/a']);
  cfg.target = 0; cfg.pendingAction = null; save(); updateTray();
}

const status = () => ({ target: cfg.target, action: cfg.pendingAction, now: Date.now() });

function applyStartup() {
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!cfg.startWithWindows });
}

function updateTray() {
  if (!tray) return;
  tray.setToolTip(cfg.target ? 'Desligamento Programado — ativo' : 'Desligamento Programado');
}
function ensureTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: () => { win.show(); win.focus(); } },
    { label: 'Cancelar desligamento', click: () => { cancel(); win.webContents.send('status', status()); } },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', () => { win.show(); win.focus(); });
  updateTray();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100, height: 760, minWidth: 940, minHeight: 700,
    frame: false, backgroundColor: '#0c0a07', icon: ICON,
    alwaysOnTop: !!cfg.alwaysOnTop, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.setMenu(null);
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
  win.on('close', (e) => {
    if (!quitting && cfg.minimizeToTray) { e.preventDefault(); ensureTray(); win.hide(); }
  });
  win.on('maximize', () => win.webContents.send('maxed', true));
  win.on('unmaximize', () => win.webContents.send('maxed', false));
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    load(); applyStartup(); createWindow(); arm();
    if (cfg.minimizeToTray) ensureTray();
  });
}
app.on('window-all-closed', () => { if (!cfg.minimizeToTray || quitting) app.quit(); });

ipcMain.handle('get', () => ({ cfg, status: status(), version: app.getVersion() }));
ipcMain.handle('start', (_, seconds) => { schedule(seconds, cfg.action, cfg.force); return status(); });
ipcMain.handle('cancel', () => { cancel(); return status(); });
ipcMain.handle('set', (_, patch) => {
  cfg = { ...cfg, ...patch }; save(); applyStartup();
  if ('alwaysOnTop' in patch) win.setAlwaysOnTop(!!patch.alwaysOnTop);
  if ('minimizeToTray' in patch && patch.minimizeToTray) ensureTray();
  if (cfg.target && ('warn' in patch || 'force' in patch)) arm();
  return cfg;
});
ipcMain.on('win', (_, a) => {
  if (a === 'min') win.minimize();
  if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  if (a === 'close') win.close();
});
