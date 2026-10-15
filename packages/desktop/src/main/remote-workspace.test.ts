import { describe, expect, test, vi } from 'vitest';
import {
  isRemoteWorkspaceNavigation,
  remoteWorkspaceOrigin,
  remoteWorkspacePartition,
  verifyRemoteWorkspace,
} from './remote-workspace.ts';

describe('existing server connections', () => {
  test('normalizes HTTPS origins without accepting credential-bearing addresses', () => {
    expect(remoteWorkspaceOrigin(' https://Knowledge.example.com:443/ ')).toBe(
      'https://knowledge.example.com',
    );
    for (const value of [
      null,
      {},
      'file:///tmp/vault',
      'http://knowledge.example.com',
      'https://user:secret@example.com',
      'https://example.com/path',
      'https://example.com/?token=secret',
      'https://example.com/#secret',
    ]) {
      expect(() => remoteWorkspaceOrigin(value)).toThrow();
    }
  });
  test('retains storage per origin without sharing it between servers', () => {
    const partition = remoteWorkspacePartition('https://one.example.com');
    expect(partition.startsWith('persist:')).toBe(true);
    expect(partition).toBe(remoteWorkspacePartition('https://one.example.com'));
    expect(partition).not.toBe(remoteWorkspacePartition('https://two.example.com'));
  });
  test('keeps top-level navigation inside the selected server', () => {
    const origin = 'https://knowledge.example.com';
    expect(isRemoteWorkspaceNavigation(origin, `${origin}/#/Knowledge/note`)).toBe(true);
    for (const target of [
      'https://elsewhere.example.com',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'https://user:secret@knowledge.example.com',
    ]) {
      expect(isRemoteWorkspaceNavigation(origin, target)).toBe(false);
    }
  });
  test('requires readiness and refuses redirect-based admission', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ready: true })));
    await verifyRemoteWorkspace('https://knowledge.example.com', request);
    expect(request.mock.calls[0]?.[0]).toBe('https://knowledge.example.com/readyz');
    expect(request.mock.calls[0]?.[1]?.redirect).toBe('error');
    request.mockResolvedValueOnce(new Response(JSON.stringify({ ready: false })));
    await expect(verifyRemoteWorkspace('https://knowledge.example.com', request)).rejects.toThrow();
    request.mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
    await expect(verifyRemoteWorkspace('https://knowledge.example.com', request)).rejects.toThrow();
  });
});
