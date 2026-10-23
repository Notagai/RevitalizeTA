import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, createPalette, DEFAULT_MAIN, DEFAULT_ACCENT, normalizeHex } from '../src/core/palette.ts';

test('hex seeds normalize shorthand and reject invalid input', () => {
  assert.equal(normalizeHex(' #0aF '), '#00AAFF');
  assert.equal(normalizeHex('006b57'), DEFAULT_MAIN);
  for (const value of ['', '#12', 'red', '#12345678', '#gggggg']) assert.equal(normalizeHex(value), null);
  assert.deepEqual(createPalette('invalid', 'invalid', false), createPalette(DEFAULT_MAIN, DEFAULT_ACCENT, false));
});

test('custom palettes keep labels and chart bars readable across light and dark surfaces', () => {
  const seeds = [DEFAULT_MAIN, DEFAULT_ACCENT, '#FFFFFF', '#000000', '#FF0000', '#FFFF00', '#0000FF', '#777777', '#F5F7F5'];
  for (const dark of [false, true]) for (const main of seeds) for (const accent of seeds) {
    const p = createPalette(main, accent, dark);
    for (const foreground of [p.text, p.muted, p.accent, p.secondary, p.danger]) {
      for (const surface of [p.card, p.background, p.tint]) assert.ok(contrast(foreground, surface) >= 4.5, `${main}/${accent}, dark=${dark}: ${foreground} on ${surface}`);
    }
    assert.ok(contrast(p.onHero, p.hero) >= 4.5);
    assert.ok(contrast(p.heroMuted, p.hero) >= 4.5);
    assert.ok(contrast(p.heroAccent, p.hero) >= 3);
    assert.ok(contrast(p.bar, p.track) >= 3);
  }
});
