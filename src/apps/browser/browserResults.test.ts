import assert from 'node:assert/strict';
import { parseBrowserResults } from './browserResults';

const result = { title: '文章', url: 'https://example.org/article', snippet: '内容' };
const payload = { summary: '摘要', results: [result] };
assert.deepEqual(parseBrowserResults(JSON.stringify(payload)), payload);
assert.deepEqual(parseBrowserResults('```json\n' + JSON.stringify(payload) + '\n```'), payload);
for (const value of [null, {}, { ...payload, summary: {} }, { ...payload, results: [] },
  { ...payload, results: [{ ...result, url: {} }] },
  { ...payload, results: [{ ...result, title: [] }] },
  { ...payload, results: [{ ...result, url: 'javascript:alert(1)' }] },
  { ...payload, results: [{ ...result, snippet: '  ' }] }]) {
  assert.throws(() => parseBrowserResults(JSON.stringify(value)));
}
assert.deepEqual(parseBrowserResults(JSON.stringify({ ...payload, results: [null, { title: 1 }, result] })), payload);
assert.equal(parseBrowserResults(JSON.stringify({ ...payload, results: Array(8).fill(result) })).results.length, 5);
console.log('browser model results reject malformed fields and retain valid entries');
