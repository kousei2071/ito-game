import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function WordWolfVoteScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();
  const myId = socket.id ?? '';
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const alreadyVoted = !!round && round.game === 'word-wolf' && round.voteSubmittedPlayerIds.includes(myId);

  if (!round || round.game !== 'word-wolf') {
    return <div className="screen"><p>読み込み中…</p></div>;
  }

  const handleVote = () => {
    if (!selectedPlayerId) return;
    actions.submitWordWolfVote(selectedPlayerId);
  };

  return (
    <div className="screen wordwolf-screen">
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
        <span className="score-badge">{round.talkSeconds}</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">投票</p>
        <h2 className="topic-text">ワードウルフだと思う人を選んでください</h2>
      </div>

      {!alreadyVoted ? (
        <>
          <ul className="game-members-list">
            {gs.players.map((p) => (
              <li key={p.id} className="game-member-item">
                <label className="wordwolf-vote-option">
                  <input
                    type="radio"
                    name="wordwolf-vote"
                    value={p.id}
                    checked={selectedPlayerId === p.id}
                    onChange={() => setSelectedPlayerId(p.id)}
                  />
                  <span className="game-member-name">{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary" onClick={handleVote} disabled={!selectedPlayerId}>
            この人に投票
          </button>
        </>
      ) : (
        <div className="waiting">
          <p>✅ 投票済みです。ほかのプレイヤーを待っています…</p>
          <p className="waiting-count">{round.voteSubmittedPlayerIds.length} / {gs.players.length} 人が投票済み</p>
        </div>
      )}

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
