import { createHash } from 'node:crypto';

export function remoteWorkspaceOrigin(input: unknown): string {
  if (typeof input !== 'string' || input.length > 2048) {
    throw new Error('Enter the HTTPS address of an existing OpenKnowledge server.');
  }
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a valid HTTPS server address.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'Use an HTTPS origin without credentials, paths, query parameters, or fragments.',
    );
  }
  return url.origin;
}

export function remoteWorkspacePartition(origin: string): string {
  return `persist:remote-workspace-${createHash('sha256').update(origin).digest('hex')}`;
}

export function isRemoteWorkspaceNavigation(origin: string, target: string): boolean {
  try {
    const url = new URL(target);
    return url.origin === origin && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function verifyRemoteWorkspace(
  origin: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request(`${origin}/readyz`, {
    signal: AbortSignal.timeout(10_000),
    redirect: 'error',
    credentials: 'omit',
  });
  if (!response.ok)
    throw new Error('The server is not ready. Check its address and private-network connection.');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('ready' in body) || body.ready !== true) {
    throw new Error('The address did not return OpenKnowledge readiness.');
  }
}
