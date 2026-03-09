import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function TopicSelectScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();
  if (!round || round.game !== 'ito') {
    return <div className="screen"><p>読み込み中…</p></div>;
  }
  const isChooser = round.topicChooserId === socket.id;
  const chooserName = gs.players.find((p) => p.id === round.topicChooserId)?.name ?? '???';
  const [selectedTopic, setSelectedTopic] = useState(round.topic);

  useEffect(() => {
    setSelectedTopic(round.topic);
  }, [round.topic, round.roundNumber]);

  const remainingUpdates = Math.max(0, 10 - round.topicChangeCount);

  const handleConfirm = () => {
    if (!selectedTopic) return;
    actions.confirmTopic(selectedTopic);
  };

  return (
    <div className="screen topic-screen">
      <div className="round-header round-header-with-back">
        <span className="round-badge">Round {round.roundNumber} / {gs.totalRounds}</span>
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

      <div className="topic-card">
        <p className="topic-label">お題を決めるひと</p>
        <h2 className="topic-text">
          {chooserName}
        </h2>
      </div>

      <div className="topic-card">
        <p className="topic-label">現在のお題</p>
        {isChooser ? (
          <input
            className="input"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            maxLength={40}
            placeholder="お題を入力"
          />
        ) : (
          <h2 className="topic-text">{round.topic}</h2>
        )}
      </div>

      {isChooser ? (
        <div className="topic-chooser-panel">
          <p className="clue-instruction">
            自分でお題を入力するか、候補を切り替えて「このお題を決める」を押してください。
          </p>
          <div className="topic-actions">
            <button
              className="btn btn-arrow-pink"
              onClick={actions.requestRandomTopic}
              disabled={remainingUpdates <= 0}
            >
              別のお題
            </button>
            <span className="topic-updates-remaining">
              残り {remainingUpdates} 回まで変更できます
            </span>
          </div>
          <button
            className="btn btn-bone topic-confirm-bone"
            onClick={handleConfirm}
            disabled={!selectedTopic}
          >
            お題を決める 🦴
          </button>
        </div>
      ) : (
        <div className="waiting">
          <p>「{chooserName}」がお題を決めています…</p>
          <p className="waiting-count">
            ランダムお題の変更は最大10回までです
          </p>
        </div>
      )}

      {state.lastError && <div className="error">{state.lastError}</div>}
    </div>
  );
}
