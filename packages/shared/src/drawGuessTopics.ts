import { PRESET_DRAW_GUESS_TOPICS } from './presetDrawGuessTopics.js';
import { PRESET_DRAW_GUESS_TOPICS_CUSTOM } from './presetDrawGuessTopicsCustom.js';

export { PRESET_DRAW_GUESS_TOPICS } from './presetDrawGuessTopics.js';
export { PRESET_DRAW_GUESS_TOPICS_CUSTOM } from './presetDrawGuessTopicsCustom.js';

// Merge and deduplicate so users can maintain custom topics in a separate file.
export const DRAW_GUESS_TOPICS = Array.from(
	new Set([...PRESET_DRAW_GUESS_TOPICS, ...PRESET_DRAW_GUESS_TOPICS_CUSTOM]),
);
