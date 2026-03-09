import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function ClueScreen() {
  const { state, actions } = useGame();
  const [clue, setClue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();
  if (!round || round.game !== 'ito') {
    return <div className="screen"><p>読み込み中…</p></div>;
  }
  const currentSocketId = socket.id ?? '';
  const alreadySubmitted = submitted || round.submittedCluePlayerIds.includes(currentSocketId);

  const handleSubmit = () => {
    if (!clue.trim()) return;
    actions.submitClue(clue.trim());
    setSubmitted(true);
  };

  return (
    <div className="screen clue-screen">
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
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{round.topic}</h2>
      </div>

      <div className="my-number-card">
        <p className="number-label">あなたの数字</p>
        <h1 className="number-value">{state.myNumber ?? '??'}</h1>
      </div>

      {!alreadySubmitted ? (
        <div className="clue-form">
          <p className="clue-instruction">
            お題「{round.topic}」に対して、数字の大きさに応じた答えを入力してください
          </p>
          <input
            className="input"
            placeholder="答えを入力…"
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            maxLength={40}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!clue.trim()}>
            送信
          </button>
        </div>
      ) : (
        <div className="waiting">
          <p>✅ ヒント送信済み！他のプレイヤーを待っています…</p>
          <p className="waiting-count">
            {round.submittedCluePlayerIds.length} / {gs.players.length} 人が送信済み
          </p>
        </div>
      )}
    </div>
  );
}
