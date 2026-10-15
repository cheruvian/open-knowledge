import { BrowserWindow, Menu } from 'electron';
import {
  isRemoteWorkspaceNavigation,
  remoteWorkspaceOrigin,
  remoteWorkspacePartition,
  verifyRemoteWorkspace,
} from './remote-workspace.ts';

const windows = new Map<string, BrowserWindow>();
const remoteWindows = new Set<BrowserWindow>();

export function installRemoteWorkspaceMenu(): boolean {
  const focused = BrowserWindow.getFocusedWindow();
  if (!focused || !remoteWindows.has(focused)) return false;
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
      { label: 'File', submenu: [{ role: 'close' }] },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { role: 'togglefullscreen' },
        ],
      },
      { role: 'windowMenu' },
    ]),
  );
  return true;
}

export async function openRemoteWorkspaceWindow(
  input: unknown,
  refreshMenu: () => void,
): Promise<void> {
  const origin = remoteWorkspaceOrigin(input);
  const existing = windows.get(origin);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return;
  }
  await verifyRemoteWorkspace(origin);
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 420,
    minHeight: 400,
    title: `OpenKnowledge — ${new URL(origin).host}`,
    show: false,
    webPreferences: {
      partition: remoteWorkspacePartition(origin),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      navigateOnDragDrop: false,
    },
  });
  windows.set(origin, win);
  secureRemoteWindow(win, origin, refreshMenu);
  win.on('closed', () => {
    windows.delete(origin);
  });
  try {
    await win.loadURL(`${origin}/`);
    win.show();
    win.focus();
  } catch {
    win.destroy();
    throw new Error(
      'Unable to load the remote workspace. Check the server and private-network connection.',
    );
  }
}

function secureRemoteWindow(win: BrowserWindow, origin: string, refreshMenu: () => void): void {
  remoteWindows.add(win);
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  win.webContents.session.setPermissionCheckHandler(() => false);
  win.webContents.setWindowOpenHandler(({ url }) =>
    isRemoteWorkspaceNavigation(origin, url)
      ? {
          action: 'allow',
          overrideBrowserWindowOptions: {
            webPreferences: {
              partition: remoteWorkspacePartition(origin),
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
              webSecurity: true,
            },
          },
        }
      : { action: 'deny' },
  );
  win.webContents.on('did-create-window', (child) =>
    secureRemoteWindow(child, origin, refreshMenu),
  );
  const guardNavigation = (event: Electron.Event, target: string) => {
    if (!isRemoteWorkspaceNavigation(origin, target)) event.preventDefault();
  };
  win.webContents.on('will-navigate', guardNavigation);
  win.webContents.on('will-redirect', guardNavigation);
  win.on('focus', refreshMenu);
  win.on('closed', () => {
    remoteWindows.delete(win);
    refreshMenu();
  });
}
