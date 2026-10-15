import { I18nProvider } from '@lingui/react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { dynamicActivate } from '@/lib/activate-locale';
import { i18n } from '@/lib/i18n';
import { RemoteWorkspaceDialog } from './RemoteWorkspaceDialog';

afterEach(cleanup);
beforeEach(async () => {
  localStorage.clear();
  await dynamicActivate('en');
});

test('connects the explicitly entered server and exposes pending state', async () => {
  let finish: (() => void) | undefined;
  const connect = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const close = vi.fn();
  render(
    <I18nProvider i18n={i18n}>
      <RemoteWorkspaceDialog open onOpenChange={close} connect={connect} />
    </I18nProvider>,
  );
  const input = screen.getByLabelText('Server HTTPS address');
  fireEvent.change(input, { target: { value: 'https://knowledge.example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Connect', exact: true }));
  expect(connect).toHaveBeenCalledWith('https://knowledge.example.com');
  expect(screen.getByRole('button', { name: 'Connecting' }).hasAttribute('disabled')).toBe(true);
  finish?.();
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  expect(localStorage.getItem('ok-remote-workspace-origin')).toBe('https://knowledge.example.com');
});

test('failed admission stays open and reports an accessible error', async () => {
  const close = vi.fn();
  render(
    <I18nProvider i18n={i18n}>
      <RemoteWorkspaceDialog
        open
        onOpenChange={close}
        connect={async () => {
          throw new Error('fixture');
        }}
      />
    </I18nProvider>,
  );
  fireEvent.change(screen.getByLabelText('Server HTTPS address'), {
    target: { value: 'https://knowledge.example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Connect', exact: true }));
  await screen.findByRole('alert');
  expect(close).not.toHaveBeenCalled();
  expect(localStorage.getItem('ok-remote-workspace-origin')).toBe(null);
});
