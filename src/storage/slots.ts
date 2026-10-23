import { Directory, File, Paths } from 'expo-file-system';
import type { SlotStorage } from '../core/cache';

const directory = () => new Directory(Paths.document, 'synthetic-cache-v1');
export const slots: SlotStorage = {
  async read(key) {
    const file = new File(directory(), key);
    return file.exists ? file.text() : null;
  },
  async write(key, value) {
    const dir = directory();
    dir.create({ idempotent: true, intermediates: true });
    await new File(dir, key).write(value);
  },
  async remove(key) {
    const file = new File(directory(), key);
    if (file.exists) file.delete();
  },
};
