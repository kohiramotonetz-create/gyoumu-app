const FULL_WIDTH_SPACE = '\u3000';

export const normalizeNameKana = value => String(value || '')
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, FULL_WIDTH_SPACE)
  .replace(/[ぁ-ゖ]/g, character => String.fromCharCode(character.charCodeAt(0) + 0x60));

export const isValidNameKana = value => /^[ァ-ヶー・\u3000]+$/.test(normalizeNameKana(value));
