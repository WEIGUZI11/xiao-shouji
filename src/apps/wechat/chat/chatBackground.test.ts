import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chatSource = readFileSync(new URL('./ChatScreen.tsx', import.meta.url), 'utf8');
const contactsSource = readFileSync(new URL('../../contacts/ContactsScreen.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../../index.css', import.meta.url), 'utf8');

assert.match(chatSource, /directCharacter\?\.chatBackgroundImage/, 'chat screen should read the active character background');
assert.match(chatSource, /<PersistentImage src=\{chatBackgroundImage\}/, 'chat screen should resolve persistent image references');
assert.match(chatSource, /微信和 QQ 私聊共用，不影响其他角色/, 'chat info should explain the shared per-character background scope');
assert.match(chatSource, /updateCharacter\(directCharacter\.id, \{ chatBackgroundImage: reference \}\)/, 'chat info should save the background for the active private-chat character');
assert.match(chatSource, /updateCharacter\(directCharacter\.id, \{ chatBackgroundImage: undefined \}\)/, 'chat info should restore the active private-chat character background');
assert.match(chatSource, /accept=\{customImageAccept\}/, 'chat info should accept the supported local image types');
assert.match(chatSource, /has-custom-chat-background/, 'chat screen should expose a custom background state class');
assert.match(cssSource, /\.has-custom-chat-background :is\(\.wechat-message-list, \.qq-message-list\)/, 'custom background should cover both WeChat and QQ message lists');
assert.match(cssSource, /background: transparent !important/, 'message list theme background should yield to the custom image');
assert.match(contactsSource, /updateCharacter\(character\.id, \{ chatBackgroundImage: reference \}\)/, 'character profile should persist its own background reference');
assert.match(contactsSource, /不影响其他角色/, 'character profile should explain the per-character scope');
assert.match(contactsSource, /updateCharacter\(character\.id, \{ chatBackgroundImage: undefined \}\)/, 'character profile should restore only the active character background');

console.log('per-character chat background wiring ok');
