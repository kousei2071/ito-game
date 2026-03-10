import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function ResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result || (result.game !== 'ito' && result.game !== 'all-match')) {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

  return (
    <div className={`screen result-screen ${result.isCorrect ? 'is-success' : 'is-failure'}`}>
      <div className="round-header round-header-with-back">
        <span className="round-badge">Round {result.roundNumber} / {gs.totalRounds}</span>
        <button
          type="button"
          className="btn btn-back-select"
          onClick={actions.returnToGameSelect}
          aria-label="ゲーム選択へ戻る"
          title="ゲーム選択へ戻る"
        >
          ←
        </button>
        <span className="score-badge">スコア: {gs.score}</span>
      </div>

      <div className={`result-status-pop ${result.isCorrect ? 'success' : 'failure'}`}>
        <h2>
          {result.isCorrect ? '成功！' : '失敗…'}
        </h2>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{result.topic}</h2>
      </div>

      {result.game === 'ito' ? (
        <>
          {(() => {
            const arrangedOrder = result.arrangedOrder.length > 0 ? result.arrangedOrder : result.correctOrder;
            return (
              <>
          <h3>回答順</h3>
          <ul className="result-order">
            {arrangedOrder.map((entry, idx) => (
              <li key={entry.playerId} className="result-item">
                <span className="result-rank">{idx + 1}</span>
                {gs.players.find((p) => p.id === entry.playerId) ? (
                  <PlayerIdentity
                    player={gs.players.find((p) => p.id === entry.playerId)!}
                    className="result-name"
                  />
                ) : (
                  <span className="result-name">{entry.playerName}</span>
                )}
                <span className="result-number">{entry.secretNumber}</span>
              </li>
            ))}
          </ul>
              </>
            );
          })()}
        </>
      ) : (
        <>
          <h3>みんなの回答</h3>
          <ul className="result-order">
            {result.answers.map((entry, idx) => (
              <li key={entry.playerId} className="result-item">
                <span className="result-rank">{idx + 1}</span>
                {gs.players.find((p) => p.id === entry.playerId) ? (
                  <PlayerIdentity
                    player={gs.players.find((p) => p.id === entry.playerId)!}
                    className="result-name"
                  />
                ) : (
                  <span className="result-name">{entry.playerName}</span>
                )}
                <span className="result-number" style={{ fontSize: 22 }}>{entry.answer}</span>
              </li>
            ))}
          </ul>
        </>
      )}

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
