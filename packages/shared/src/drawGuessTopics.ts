import { PRESET_DRAW_GUESS_TOPICS } from './presetDrawGuessTopics.js';
import { PRESET_DRAW_GUESS_TOPICS_CUSTOM } from './presetDrawGuessTopicsCustom.js';

export { PRESET_DRAW_GUESS_TOPICS } from './presetDrawGuessTopics.js';
export { PRESET_DRAW_GUESS_TOPICS_CUSTOM } from './presetDrawGuessTopicsCustom.js';

// Merge and deduplicate so users can maintain custom topics in a separate file.
export const DRAW_GUESS_TOPICS = Array.from(
	new Set([...PRESET_DRAW_GUESS_TOPICS, ...PRESET_DRAW_GUESS_TOPICS_CUSTOM]),
);

export const DRAW_GUESS_TOPICS_BY_DIFFICULTY: Record<'easy' | 'normal' | 'hard', string[]> = {
	easy: [
		'ねこ', 'いぬ', 'うさぎ', 'くま', 'ぞう', 'きりん', 'さかな', 'とり', 'りんご', 'ばなな',
		'みかん', 'いちご', 'すいか', 'めろん', 'もも', 'ぱん', 'けーき', 'すし', 'おにぎり', 'ぴざ',
		'くるま', 'でんしゃ', 'ひこうき', 'ふね', 'じてんしゃ', 'かさ', 'めがね', 'とけい', 'ほし', 'つき',
	],
	normal: [
		'きょうりゅう', 'ぺんぎん', 'いるか', 'かえる', 'かたつむり', 'ちょうちょ', 'せんぷうき', 'そうじき', 'てれび', 'かめら',
		'ぎたー', 'ぴあの', 'さくら', 'はなび', 'ゆきだるま', 'にじ', 'たいよう', 'おしろ', 'ろけっと', 'おばけ',
		'にんじゃ', 'たいやき', 'たこやき', 'らーめん', 'あいすくりーむ', 'はんばーがー', 'てるてるぼうず', 'ふうせん', 'さかなつり', 'ゆうえんち',
	],
	hard: [
		'ふじさん', 'とうきょうたわー', 'しんかんせん', 'かいぞくせん', 'うちゅうせん', 'すべりだい', 'ぶらんこ', 'じゃんぐるじむ', 'しょうぼうしゃ', 'きゅうきゅうしゃ',
		'ぱとかー', 'しんごうき', 'じはんき', 'えすかれーたー', 'えれべーたー', 'こくばん', 'らんどせる', 'おんせん', 'かみなり', 'たつまき',
		'ゆうやけ', 'あさひ', 'こおり', 'すなば', 'きつね', 'たぬき', 'ふくろう', 'はりねずみ', 'かぶとむし', 'くわがた',
	],
};
