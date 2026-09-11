import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
const sharedSource = readFileSync(join(process.cwd(), 'src', 'apps', 'shared', 'aiText.ts'), 'utf8');

assert.match(
  source,
  /import \{ requestChatCompletion, requestChatCompletionStream \} from '\.\/apps\/shared\/aiText';/,
  'App chat request paths should use the shared completion implementation',
);

assert.match(
  sharedSource,
  /extractAssistantContent/,
  'shared chat request paths should reuse extractAssistantContent for DeepSeek/DV4 reasoning_content fallback',
);

assert.doesNotMatch(
  sharedSource,
  /choices\?\.\[0\]\?\.message\?\.content\s*\|\|\s*''/,
  'App chat request paths must not only read message.content because DeepSeek/DV4 may return reasoning_content',
);

console.log('app deepseek response parsing ok');
