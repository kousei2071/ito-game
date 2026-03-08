import { useRef, useState, type TouchEvent } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function ArrangeScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound!;
  const socket = getSocket();
  const canArrange = (socket.id ?? '') === round.topicChooserId;

  // 初期順序: ヒント配列順
  const [order, setOrder] = useState<string[]>(() =>
    round.clues.map((c) => c.playerId)
  );

  const nameOf = (id: string) => gs.players.find((p) => p.id === id)?.name ?? '???';
  const clueOf = (id: string) => round.clues.find((c) => c.playerId === id)?.clue ?? '';
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const animateReorder = (nextOrder: string[]) => {
    const first = new Map<string, number>();
    order.forEach((id) => {
      const el = itemRefs.current[id];
      if (el) first.set(id, el.getBoundingClientRect().top);
    });

    setOrder(nextOrder);

    requestAnimationFrame(() => {
      nextOrder.forEach((id) => {
        const el = itemRefs.current[id];
        const oldTop = first.get(id);
        if (!el || oldTop === undefined) return;
        const newTop = el.getBoundingClientRect().top;
        const delta = oldTop - newTop;
        if (delta === 0) return;
        el.animate(
          [
            { transform: `translateY(${delta}px)` },
            { transform: 'translateY(0px)' },
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
          },
        );
      });
    });
  };

  const moveTo = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    animateReorder(next);
  };

  const handleConfirm = () => {
    actions.confirmArrange(order);
  };

  const handleDropTo = (toIdx: number) => {
    if (dragFromIndex === null) return;
    moveTo(dragFromIndex, toIdx);
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchMove = (e: TouchEvent<HTMLLIElement>) => {
    if (!canArrange || dragFromIndex === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const item = target?.closest('[data-arrange-item-index]');
    if (!(item instanceof HTMLElement)) return;
    const idxText = item.dataset.arrangeItemIndex;
    if (!idxText) return;
    const idx = Number(idxText);
    if (Number.isNaN(idx)) return;
    setDragOverIndex(idx);
  };

  const handleTouchEnd = () => {
    if (!canArrange || dragFromIndex === null || dragOverIndex === null) {
      setDragFromIndex(null);
      setDragOverIndex(null);
      return;
    }
    moveTo(dragFromIndex, dragOverIndex);
    setDragFromIndex(null);
    setDragOverIndex(null);
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
        {canArrange
          ? 'カードをつかんで上下に動かし、上ほど数字が大きい順に並べ替えてください'
          : 'お題を決めた人が順番を並べ替え中です'}
      </p>

      <div className="arrange-guide-toggle-wrap">
        <button
          type="button"
          className="arrange-guide-toggle"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
          aria-controls="arrange-guide-panel"
        >
          {showGuide ? '説明を閉じる' : '説明を見る'}
        </button>
      </div>

      {showGuide ? (
        <div id="arrange-guide-panel" className="arrange-guide" aria-label="並べ方のガイド">
          <div className="arrange-guide-row is-top">
            <span className="arrange-guide-badge">上</span>
            <span className="arrange-guide-value">100に近い（大きい）</span>
          </div>
          <div className="arrange-guide-arrow">↓</div>
          <div className="arrange-guide-row is-bottom">
            <span className="arrange-guide-badge">下</span>
            <span className="arrange-guide-value">1に近い（小さい）</span>
          </div>
        </div>
      ) : null}

      <ul className="arrange-list">
        {order.map((id, idx) => (
          <li
            key={id}
            className={`arrange-item ${canArrange ? 'is-draggable' : ''} ${dragFromIndex === idx ? 'is-dragging' : ''} ${dragOverIndex === idx ? 'is-drag-over' : ''}`}
            data-arrange-item-index={idx}
            ref={(el) => {
              itemRefs.current[id] = el;
            }}
            draggable={canArrange}
            onDragStart={() => setDragFromIndex(idx)}
            onDragOver={(e) => {
              if (!canArrange) return;
              e.preventDefault();
              setDragOverIndex(idx);
            }}
            onDrop={(e) => {
              if (!canArrange) return;
              e.preventDefault();
              handleDropTo(idx);
            }}
            onDragEnd={() => {
              setDragFromIndex(null);
              setDragOverIndex(null);
            }}
            onTouchStart={() => {
              if (!canArrange) return;
              setDragFromIndex(idx);
              setDragOverIndex(idx);
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <span className="arrange-rank">{idx + 1}</span>
            <div className="arrange-info">
              <span className="arrange-name">{nameOf(id)}</span>
            </div>
            <span className="arrange-clue">「{clueOf(id)}」</span>
          </li>
        ))}
      </ul>

      {canArrange ? (
        <button className="btn btn-primary" onClick={handleConfirm}>
          この順番で確定！
        </button>
      ) : (
        <p className="waiting">お題を決めた人が順番を確定するのを待っています…</p>
      )}
    </div>
  );
}
