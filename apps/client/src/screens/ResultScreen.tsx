import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function ResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result) {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

  return (
    <div className="screen result-screen">
      <div className="round-header">
        <span className="round-badge">Round {result.roundNumber} / {gs.totalRounds}</span>
        <span className="score-badge">スコア: {gs.score}</span>
      </div>

      <div className={`result-banner ${result.isCorrect ? 'success' : 'failure'}`}>
        <h2>{result.isCorrect ? '🎉 成功！' : '😢 失敗…'}</h2>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{result.topic}</h2>
      </div>

      <h3>正解順</h3>
      <ul className="result-order">
        {result.correctOrder.map((entry, idx) => (
          <li key={entry.playerId} className="result-item">
            <span className="result-rank">{idx + 1}</span>
            <span className="result-name">{entry.playerName}</span>
            <span className="result-number">#{entry.secretNumber}</span>
          </li>
        ))}
      </ul>

      {isHost && (
        <button className="btn btn-primary" onClick={actions.nextRound}>
          {result.roundNumber < gs.totalRounds ? '次のラウンドへ' : '最終結果を見る'}
        </button>
      )}

      {!isHost && (
        <p className="waiting">ホストが次へ進めるのを待っています…</p>
      )}
    </div>
  );
}
