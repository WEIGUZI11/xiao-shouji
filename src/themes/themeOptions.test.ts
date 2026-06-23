import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeOptions } from './themeOptions';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const themeIds = themeOptions.map((theme) => theme.id);
const uniqueThemeIds = new Set(themeIds);
const srcDir = dirname(dirname(fileURLToPath(import.meta.url)));

assert(themeIds.includes('status-terminal'), 'theme options must include the status-terminal theme');
assert(themeIds.includes('alcheris-pixel'), 'theme options must include the alcheris-pixel theme');
assert(uniqueThemeIds.size === themeIds.length, 'theme option ids must be unique');
assert(
  existsSync(join(srcDir, 'themes', 'status-terminal', 'index.css')),
  'status-terminal theme CSS must exist under src/themes/status-terminal',
);
assert(
  existsSync(join(srcDir, 'themes', 'alcheris-pixel', 'index.css')),
  'alcheris-pixel theme CSS must exist under src/themes/alcheris-pixel',
);

console.log('theme options ok');
