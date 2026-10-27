import { setupI18n } from '@lingui/core';
import { expect, test } from 'vitest';
import catalog from '../locales/en/messages.json';

test('the compiled navigator catalog renders remote connection labels instead of message IDs', () => {
  const i18n = setupI18n({ locale: 'en', messages: { en: catalog.messages } });

  expect(i18n._('sJ0xcy')).toBe('Connect to server');
  expect(i18n._('1FuMUV')).toBe('Open an existing shared workspace.');
  expect(i18n._('S8yK-j')).toBe('Connect to existing server');
  expect(i18n._('gDk2f9')).toBe('Server HTTPS address');
  expect(i18n._('qKV8vA')).toBe(
    'Open one shared workspace without cloning files or starting another server. Connect only to a server you trust.',
  );
  expect(i18n._('F1xvul')).toBe(
    'The server owns the files and agent configuration. Local terminals and filesystem access are unavailable in this connection.',
  );
});
