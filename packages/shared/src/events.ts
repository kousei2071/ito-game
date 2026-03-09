// ============================================================
// Socket Event Names
// ============================================================

// Client -> Server
export const C2S = {
  ROOM_CREATE:          'room:create',
  ROOM_JOIN:            'room:join',
  ROOM_LEAVE:           'room:leave',
  ROOM_READY:           'room:ready',
  ROOM_UPDATE_SETTINGS: 'room:updateSettings',
  GAME_START:           'game:start',
  GAME_SELECT:          'game:select',
  GAME_RETURN_TO_SELECT:'game:returnToSelect',
  WORDWOLF_START_TALK:  'wordwolf:startTalk',
  WORDWOLF_START_VOTE:  'wordwolf:startVote',
  WORDWOLF_SUBMIT_VOTE: 'wordwolf:submitVote',
  WORDWOLF_REQUEST_EXAMPLE_TALK: 'wordwolf:requestExampleTalk',
  ROUND_SET_TOPIC:      'round:setTopic',
  ROUND_SUBMIT_CLUE:    'round:submitClue',
  ROUND_ARRANGE:        'round:arrange',
  ROUND_CONFIRM:        'round:confirmArrange',
  ROUND_NEXT:           'round:next',
} as const;

// Server -> Client
export const S2C = {
  ROOM_UPDATED:         'room:updated',
  GAME_STATE_CHANGED:   'game:stateChanged',
  ROUND_STARTED:        'round:started',
  ROUND_CLUES_COLLECTED:'round:cluesCollected',
  ROUND_RESULT:         'round:result',
  GAME_FINISHED:        'game:finished',
  YOUR_NUMBER:          'round:yourNumber',
  YOUR_WORD:            'wordwolf:yourWord',
  WORDWOLF_EXAMPLE_TALK:'wordwolf:exampleTalk',
  ROOM_CLOSED:          'room:closed',
  ERROR:                'error:message',
  NOTICE:               'notice:message',
} as const;

// ============================================================
// Event Payloads
// ============================================================

// Client -> Server payloads
export interface C2SPayloads {
  [C2S.ROOM_CREATE]: { playerName: string };
  [C2S.ROOM_JOIN]:   { roomId: string; playerName: string };
  [C2S.ROOM_LEAVE]:  {};
  [C2S.ROOM_READY]:  {};
  [C2S.ROOM_UPDATE_SETTINGS]: {
    totalRounds: number;
    topicChooserMode: import('./types.js').TopicChooserMode;
    wordWolfTalkSeconds: number;
    wordWolfCountMode: import('./types.js').WordWolfCountMode;
  };
  [C2S.GAME_START]:  {};
  [C2S.GAME_SELECT]: { game: import('./types.js').GameType };
  [C2S.GAME_RETURN_TO_SELECT]: {};
  [C2S.WORDWOLF_START_TALK]: {};
  [C2S.WORDWOLF_START_VOTE]: {};
  [C2S.WORDWOLF_SUBMIT_VOTE]: { targetPlayerId: string };
  [C2S.WORDWOLF_REQUEST_EXAMPLE_TALK]: {};
  [C2S.ROUND_SET_TOPIC]: { topic?: string; mode: 'random' | 'custom'; finalize: boolean };
  [C2S.ROUND_SUBMIT_CLUE]: { clue: string };
  [C2S.ROUND_ARRANGE]: { order: string[] };         // プレイヤーID[]
  [C2S.ROUND_CONFIRM]: { order: string[] };
  [C2S.ROUND_NEXT]:  {};
}

// Server -> Client payloads
export interface S2CPayloads {
  [S2C.ROOM_UPDATED]: import('./types.js').PublicGameState;
  [S2C.GAME_STATE_CHANGED]: import('./types.js').PublicGameState;
  [S2C.ROUND_STARTED]: { roundNumber: number; topic: string };
  [S2C.ROUND_CLUES_COLLECTED]: { clues: { playerId: string; playerName: string; clue: string }[] };
  [S2C.ROUND_RESULT]: import('./types.js').RoundResult;
  [S2C.GAME_FINISHED]: { score: number; totalRounds: number; roundResults: import('./types.js').RoundResult[] };
  [S2C.YOUR_NUMBER]: { secretNumber: number };
  [S2C.YOUR_WORD]: { word: string };
  [S2C.WORDWOLF_EXAMPLE_TALK]: { title: string; lines: string[] };
  [S2C.ROOM_CLOSED]: { message: string };
  [S2C.ERROR]: { message: string };
  [S2C.NOTICE]: { message: string };
}
