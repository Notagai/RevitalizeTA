import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTheme, Preferences } from '../src/core/preferences.ts';

test('theme defaults to system and validates saved preferences', () => {
  assert.equal(parseTheme(null), 'system');
  for (const theme of ['system', 'light', 'dark']) assert.equal(parseTheme(JSON.stringify({ version: 1, theme })), theme);
  for (const raw of ['{}', '{', 'null', '{"version":2,"theme":"dark"}', '{"version":1,"theme":"blue"}']) assert.throws(() => parseTheme(raw));
});
test('preference writes remain ordered and recover from failed writes', async () => {
  let value = null; let fail = true;
  const storage = { read: async () => value, remove: async () => {}, write: async (_, next) => { if (fail) { fail = false; throw new Error('unavailable'); } value = next; } };
  const preferences = new Preferences(storage);
  const first = preferences.save('dark'); const second = preferences.save('light');
  await assert.rejects(first); await second;
  assert.equal(await preferences.load(), 'light');
});
