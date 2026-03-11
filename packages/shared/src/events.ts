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
  RANKING_SUBMIT_SELF_RANK: 'ranking:submitSelfRank',
  RANKING_REVEAL_NEXT: 'ranking:revealNext',
  DRAWGUESS_STROKE:     'drawguess:stroke',
  DRAWGUESS_UNDO:       'drawguess:undo',
  DRAWGUESS_REDO:       'drawguess:redo',
  DRAWGUESS_CLEAR:      'drawguess:clear',
  DRAWGUESS_GUESS:      'drawguess:guess',
  ROUND_SET_TOPIC:      'round:setTopic',
  ROUND_SUBMIT_CLUE:    'round:submitClue',
  ROUND_ARRANGE:        'round:arrange',
  ROUND_CONFIRM:        'round:confirmArrange',
  ALL_MATCH_JUDGE:      'allmatch:judge',
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
  DRAWGUESS_STROKE:     'drawguess:stroke',
  DRAWGUESS_UNDO:       'drawguess:undo',
  DRAWGUESS_REDO:       'drawguess:redo',
  DRAWGUESS_CLEAR:      'drawguess:clear',
  DRAWGUESS_CORRECT:    'drawguess:correct',
  DRAWGUESS_TIME_UPDATE:'drawguess:timeUpdate',
  ROOM_CLOSED:          'room:closed',
  ERROR:                'error:message',
  NOTICE:               'notice:message',
} as const;

// ============================================================
// Event Payloads
// ============================================================

// Client -> Server payloads
export interface C2SPayloads {
  [C2S.ROOM_CREATE]: { playerName: string; playerIconId: import('./types.js').PlayerIconId };
  [C2S.ROOM_JOIN]:   { roomId: string; playerName: string; playerIconId: import('./types.js').PlayerIconId };
  [C2S.ROOM_LEAVE]:  {};
  [C2S.ROOM_READY]:  {};
  [C2S.ROOM_UPDATE_SETTINGS]: {
    totalRounds: number;
    topicChooserMode: import('./types.js').TopicChooserMode;
    wordWolfTalkSeconds: number;
    wordWolfCountMode: import('./types.js').WordWolfCountMode;
    drawGuessTimeLimit: import('./types.js').DrawGuessTimeLimit;
    drawGuessDifficulty: import('./types.js').DrawGuessDifficulty;
  };
  [C2S.GAME_START]:  {};
  [C2S.GAME_SELECT]: { game: import('./types.js').GameType };
  [C2S.GAME_RETURN_TO_SELECT]: {};
  [C2S.WORDWOLF_START_TALK]: {};
  [C2S.WORDWOLF_START_VOTE]: {};
  [C2S.WORDWOLF_SUBMIT_VOTE]: { targetPlayerId: string };
  [C2S.WORDWOLF_REQUEST_EXAMPLE_TALK]: {};
  [C2S.RANKING_SUBMIT_SELF_RANK]: { rank: number };
  [C2S.RANKING_REVEAL_NEXT]: {};
  [C2S.DRAWGUESS_STROKE]: { stroke: import('./types.js').DrawGuessStroke };
  [C2S.DRAWGUESS_UNDO]: {};
  [C2S.DRAWGUESS_REDO]: {};
  [C2S.DRAWGUESS_CLEAR]: {};
  [C2S.DRAWGUESS_GUESS]: { guess: string };
  [C2S.ROUND_SET_TOPIC]: { topic?: string; mode: 'random' | 'custom'; finalize: boolean };
  [C2S.ROUND_SUBMIT_CLUE]: { clue: string };
  [C2S.ROUND_ARRANGE]: { order: string[] };         // プレイヤーID[]
  [C2S.ROUND_CONFIRM]: { order: string[] };
  [C2S.ALL_MATCH_JUDGE]: { isCorrect: boolean };
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
  [S2C.DRAWGUESS_STROKE]: { stroke: import('./types.js').DrawGuessStroke };
  [S2C.DRAWGUESS_UNDO]: {};
  [S2C.DRAWGUESS_REDO]: {};
  [S2C.DRAWGUESS_CLEAR]: {};
  [S2C.DRAWGUESS_CORRECT]: { playerId: string; playerName: string; points: number };
  [S2C.DRAWGUESS_TIME_UPDATE]: { timeLeft: number };
  [S2C.ROOM_CLOSED]: { message: string };
  [S2C.ERROR]: { message: string };
  [S2C.NOTICE]: { message: string };
}
