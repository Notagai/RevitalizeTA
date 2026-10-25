import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAppearance, parseAppearance, parseTheme, Preferences } from '../src/core/preferences.ts';

test('theme defaults to system and validates saved preferences', () => {
  assert.equal(parseTheme(null), 'system');
  for (const theme of ['system', 'light', 'dark']) assert.equal(parseTheme(JSON.stringify({ version: 1, theme })), theme);
  for (const raw of ['{}', '{', 'null', '{"version":2,"theme":"dark"}', '{"version":1,"theme":"blue"}']) assert.throws(() => parseTheme(raw));
});

test('saved colors migrate from old preferences, validate, and survive a restart', async () => {
  assert.deepEqual(parseAppearance(null), defaultAppearance);
  assert.deepEqual(parseAppearance('{"version":1,"theme":"dark"}'), { ...defaultAppearance, theme: 'dark' });
  const appearance = { theme: 'light', mainColor: '#205D91', accentColor: '#8FD5EF' };
  let saved = null;
  const storage = { read: async () => saved, write: async (_, value) => { saved = value; }, remove: async () => {} };
  await new Preferences(storage).saveAppearance(appearance);
  assert.deepEqual(await new Preferences(storage).loadAppearance(), appearance);
  for (const mainColor of ['red', '#1', '', null, 42]) assert.throws(() => parseAppearance(JSON.stringify({ version: 2, ...appearance, mainColor })));
  assert.throws(() => parseAppearance(JSON.stringify({ version: 2, ...appearance, accentColor: 'invalid' })));
});

test('rapid theme and color selections persist the final complete palette', async () => {
  let saved = null;
  const storage = { read: async () => saved, write: async (_, value) => { await new Promise(resolve => setTimeout(resolve, 5)); saved = value; }, remove: async () => {} };
  const preferences = new Preferences(storage);
  const final = { theme: 'dark', mainColor: '#754679', accentColor: '#E7B7E2' };
  await Promise.all([preferences.saveAppearance(defaultAppearance), preferences.saveAppearance(final)]);
  assert.deepEqual(await preferences.loadAppearance(), final);
});

test('legacy glass preferences migrate to solid surfaces without losing colors', async () => {
  const old = { version: 2, theme: 'dark', mainColor: '#006B57', accentColor: '#88DEC1' };
  assert.equal('liquidGlass' in parseAppearance(JSON.stringify(old)), false);
  let saved = null;
  const storage = { read: async () => saved, write: async (_, value) => { saved = value; }, remove: async () => {} };
  for (const liquidGlass of [true, false]) {
    const preference = { ...defaultAppearance, liquidGlass };
    await new Preferences(storage).saveAppearance(preference);
    assert.deepEqual(await new Preferences(storage).loadAppearance(), defaultAppearance);
    assert.equal(JSON.parse(saved).version, 4);
    assert.equal('liquidGlass' in JSON.parse(saved), false);
  }
  for (const liquidGlass of [null, 'true', 1, undefined]) assert.throws(() => parseAppearance(JSON.stringify({ ...old, version: 3, liquidGlass })));
});
test('preference writes remain ordered and recover from failed writes', async () => {
  let value = null; let fail = true;
  const storage = { read: async () => value, remove: async () => {}, write: async (_, next) => { if (fail) { fail = false; throw new Error('unavailable'); } value = next; } };
  const preferences = new Preferences(storage);
  const first = preferences.save('dark'); const second = preferences.save('light');
  await assert.rejects(first); await second;
  assert.equal(await preferences.load(), 'light');
});

test('privacy mode persists independently and rejects corrupt settings', async () => {
  const entries = new Map();
  const storage = {
    read: async key => entries.get(key) ?? null,
    write: async (key, value) => { entries.set(key, value); },
    remove: async key => { entries.delete(key); },
  };
  assert.equal(await new Preferences(storage).loadPrivacyMode(), false);
  await new Preferences(storage).savePrivacyMode(true);
  assert.equal(await new Preferences(storage).loadPrivacyMode(), true);
  await new Preferences(storage).savePrivacyMode(false);
  assert.equal(await new Preferences(storage).loadPrivacyMode(), false);
  entries.set('privacy-mode.json', '{"unexpected":"value"}');
  await assert.rejects(new Preferences(storage).loadPrivacyMode());
});

test('rapid privacy toggles persist the latest choice even with delayed writes', async () => {
  let saved = null;
  const storage = {
    read: async () => saved,
    write: async (_key, value) => {
      await new Promise(resolve => setTimeout(resolve, value === 'true' ? 15 : 1));
      saved = value;
    },
    remove: async () => {},
  };
  const preferences = new Preferences(storage);
  await Promise.all([preferences.savePrivacyMode(true), preferences.savePrivacyMode(false)]);
  assert.equal(await new Preferences(storage).loadPrivacyMode(), false);
  await preferences.savePrivacyMode(true);
  assert.equal(await new Preferences(storage).loadPrivacyMode(), true);
});

test('privacy settings recover when a prior write fails', async () => {
  let saved = null, first = true;
  const storage = {
    read: async () => saved,
    write: async (_key, value) => {
      if (first) { first = false; throw new Error('synthetic disk failure'); }
      saved = value;
    },
    remove: async () => {},
  };
  const preferences = new Preferences(storage);
  const failed = preferences.savePrivacyMode(true);
  const recovered = preferences.savePrivacyMode(false);
  await assert.rejects(failed);
  await recovered;
  assert.equal(await preferences.loadPrivacyMode(), false);
});
