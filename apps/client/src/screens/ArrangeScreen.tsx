import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function ArrangeScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound!;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;

  // 初期順序: ヒント配列順
  const [order, setOrder] = useState<string[]>(() =>
    round.clues.map((c) => c.playerId)
  );

  const nameOf = (id: string) => gs.players.find((p) => p.id === id)?.name ?? '???';
  const clueOf = (id: string) => round.clues.find((c) => c.playerId === id)?.clue ?? '';

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrder(next);
  };

  const moveDown = (idx: number) => {
    if (idx === order.length - 1) return;
    const next = [...order];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setOrder(next);
  };

  const handleConfirm = () => {
    actions.confirmArrange(order);
  };

  return (
    <div className="screen arrange-screen">
      <div className="round-header">
        <span className="round-badge">Round {round.roundNumber} / {gs.totalRounds}</span>
        <span className="score-badge">スコア: {gs.score}</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{round.topic}</h2>
      </div>

      <p className="arrange-instruction">
        ヒントを見て、数字が<strong>小さい順</strong>に並べ替えてください
      </p>

      <ul className="arrange-list">
        {order.map((id, idx) => (
          <li key={id} className="arrange-item">
            <span className="arrange-rank">{idx + 1}</span>
            <div className="arrange-info">
              <span className="arrange-name">{nameOf(id)}</span>
              <span className="arrange-clue">「{clueOf(id)}」</span>
            </div>
            <div className="arrange-buttons">
              <button className="btn-icon" onClick={() => moveUp(idx)} disabled={idx === 0}>▲</button>
              <button className="btn-icon" onClick={() => moveDown(idx)} disabled={idx === order.length - 1}>▼</button>
            </div>
          </li>
        ))}
      </ul>

      {isHost ? (
        <button className="btn btn-primary" onClick={handleConfirm}>
          この順番で確定！
        </button>
      ) : (
        <p className="waiting">ホストが順番を確定するのを待っています…</p>
      )}
    </div>
  );
}
