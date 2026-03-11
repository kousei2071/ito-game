import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function NgWordTalkScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);

  if (!round || round.game !== 'ng-word') {
    return <div className="screen"><p>読み込み中...</p></div>;
  }

  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;

  const handleEliminate = () => {
    if (!targetPlayerId) return;
    actions.eliminateNgWordPlayer(targetPlayerId);
    setTargetPlayerId(null);
  };

  const selectedPlayer = targetPlayerId ? gs.players.find((p) => p.id === targetPlayerId) : null;

  return (
    <div className="screen ngword-screen">
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
        <span className="score-badge">会話中</span>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">メンバーカード（タップで脱落）</p>
        <div className="ngword-member-grid">
          {gs.players.map((p) => {
            const assignment = round.wordAssignments.find((a) => a.playerId === p.id);
            const isMe = p.id === socket.id;
            const isEliminated = round.eliminatedPlayerIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`ngword-member-card ${isEliminated ? 'is-eliminated' : ''}`}
                onClick={() => {
                  if (isMe || isEliminated) return;
                  setTargetPlayerId(p.id);
                }}
                disabled={isMe || isEliminated}
              >
                <PlayerIdentity player={p} className="game-member-name" />
                <div className="ngword-tags">
                  {(assignment?.words ?? []).map((w, idx) => (
                    <span key={`${p.id}-${idx}`} className="ngword-tag">{isMe ? '???' : w}</span>
                  ))}
                </div>
                {isEliminated ? <span className="ngword-eliminated-badge">脱落</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">脱落ログ</p>
        {round.incidents.length === 0 ? (
          <p className="settings-note">まだ脱落者はいません</p>
        ) : (
          <ul className="ngword-incident-list">
            {round.incidents.map((incident) => {
              const target = gs.players.find((p) => p.id === incident.targetId);
              const reporter = gs.players.find((p) => p.id === incident.reporterId);
              return (
                <li key={incident.id} className="ngword-incident-item">
                  <span>{target?.name ?? '不明'} を脱落</span>
                  <span className="settings-note">申告: {reporter?.name ?? '不明'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isHost ? (
        <div className="ngword-host-actions">
          <button className="btn btn-secondary" onClick={actions.rerollNgWordWords}>
            お題変更
          </button>
          <button className="btn btn-primary" onClick={actions.finishNgWordTalk}>
            結果へ進む
          </button>
        </div>
      ) : (
        <p className="waiting">ホストが結果へ進めるのを待っています...</p>
      )}

      {targetPlayerId ? (
        <div className="number-modal-overlay" onClick={() => setTargetPlayerId(null)}>
          <div className="number-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="number-modal-label">確認</p>
            <p className="settings-note">{selectedPlayer?.name ?? 'このプレイヤー'} を脱落させますか？</p>
            <button className="btn btn-primary" onClick={handleEliminate}>脱落させる</button>
            <button className="btn" onClick={() => setTargetPlayerId(null)}>キャンセル</button>
          </div>
        </div>
      ) : null}

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
      {me ? null : <p className="waiting">接続を確認しています...</p>}
    </div>
  );
}
