import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { PublicGameState, RoundResult } from '@ito/shared';
import { S2C, C2S } from '@ito/shared';
import { getSocket } from '../socket';

// ============================================================
// State
// ============================================================
interface State {
  connected: boolean;
  gameState: PublicGameState | null;
  myNumber: number | null;
  lastError: string | null;
  roundResult: RoundResult | null;
  finalResult: { score: number; totalRounds: number; roundResults: RoundResult[] } | null;
}

const initialState: State = {
  connected: false,
  gameState: null,
  myNumber: null,
  lastError: null,
  roundResult: null,
  finalResult: null,
};

type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: PublicGameState }
  | { type: 'SET_MY_NUMBER'; payload: number }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_ROUND_RESULT'; payload: RoundResult }
  | { type: 'SET_FINAL_RESULT'; payload: { score: number; totalRounds: number; roundResults: RoundResult[] } }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload, lastError: null };
    case 'SET_MY_NUMBER':
      return { ...state, myNumber: action.payload, roundResult: null };
    case 'SET_ERROR':
      return { ...state, lastError: action.payload };
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
    startGame: () => void;
    submitClue: (clue: string) => void;
    confirmArrange: (order: string[]) => void;
    nextRound: () => void;
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

    socket.on(S2C.ROOM_UPDATED, (gs: PublicGameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gs });
    });
    socket.on(S2C.GAME_STATE_CHANGED, (gs: PublicGameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gs });
    });
    socket.on(S2C.YOUR_NUMBER, ({ secretNumber }: { secretNumber: number }) => {
      dispatch({ type: 'SET_MY_NUMBER', payload: secretNumber });
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

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off(S2C.ROOM_UPDATED);
      socket.off(S2C.GAME_STATE_CHANGED);
      socket.off(S2C.YOUR_NUMBER);
      socket.off(S2C.ROUND_RESULT);
      socket.off(S2C.GAME_FINISHED);
      socket.off(S2C.ERROR);
    };
  }, [socket]);

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

    startGame: useCallback(() => {
      socket.emit(C2S.GAME_START, {});
    }, [socket]),

    submitClue: useCallback((clue: string) => {
      socket.emit(C2S.ROUND_SUBMIT_CLUE, { clue });
    }, [socket]),

    confirmArrange: useCallback((order: string[]) => {
      socket.emit(C2S.ROUND_CONFIRM, { order });
    }, [socket]),

    nextRound: useCallback(() => {
      socket.emit(C2S.ROUND_NEXT, {});
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
