import {
  PRESET_NG_WORD_BATTLE_TOPICS,
  PRESET_NG_WORDS,
} from './presetNgWordTopics.js';
import {
  PRESET_NG_WORD_BATTLE_TOPICS_CUSTOM,
  PRESET_NG_WORDS_CUSTOM,
} from './presetNgWordTopicsCustom.js';

export { PRESET_NG_WORD_BATTLE_TOPICS, PRESET_NG_WORDS } from './presetNgWordTopics.js';
export {
  PRESET_NG_WORD_BATTLE_TOPICS_CUSTOM,
  PRESET_NG_WORDS_CUSTOM,
} from './presetNgWordTopicsCustom.js';

// 要件: 1人あたりNGワードは3つ
export const NG_WORDS_PER_PLAYER = 3;

export const NG_WORD_BATTLE_TOPICS = Array.from(
  new Set([...PRESET_NG_WORD_BATTLE_TOPICS, ...PRESET_NG_WORD_BATTLE_TOPICS_CUSTOM]),
);

export const NG_WORDS = Array.from(
  new Set([...PRESET_NG_WORDS, ...PRESET_NG_WORDS_CUSTOM]),
);
