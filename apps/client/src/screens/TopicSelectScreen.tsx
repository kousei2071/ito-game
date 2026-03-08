import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function TopicSelectScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isChooser = round.topicChooserId === socket.id;

  const [inputValue, setInputValue] = useState(round.topic);

  useEffect(() => {
    setInputValue(round.topic);
  }, [round.topic, round.roundNumber]);

  const remainingUpdates = Math.max(0, 10 - round.topicChangeCount);

  const handleConfirm = () => {
    const value = inputValue.trim() || round.topic;
    if (!value) return;
    actions.confirmTopic(value);
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
            ランダムお題を試したり、自分でお題を入力してから「このお題で始める」を押してください。
          </p>
          <textarea
            className="input topic-input"
            rows={3}
            maxLength={40}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="自分でお題を入力してもOK"
          />
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
            disabled={!inputValue.trim() && !round.topic}
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
