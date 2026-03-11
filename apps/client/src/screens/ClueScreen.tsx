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
  if (!round || (round.game !== 'ito' && round.game !== 'ranking' && round.game !== 'all-match')) {
    return <div className="screen"><p>読み込み中…</p></div>;
  }
  const currentSocketId = socket.id ?? '';
  const alreadySubmitted = submitted || round.submittedCluePlayerIds.includes(currentSocketId);
  const allSubmitted = round.game === 'all-match' && round.submittedCluePlayerIds.length === gs.players.length;
  const isTopicChooser = round.game === 'all-match' && round.topicChooserId === currentSocketId;

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

      {round.game === 'ito' ? (
        <div className="my-number-card">
          <p className="number-label">あなたの数字</p>
          <h1 className="number-value">{state.myNumber ?? '??'}</h1>
        </div>
      ) : null}

      {!alreadySubmitted ? (
        <div className="clue-form">
          <p className="clue-instruction">
            {round.game === 'ito'
              ? `お題「${round.topic}」に対して、数字の大きさに応じた答えを入力してください`
              : round.game === 'all-match'
                ? `お題「${round.topic}」に対して、全員で同じ答えを狙って入力してください`
              : `ランキングゲームでは回答入力はありません（この画面は通常表示されません）`}
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
          {allSubmitted && isTopicChooser ? (
            <button className="btn btn-primary" onClick={actions.openAllMatchResult}>
              結果画面へ進む
            </button>
          ) : null}
          {allSubmitted && !isTopicChooser ? (
            <p className="waiting-count">お題を決めた人が結果画面へ進めるのを待っています…</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
