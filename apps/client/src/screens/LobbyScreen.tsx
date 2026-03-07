import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function LobbyScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;
  const allReady = gs.players.length >= 1 && gs.players.every((p) => p.isReady);

  return (
    <div className="screen lobby-screen">
      <div className="room-header">
        <h2>ルーム: <span className="room-id">{gs.roomId}</span></h2>
        <p className="player-count">{gs.players.length} / 8 人</p>
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
