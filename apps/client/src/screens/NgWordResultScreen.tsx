import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function NgWordResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result || result.game !== 'ng-word') {
    return <div className="screen"><p>結果を読み込み中...</p></div>;
  }

  return (
    <div className="screen ngword-screen result-screen">
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
        <span className="score-badge">結果</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">会話テーマ</p>
        <h2 className="topic-text">{result.topic}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">ラウンドスコア</p>
        <ul className="result-order">
          {result.scoreBoard.map((entry, idx) => {
            const player = gs.players.find((p) => p.id === entry.playerId);
            return (
              <li key={entry.playerId} className="result-item">
                <span className="result-rank">{idx + 1}</span>
                {player ? (
                  <PlayerIdentity player={player} className="result-name" />
                ) : (
                  <span className="result-name">{entry.playerName}</span>
                )}
                <span className="result-number">{entry.score > 0 ? `+${entry.score}` : entry.score}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">NG発言ログ</p>
        {result.incidents.length === 0 ? (
          <p className="settings-note">このラウンドではNG発言はありませんでした</p>
        ) : (
          <ul className="ngword-incident-list">
            {result.incidents.map((incident) => (
              <li key={incident.id} className="ngword-incident-item">
                <span>{incident.speakerName} が「{incident.spokenWord}」</span>
                <span className="settings-note">誘導: {incident.inducerName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isHost ? (
        <button className="btn btn-primary" onClick={actions.nextRound}>
          {result.roundNumber < gs.totalRounds ? '次のラウンドへ' : '最終結果を見る'}
        </button>
      ) : (
        <p className="waiting">ホストが次へ進めるのを待っています...</p>
      )}
    </div>
  );
}
