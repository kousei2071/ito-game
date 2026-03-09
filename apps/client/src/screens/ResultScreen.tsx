import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function ResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const round = gs.currentRound;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result) {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

  const answeredOrder =
    round?.clues
      .map((c) => result.correctOrder.find((entry) => entry.playerId === c.playerId))
      .filter((entry): entry is (typeof result.correctOrder)[number] => Boolean(entry)) ?? result.correctOrder;

  return (
    <div className={`screen result-screen ${result.isCorrect ? 'is-success' : 'is-failure'}`}>
      <div className="round-header round-header-with-back">
        <span className="round-badge">Round {result.roundNumber} / {gs.totalRounds}</span>
        <button type="button" className="btn btn-back-select" onClick={actions.returnToGameSelect}>
          ゲーム選択へ戻る
        </button>
        <span className="score-badge">スコア: {gs.score}</span>
      </div>

      <div className={`result-status-pop ${result.isCorrect ? 'success' : 'failure'}`}>
        <h2>{result.isCorrect ? '成功！' : '失敗…'}</h2>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{result.topic}</h2>
      </div>

      <h3>回答順</h3>
      <ul className="result-order">
        {answeredOrder.map((entry, idx) => (
          <li key={entry.playerId} className="result-item">
            <span className="result-rank">{idx + 1}</span>
            <span className="result-name">{entry.playerName}</span>
            <span className="result-number">{entry.secretNumber}</span>
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
