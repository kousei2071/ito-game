export interface WordWolfTopicPair {
  majority: string;
  minority: string;
}

export const WORD_WOLF_TOPIC_PAIRS: WordWolfTopicPair[] = [
  { majority: '犬', minority: '狼' },
  { majority: '海', minority: '川' },
  { majority: '映画', minority: 'ドラマ' },
  { majority: '寿司', minority: '刺身' },
  { majority: 'スマホ', minority: 'タブレット' },
  { majority: '自転車', minority: 'バイク' },
  { majority: '夏', minority: '冬' },
  { majority: 'カレー', minority: 'シチュー' },
  { majority: 'サッカー', minority: '野球' },
  { majority: '紅茶', minority: 'コーヒー' },
];
