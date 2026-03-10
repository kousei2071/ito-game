import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';
import type { DrawGuessRoundResult } from '@ito/shared';

export function DrawGuessResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;

  const result = state.roundResult as DrawGuessRoundResult | null;
  if (!result || result.game !== 'draw-guess') return null;

  const isCorrect = result.isCorrect;

  return (
    <div className="screen result-screen drawguess-result-screen">
      <div className="round-header round-header-with-room-id">
        <span className="round-badge">R{result.roundNumber}</span>
        <span className="room-id-badge">{gs.roomId}</span>
        <span className="score-badge">{gs.score}✓</span>
      </div>

      <div className={`result-status-pop ${isCorrect ? 'success' : 'failure'}`}>
        <h2>{isCorrect ? '正解者あり！' : '正解者なし…'}</h2>
      </div>

      <div className="drawguess-result-topic">
        <span className="drawguess-result-topic-label">お題</span>
        <span className="drawguess-result-topic-text">{result.topic}</span>
      </div>

      <div className="drawguess-result-drawer">
        🎨 描いた人: <strong>{result.drawerName}</strong>
        {result.drawerPoints > 0 && (
          <span className="drawguess-result-points">+{result.drawerPoints}pt</span>
        )}
      </div>

      {result.correctPlayers.length > 0 && (
        <div className="drawguess-result-correct-list">
          <p className="drawguess-result-section-title">正解者</p>
          <ul className="result-order">
            {result.correctPlayers.map((cp, i) => {
              const p = gs.players.find((pl) => pl.id === cp.playerId);
              return (
                <li key={cp.playerId} className="result-item">
                  <span className="result-rank">{i + 1}</span>
                  {p ? (
                    <PlayerIdentity player={p} className="result-name" />
                  ) : (
                    <span className="result-name">{cp.playerName}</span>
                  )}
                  <span className="drawguess-result-points">+{cp.points}pt</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result.correctPlayers.length === 0 && (
        <p className="waiting">誰もお題を当てられませんでした</p>
      )}

      <button
        type="button"
        className="btn btn-bone"
        onClick={actions.nextRound}
        disabled={!isHost}
      >
        {gs.roundResults.length >= gs.totalRounds ? '結果発表へ' : '次のラウンドへ'}
      </button>

      {!isHost && <p className="waiting">ホストが次のラウンドを開始するのを待っています…</p>}
    </div>
  );
}
