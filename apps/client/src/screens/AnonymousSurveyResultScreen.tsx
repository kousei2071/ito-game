import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function AnonymousSurveyResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  if (!result || result.game !== 'anonymous-survey') {
    return <div className="screen"><p>結果を読み込み中...</p></div>;
  }

  const yesRate = result.totalCount > 0 ? Math.round((result.yesCount / result.totalCount) * 100) : 0;
  const noRate = 100 - yesRate;

  return (
    <div className="screen result-screen">
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
        <span className="score-badge">匿名集計</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{result.topic}</h2>
      </div>

      <div className="game-members-panel">
        <h3>結果</h3>
        <div className="survey-count-grid">
          <div className="survey-count-card yes">
            <p className="survey-count-label">YES</p>
            <p className="survey-count-value">{result.yesCount}人</p>
            <p className="survey-count-sub">/ {result.totalCount}人</p>
          </div>
          <div className="survey-count-card no">
            <p className="survey-count-label">NO</p>
            <p className="survey-count-value">{result.noCount}人</p>
            <p className="survey-count-sub">/ {result.totalCount}人</p>
          </div>
        </div>
        <div className="survey-rate-wrap">
          <div className="survey-rate-bar-bg">
            <div className="survey-rate-bar-yes" style={{ width: `${yesRate}%` }} />
          </div>
          <p className="settings-note">YES {yesRate}% / NO {noRate}%</p>
        </div>
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
