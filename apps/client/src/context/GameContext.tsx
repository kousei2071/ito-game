import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { PublicGameState, RoundResult } from '@ito/shared';
import { S2C, C2S } from '@ito/shared';
import { getSocket, SOCKET_URL } from '../socket';

// ============================================================
// State
// ============================================================
interface State {
  connected: boolean;
  gameState: PublicGameState | null;
  myNumber: number | null;
  myWord: string | null;
  lastError: string | null;
  notice: string | null;
  wordWolfExampleTalk: { title: string; lines: string[] } | null;
  roundResult: RoundResult | null;
  finalResult: { score: number; totalRounds: number; roundResults: RoundResult[] } | null;
}

const initialState: State = {
  connected: false,
  gameState: null,
  myNumber: null,
  myWord: null,
  lastError: null,
  notice: null,
  wordWolfExampleTalk: null,
  roundResult: null,
  finalResult: null,
};

type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: PublicGameState }
  | { type: 'SET_MY_NUMBER'; payload: number }
  | { type: 'SET_MY_WORD'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_NOTICE'; payload: string }
  | { type: 'CLEAR_NOTICE' }
  | { type: 'SET_WORDWOLF_EXAMPLE_TALK'; payload: { title: string; lines: string[] } }
  | { type: 'CLEAR_WORDWOLF_EXAMPLE_TALK' }
  | { type: 'SET_ROUND_RESULT'; payload: RoundResult }
  | { type: 'SET_FINAL_RESULT'; payload: { score: number; totalRounds: number; roundResults: RoundResult[] } }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_GAME_STATE':
      return {
        ...state,
        gameState: action.payload,
        lastError: null,
        wordWolfExampleTalk: action.payload.phase === 'wordwolf-talk' ? state.wordWolfExampleTalk : null,
        roundResult:
          action.payload.phase === 'result' || action.payload.phase === 'wordwolf-result'
            ? state.roundResult
            : null,
        finalResult: action.payload.phase === 'finished' ? state.finalResult : null,
      };
    case 'SET_MY_NUMBER':
      return { ...state, myNumber: action.payload, roundResult: null };
    case 'SET_MY_WORD':
      return { ...state, myWord: action.payload, roundResult: null };
    case 'SET_ERROR':
      return { ...state, lastError: action.payload };
    case 'SET_NOTICE':
      return { ...state, notice: action.payload };
    case 'CLEAR_NOTICE':
      return { ...state, notice: null };
    case 'SET_WORDWOLF_EXAMPLE_TALK':
      return { ...state, wordWolfExampleTalk: action.payload };
    case 'CLEAR_WORDWOLF_EXAMPLE_TALK':
      return { ...state, wordWolfExampleTalk: null };
    case 'SET_ROUND_RESULT':
      return { ...state, roundResult: action.payload };
    case 'SET_FINAL_RESULT':
      return { ...state, finalResult: action.payload };
    case 'RESET':
      return { ...initialState, connected: state.connected };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface GameContextValue {
  state: State;
  actions: {
    createRoom: (playerName: string) => void;
    joinRoom: (roomId: string, playerName: string) => void;
    leaveRoom: () => void;
    toggleReady: () => void;
    updateRoomSettings: (settings: {
      totalRounds: number;
      topicChooserMode: 'sequential' | 'random';
      wordWolfTalkSeconds: number;
      wordWolfCountMode: 'auto' | 'one' | 'two';
    }) => void;
    startGame: () => void;
    selectGame: (game: 'ito' | 'word-wolf') => void;
    returnToGameSelect: () => void;
    submitClue: (clue: string) => void;
    confirmArrange: (order: string[]) => void;
    startWordWolfTalk: () => void;
    requestWordWolfExampleTalk: () => void;
    clearWordWolfExampleTalk: () => void;
    startWordWolfVote: () => void;
    submitWordWolfVote: (targetPlayerId: string) => void;
    nextRound: () => void;
    requestRandomTopic: () => void;
    confirmTopic: (topic: string) => void;
  };
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socket = getSocket();

  // ---------- Socket listeners ----------
  useEffect(() => {
    socket.on('connect', () => dispatch({ type: 'SET_CONNECTED', payload: true }));
    socket.on('disconnect', () => dispatch({ type: 'SET_CONNECTED', payload: false }));
    socket.on('connect_error', (err: Error) => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({
        type: 'SET_ERROR',
        payload: `サーバーに接続できません。接続先: ${SOCKET_URL} / 詳細: ${err.message}`,
      });
    });

    socket.on(S2C.ROOM_UPDATED, (gs: PublicGameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gs });
    });
    socket.on(S2C.GAME_STATE_CHANGED, (gs: PublicGameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gs });
    });
    socket.on(S2C.YOUR_NUMBER, ({ secretNumber }: { secretNumber: number }) => {
      dispatch({ type: 'SET_MY_NUMBER', payload: secretNumber });
    });
    socket.on(S2C.YOUR_WORD, ({ word }: { word: string }) => {
      dispatch({ type: 'SET_MY_WORD', payload: word });
    });
    socket.on(S2C.ROUND_RESULT, (result: RoundResult) => {
      dispatch({ type: 'SET_ROUND_RESULT', payload: result });
    });
    socket.on(S2C.GAME_FINISHED, (data: any) => {
      dispatch({ type: 'SET_FINAL_RESULT', payload: data });
    });
    socket.on(S2C.ERROR, ({ message }: { message: string }) => {
      dispatch({ type: 'SET_ERROR', payload: message });
    });
    socket.on(S2C.NOTICE, ({ message }: { message: string }) => {
      dispatch({ type: 'SET_NOTICE', payload: message });
    });
    socket.on(S2C.WORDWOLF_EXAMPLE_TALK, ({ title, lines }: { title: string; lines: string[] }) => {
      dispatch({ type: 'SET_WORDWOLF_EXAMPLE_TALK', payload: { title, lines } });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off(S2C.ROOM_UPDATED);
      socket.off(S2C.GAME_STATE_CHANGED);
      socket.off(S2C.YOUR_NUMBER);
      socket.off(S2C.YOUR_WORD);
      socket.off(S2C.ROUND_RESULT);
      socket.off(S2C.GAME_FINISHED);
      socket.off(S2C.ERROR);
      socket.off(S2C.NOTICE);
      socket.off(S2C.WORDWOLF_EXAMPLE_TALK);
    };
  }, [socket]);

  useEffect(() => {
    if (!state.notice) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: 'CLEAR_NOTICE' });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [state.notice]);

  // ---------- Actions ----------
  const actions = {
    createRoom: useCallback((playerName: string) => {
      socket.emit(C2S.ROOM_CREATE, { playerName });
    }, [socket]),

    joinRoom: useCallback((roomId: string, playerName: string) => {
      socket.emit(C2S.ROOM_JOIN, { roomId, playerName });
    }, [socket]),

    leaveRoom: useCallback(() => {
      socket.emit(C2S.ROOM_LEAVE, {});
      dispatch({ type: 'RESET' });
    }, [socket]),

    toggleReady: useCallback(() => {
      socket.emit(C2S.ROOM_READY, {});
    }, [socket]),

    updateRoomSettings: useCallback((settings: {
      totalRounds: number;
      topicChooserMode: 'sequential' | 'random';
      wordWolfTalkSeconds: number;
      wordWolfCountMode: 'auto' | 'one' | 'two';
    }) => {
      socket.emit(C2S.ROOM_UPDATE_SETTINGS, settings);
    }, [socket]),

    startGame: useCallback(() => {
      socket.emit(C2S.GAME_START, {});
    }, [socket]),

    selectGame: useCallback((game: 'ito' | 'word-wolf') => {
      socket.emit(C2S.GAME_SELECT, { game });
    }, [socket]),

    returnToGameSelect: useCallback(() => {
      socket.emit(C2S.GAME_RETURN_TO_SELECT, {});
    }, [socket]),

    submitClue: useCallback((clue: string) => {
      socket.emit(C2S.ROUND_SUBMIT_CLUE, { clue });
    }, [socket]),

    confirmArrange: useCallback((order: string[]) => {
      socket.emit(C2S.ROUND_CONFIRM, { order });
    }, [socket]),

    startWordWolfTalk: useCallback(() => {
      socket.emit(C2S.WORDWOLF_START_TALK, {});
    }, [socket]),

    requestWordWolfExampleTalk: useCallback(() => {
      socket.emit(C2S.WORDWOLF_REQUEST_EXAMPLE_TALK, {});
    }, [socket]),

    clearWordWolfExampleTalk: useCallback(() => {
      dispatch({ type: 'CLEAR_WORDWOLF_EXAMPLE_TALK' });
    }, []),

    startWordWolfVote: useCallback(() => {
      socket.emit(C2S.WORDWOLF_START_VOTE, {});
    }, [socket]),

    submitWordWolfVote: useCallback((targetPlayerId: string) => {
      socket.emit(C2S.WORDWOLF_SUBMIT_VOTE, { targetPlayerId });
    }, [socket]),

    nextRound: useCallback(() => {
      socket.emit(C2S.ROUND_NEXT, {});
    }, [socket]),

    requestRandomTopic: useCallback(() => {
      socket.emit(C2S.ROUND_SET_TOPIC, { mode: 'random', finalize: false });
    }, [socket]),

    confirmTopic: useCallback((topic: string) => {
      socket.emit(C2S.ROUND_SET_TOPIC, { topic, mode: 'custom', finalize: true });
    }, [socket]),
  };

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
