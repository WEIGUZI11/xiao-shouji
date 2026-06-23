import type { Character } from './store';

export const REMOVED_DEFAULT_CHARACTER_IDS = [
  'default-char-luoxiao',
  'default-char-shenyan',
  'default-char-qinghe',
] as const;

const removedDefaultCharacterIdSet = new Set<string>(REMOVED_DEFAULT_CHARACTER_IDS);

export function stripRemovedDefaultCharacters(characters: Character[] | undefined) {
  return (Array.isArray(characters) ? characters : []).filter((character) => !removedDefaultCharacterIdSet.has(character.id));
}
