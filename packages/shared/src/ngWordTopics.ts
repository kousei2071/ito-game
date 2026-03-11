import {
  PRESET_NG_WORDS,
} from './presetNgWordTopics.js';
import {
  PRESET_NG_WORDS_CUSTOM,
} from './presetNgWordTopicsCustom.js';

export { PRESET_NG_WORDS } from './presetNgWordTopics.js';
export {
  PRESET_NG_WORDS_CUSTOM,
} from './presetNgWordTopicsCustom.js';

export const NG_WORDS = Array.from(
  new Set([...PRESET_NG_WORDS, ...PRESET_NG_WORDS_CUSTOM]),
);
