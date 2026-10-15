import { beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  windows: [] as Array<Record<string, unknown>>,
  options: [] as Array<Record<string, unknown>>,
  ready: true,
}));
vi.mock('./remote-workspace.ts', async (original) => ({
  ...(await original<typeof import('./remote-workspace.ts')>()),
  verifyRemoteWorkspace: async () => {
    if (!state.ready) throw new Error('not ready');
  },
}));
vi.mock('electron', () => ({
  BrowserWindow: class {
    static getFocusedWindow() {
      return null;
    }
    events = new Map<string, (...args: unknown[]) => void>();
    webContents = {
      session: { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() },
      setWindowOpenHandler: vi.fn(),
      on: vi.fn((name: string, fn: (...args: unknown[]) => void) => {
        this.events.set(name, fn);
      }),
    };
    loadURL = vi.fn(async () => {});
    show = vi.fn();
    focus = vi.fn();
    destroy = vi.fn();
    isDestroyed = () => false;
    on = vi.fn((name: string, fn: (...args: unknown[]) => void) => {
      this.events.set(name, fn);
    });
    constructor(options: Record<string, unknown>) {
      state.options.push(options);
      state.windows.push(this);
    }
  },
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() },
}));

import { openRemoteWorkspaceWindow } from './remote-workspace-window.ts';

describe('remote windows', () => {
  beforeEach(() => {
    state.ready = true;
  });
  test('remote content has persistent storage and no local preload or Node access', async () => {
    await openRemoteWorkspaceWindow('https://remote-window.example.com', vi.fn());
    expect(state.options.at(-1)?.webPreferences).toMatchObject({
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    });
    expect(state.options.at(-1)?.webPreferences).not.toHaveProperty('preload');
    const options = state.options.at(-1)?.webPreferences as { partition: string };
    expect(options.partition.startsWith('persist:')).toBe(true);
    const contents = state.windows.at(-1)?.webContents as {
      setWindowOpenHandler: ReturnType<typeof vi.fn>;
    };
    const handler = contents.setWindowOpenHandler.mock.calls.at(-1)?.[0] as (details: {
      url: string;
    }) => {
      action: string;
      overrideBrowserWindowOptions?: { webPreferences: Record<string, unknown> };
    };
    expect(handler({ url: 'https://remote-window.example.com/reports/index.html' }).action).toBe(
      'allow',
    );
    expect(handler({ url: 'https://outside.example.com' }).action).toBe('deny');
    expect(handler({ url: 'file:///etc/passwd' }).action).toBe('deny');
    expect(
      handler({ url: 'https://remote-window.example.com/reports/index.html' })
        .overrideBrowserWindowOptions?.webPreferences.nodeIntegration,
    ).toBe(false);
    const count = state.windows.length;
    await openRemoteWorkspaceWindow('https://remote-window.example.com', vi.fn());
    expect(state.windows.length).toBe(count);
  });
  test('refuses to create a window when the server is not ready', async () => {
    state.ready = false;
    const count = state.windows.length;
    await expect(
      openRemoteWorkspaceWindow('https://unready.example.com', vi.fn()),
    ).rejects.toThrow();
    expect(state.windows.length).toBe(count);
  });
});
