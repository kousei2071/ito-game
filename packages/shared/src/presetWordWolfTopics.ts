export interface WordWolfPresetTopic {
  majorityWord: string;
  minorityWord: string;
}

export const PRESET_WORD_WOLF_TOPICS: WordWolfPresetTopic[] = [
  { majorityWord: '犬', minorityWord: '狼' },
  { majorityWord: '海', minorityWord: '川' },
  { majorityWord: '映画', minorityWord: 'ドラマ' },
  { majorityWord: '寿司', minorityWord: '刺身' },
  { majorityWord: 'スマホ', minorityWord: 'タブレット' },
  { majorityWord: '自転車', minorityWord: 'バイク' },
  { majorityWord: '夏', minorityWord: '冬' },
  { majorityWord: 'カレー', minorityWord: 'シチュー' },
  { majorityWord: 'サッカー', minorityWord: '野球' },
  { majorityWord: '紅茶', minorityWord: 'コーヒー' },
];
