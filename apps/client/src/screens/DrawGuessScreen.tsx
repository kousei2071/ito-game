import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { useEffect, useRef, useState, useCallback } from 'react';
import { S2C, C2S } from '@ito/shared';
import type { DrawGuessStroke } from '@ito/shared';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function DrawGuessScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(90);
  const [correctCount, setCorrectCount] = useState(0);
  const [myCorrect, setMyCorrect] = useState(false);

  if (!round || round.game !== 'draw-guess') return null;
  const isDrawer = me?.id === round.drawerId;
  const drawer = gs.players.find((p) => p.id === round.drawerId);

  useEffect(() => {
    setTimeLeft(round.timeLimit);
  }, [round.timeLimit, round.roundNumber]);

  useEffect(() => {
    document.body.classList.add('drawguess-active');
    return () => {
      document.body.classList.remove('drawguess-active');
    };
  }, []);

  // Listen for real-time events
  useEffect(() => {
    const handleStroke = ({ stroke }: { stroke: DrawGuessStroke }) => {
      const canvas = canvasRef.current;
      if (canvas && (canvas as any).__drawingApi) {
        (canvas as any).__drawingApi.addRemoteStroke(stroke);
      }
    };

    const handleUndo = () => {
      const canvas = canvasRef.current;
      if (canvas && (canvas as any).__drawingApi) {
        (canvas as any).__drawingApi.handleRemoteUndo();
      }
    };

    const handleRedo = () => {
      const canvas = canvasRef.current;
      if (canvas && (canvas as any).__drawingApi) {
        (canvas as any).__drawingApi.handleRemoteRedo();
      }
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (canvas && (canvas as any).__drawingApi) {
        (canvas as any).__drawingApi.handleRemoteClear();
      }
    };

    const handleTimeUpdate = ({ timeLeft: tl }: { timeLeft: number }) => {
      setTimeLeft(tl);
    };

    const handleCorrect = ({ playerId }: { playerId: string; playerName: string; points: number }) => {
      setCorrectCount((c) => c + 1);
      if (playerId === socket.id) {
        setMyCorrect(true);
      }
    };

    socket.on(S2C.DRAWGUESS_STROKE, handleStroke);
    socket.on(S2C.DRAWGUESS_UNDO, handleUndo);
    socket.on(S2C.DRAWGUESS_REDO, handleRedo);
    socket.on(S2C.DRAWGUESS_CLEAR, handleClear);
    socket.on(S2C.DRAWGUESS_TIME_UPDATE, handleTimeUpdate);
    socket.on(S2C.DRAWGUESS_CORRECT, handleCorrect);

    return () => {
      socket.off(S2C.DRAWGUESS_STROKE, handleStroke);
      socket.off(S2C.DRAWGUESS_UNDO, handleUndo);
      socket.off(S2C.DRAWGUESS_REDO, handleRedo);
      socket.off(S2C.DRAWGUESS_CLEAR, handleClear);
      socket.off(S2C.DRAWGUESS_TIME_UPDATE, handleTimeUpdate);
      socket.off(S2C.DRAWGUESS_CORRECT, handleCorrect);
    };
  }, [socket]);

  const handleStroke = useCallback((stroke: DrawGuessStroke) => {
    socket.emit(C2S.DRAWGUESS_STROKE, { stroke });
  }, [socket]);

  const handleUndo = useCallback(() => {
    socket.emit(C2S.DRAWGUESS_UNDO, {});
  }, [socket]);

  const handleRedo = useCallback(() => {
    socket.emit(C2S.DRAWGUESS_REDO, {});
  }, [socket]);

  const handleClear = useCallback(() => {
    socket.emit(C2S.DRAWGUESS_CLEAR, {});
  }, [socket]);

  const handleSubmitGuess = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guess.trim();
    if (!trimmed || myCorrect) return;
    socket.emit(C2S.DRAWGUESS_GUESS, { guess: trimmed });
    setGuess('');
  }, [guess, myCorrect, socket]);

  const captureCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
  }, []);

  const guesserCount = gs.players.length - 1;
  const isUnlimitedTime = round.timeLimit === 0;
  const timePercent = isUnlimitedTime
    ? 100
    : Math.max(0, (timeLeft / round.timeLimit) * 100);

  return (
    <div className="screen drawguess-screen">
      <div className="round-header round-header-with-back">
        <span className="round-badge">R{round.roundNumber}</span>
        <button
          type="button"
          className="btn btn-back-select"
          onClick={actions.returnToGameSelect}
          aria-label="ゲーム選択へ戻る"
          title="ゲーム選択へ戻る"
        >
          ←
        </button>
        <span className="score-badge">{gs.score}✓</span>
      </div>

      {/* Timer bar */}
      <div className="drawguess-timer-bar-wrap">
        <div className="drawguess-timer-bar" style={{ width: `${timePercent}%` }} />
        <span className="drawguess-timer-text">{isUnlimitedTime ? 'むせいげん' : `${timeLeft}秒`}</span>
      </div>

      {/* Drawer info */}
      <div className="drawguess-info-row">
        {drawer && (
          <span className="drawguess-drawer-label">
            🎨 <PlayerIdentity player={drawer} className="drawguess-drawer-name" />
            {isDrawer ? '' : ' が描いています'}
          </span>
        )}
        <span className="drawguess-correct-count">正解 {correctCount}/{guesserCount}</span>
      </div>

      {/* Topic display for drawer */}
      {isDrawer && state.myWord && (
        <div className="drawguess-topic-card">
          <span className="drawguess-topic-label">お題</span>
          <span className="drawguess-topic-text">{state.myWord}</span>
        </div>
      )}

      {/* Canvas */}
      <DrawingCanvas
        isDrawer={isDrawer}
        onStroke={handleStroke}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canvasRefCallback={captureCanvasRef}
      />

      {/* Guess form for non-drawers */}
      {!isDrawer && !myCorrect && (
        <form className="drawguess-guess-form" onSubmit={handleSubmitGuess}>
          <input
            type="text"
            className="input drawguess-guess-input"
            placeholder="答えを入力..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary drawguess-guess-btn" disabled={!guess.trim()}>
            回答
          </button>
        </form>
      )}

      {!isDrawer && myCorrect && (
        <div className="drawguess-correct-banner">🎉 正解！</div>
      )}

      {isDrawer && (
        <p className="drawguess-drawer-hint">絵を描いてみんなにお題を当ててもらいましょう！</p>
      )}

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
