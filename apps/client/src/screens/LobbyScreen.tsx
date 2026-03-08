import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function LobbyScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;
  const allReady = gs.players.length >= 1 && gs.players.every((p) => p.isReady);

  const roomUrl = typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname
    : '';

  const handleCopyUrl = async () => {
    if (!roomUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomUrl);
        alert('ルームのURLをコピーしました');
      } else {
        // 古いブラウザ向けフォールバック
        prompt('このURLをコピーしてください', roomUrl);
      }
    } catch {
      alert('コピーに失敗しました');
    }
  };

  const handleShare = async () => {
    if (!roomUrl) return;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'ito 協力推理ゲーム',
          text: '一緒にitoで遊びましょう！',
          url: roomUrl,
        });
      } catch {
        // ユーザーキャンセルなどは無視
      }
    } else {
      await handleCopyUrl();
    }
  };

  return (
    <div className="screen lobby-screen">
      <div className="room-header">
        <h2>ルームID</h2>
        <div className="room-id-card">
          <span className="room-id">{gs.roomId}</span>
        </div>
        <p className="player-count">{gs.players.length} / 8 人が参加中</p>

        <div className="share-actions">
          <button className="btn btn-secondary" onClick={handleCopyUrl}>
            URLをコピー
          </button>
          <button className="btn btn-secondary" onClick={handleShare}>
            招待リンクを共有
          </button>
        </div>
      </div>

      <ul className="player-list">
        {gs.players.map((p) => (
          <li key={p.id} className={`player-item ${p.isReady ? 'ready' : ''}`}>
            <span className="player-name">
              {p.isHost && '👑 '}{p.name}
            </span>
            <span className="player-status">
              {p.isReady ? '✅ 準備OK' : '⏳ 待機中'}
            </span>
          </li>
        ))}
      </ul>

      <div className="lobby-actions">
        {!isHost && (
          <button className="btn btn-secondary" onClick={actions.toggleReady}>
            {me?.isReady ? '準備を取り消す' : '準備完了'}
          </button>
        )}

        {isHost && (
          <button
            className="btn btn-primary"
            onClick={actions.startGame}
            disabled={!allReady}
          >
            {allReady ? 'ゲーム開始！' : '全員の準備を待っています…'}
          </button>
        )}

        <button className="btn btn-text" onClick={actions.leaveRoom}>
          退出
        </button>
      </div>

      {state.lastError && <div className="error">{state.lastError}</div>}
    </div>
  );
}
