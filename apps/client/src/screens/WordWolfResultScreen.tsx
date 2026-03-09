import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function WordWolfResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result || result.game !== 'word-wolf') {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

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
        <h2>{result.isCorrect ? '市民の勝ち！' : 'ワードウルフの勝ち！'}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">投票で選ばれた人</p>
        <p className="settings-note">{result.votedPlayerName}</p>

        <p className="game-members-title">お題ワード</p>
        <p className="settings-note">多数派: {result.minorityWord}</p>
        <p className="settings-note">少数派: {result.majorityWord}</p>

        <p className="game-members-title">ワードウルフ</p>
        <p className="settings-note">{result.wolfPlayerNames.join(' / ')}</p>
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
