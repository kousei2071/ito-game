import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

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
        <p className="topic-label">ラウンド結果</p>
        <h2 className="topic-text">{result.winnerPlayerName ? `勝者: ${result.winnerPlayerName}` : 'NGワードバトル'}</h2>
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
