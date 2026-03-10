import { PRESET_ALL_MATCH_TOPICS } from './presetAllMatchTopics.js';
import { PRESET_ALL_MATCH_TOPICS_CUSTOM } from './presetAllMatchTopicsCustom.js';

export { PRESET_ALL_MATCH_TOPICS } from './presetAllMatchTopics.js';
export { PRESET_ALL_MATCH_TOPICS_CUSTOM } from './presetAllMatchTopicsCustom.js';

export const ALL_MATCH_TOPICS = Array.from(
	new Set([...PRESET_ALL_MATCH_TOPICS, ...PRESET_ALL_MATCH_TOPICS_CUSTOM]),
);
