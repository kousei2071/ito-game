import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function WordWolfResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result || result.game !== 'word-wolf') {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

  const votedPlayer = gs.players.find((p) => p.name === result.votedPlayerName);
  const wolfPlayers = result.wolfPlayerNames
    .map((name) => gs.players.find((p) => p.name === name) ?? null)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className={`screen wordwolf-screen result-screen ${result.isCorrect ? 'is-success' : 'is-failure'}`}>
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
        <span className="score-badge">{gs.wordWolfTalkSeconds}</span>
      </div>

      <div className={`result-status-pop ${result.isCorrect ? 'success' : 'failure'}`}>
        <h2>{result.isCorrect ? '市民の勝ち！' : 'ウルフの勝ち！'}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">投票で選ばれた人</p>
        {votedPlayer ? (
          <PlayerIdentity player={votedPlayer} className="settings-note" />
        ) : (
          <p className="settings-note">{result.votedPlayerName}</p>
        )}

        <p className="game-members-title">お題ワード</p>
        <p className="settings-note">多数派: {result.majorityWord}</p>
        <p className="settings-note">少数派: {result.minorityWord}</p>

        <p className="game-members-title">ワードウルフ</p>
        {wolfPlayers.length > 0 ? (
          <div className="wordwolf-result-wolf-list">
            {wolfPlayers.map((player) => (
              <PlayerIdentity key={player.id} player={player} className="settings-note" />
            ))}
          </div>
        ) : (
          <p className="settings-note">{result.wolfPlayerNames.join(' / ')}</p>
        )}
      </div>

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
