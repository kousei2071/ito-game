import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function TopicSelectScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound!;
  const socket = getSocket();
  const isChooser = round.topicChooserId === socket.id;

  const remainingUpdates = Math.max(0, 10 - round.topicChangeCount);

  const handleConfirm = () => {
    actions.confirmTopic();
  };

  return (
    <div className="screen topic-screen">
      <div className="round-header">
        <span className="round-badge">Round {round.roundNumber} / {gs.totalRounds}</span>
        <span className="score-badge">スコア: {gs.score}</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題を決めるひと</p>
        <h2 className="topic-text">
          {gs.players.find((p) => p.id === round.topicChooserId)?.name ?? '???'}
        </h2>
      </div>

      <div className="topic-card">
        <p className="topic-label">現在のお題</p>
        <h2 className="topic-text">{round.topic}</h2>
      </div>

      {isChooser ? (
        <div className="topic-chooser-panel">
          <p className="clue-instruction">
            ランダム更新で候補を切り替え、使いたいお題で「このお題で始める」を押してください。
          </p>
          <div className="topic-actions">
            <button
              className="btn btn-secondary"
              onClick={actions.requestRandomTopic}
              disabled={remainingUpdates <= 0}
            >
              別のお題（ランダム）
            </button>
            <span className="topic-updates-remaining">
              残り {remainingUpdates} 回まで変更できます
            </span>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!round.topic}
          >
            このお題で始める
          </button>
        </div>
      ) : (
        <div className="waiting">
          <p>
            {gs.players.find((p) => p.id === round.topicChooserId)?.name ?? '???'} さんが
            お題を選んでいます…
          </p>
          <p className="waiting-count">
            ランダムお題の変更は最大10回までです
          </p>
        </div>
      )}

      {state.lastError && <div className="error">{state.lastError}</div>}
    </div>
  );
}
