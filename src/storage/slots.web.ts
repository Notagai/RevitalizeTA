import type { SlotStorage } from '../core/cache';

const prefix = 'revitalizeta.synthetic.v1.';
export const slots: SlotStorage = {
  async read(key) { return typeof localStorage === 'undefined' ? null : localStorage.getItem(prefix + key); },
  async write(key, value) { localStorage.setItem(prefix + key, value); },
  async remove(key) { localStorage.removeItem(prefix + key); },
};
