import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function RankingResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result || result.game !== 'ranking') {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

  return (
    <div className="screen result-screen is-success">
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

      <div className="result-status-pop success">
        <h2>ランキング確定！</h2>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{result.topic}</h2>
      </div>

      <h3>公開されたランキング</h3>
      <ul className="result-order">
        {result.rankingCards.map((entry) => (
          <li key={entry.playerId} className="result-item">
            <span className="result-rank">{entry.rank}</span>
            {gs.players.find((p) => p.id === entry.playerId) ? (
              <PlayerIdentity
                player={gs.players.find((p) => p.id === entry.playerId)!}
                className="result-name"
              />
            ) : (
              <span className="result-name">{entry.playerName}</span>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button className="btn btn-primary" onClick={actions.nextRound}>
          {result.roundNumber < gs.totalRounds ? '次のラウンドへ' : '最終結果を見る'}
        </button>
      ) : (
        <p className="waiting">ホストが次へ進めるのを待っています…</p>
      )}
    </div>
  );
}
