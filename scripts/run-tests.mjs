import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requestedFilter = process.argv.slice(2).join(' ').toLowerCase();

function collectTests(directory, matcher) {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...collectTests(absolute, matcher));
    else if (matcher.test(entry.name)) output.push(absolute);
  }
  return output;
}

const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const frontendTests = collectTests(join(root, 'src'), /\.test\.tsx?$/i)
  .map((file) => ({ command: process.execPath, args: [tsxCli, file], file }));
const serverTests = collectTests(join(root, 'server'), /\.test\.cjs$/i)
  .map((file) => ({ command: process.execPath, args: [file], file }));
const tests = [...frontendTests, ...serverTests]
  .filter(({ file }) => !requestedFilter || relative(root, file).toLowerCase().includes(requestedFilter))
  .sort((a, b) => a.file.localeCompare(b.file));

if (!tests.length) {
  console.error(requestedFilter ? `没有找到匹配“${requestedFilter}”的测试。` : '没有找到测试文件。');
  process.exit(1);
}

const failures = [];
for (const { command, args, file } of tests) {
  const label = relative(root, file);
  console.log(`\n[TEST] ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failures.push(label);
}

if (failures.length) {
  console.error(`\n${failures.length} 个测试失败：\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`\n全部 ${tests.length} 个测试通过。`);
