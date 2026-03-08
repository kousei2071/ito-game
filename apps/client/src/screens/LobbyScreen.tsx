import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { useState } from 'react';

function RoleIcon({ isHost }: { isHost: boolean }) {
  const src = isHost ? '/oya.png' : '/menber.png';
  return (
    <img
      src={src}
      alt={isHost ? '親' : 'メンバー'}
      className="player-role-icon"
      onError={(e) => {
        const target = e.currentTarget;
        target.style.display = 'none';
      }}
    />
  );
}

export function LobbyScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;
  const allReady = gs.players.length >= 1 && gs.players.every((p) => p.isReady);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    totalRounds: gs.totalRounds,
    topicChooserMode: gs.topicChooserMode,
  });

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

  const openSettings = () => {
    setSettings({ totalRounds: gs.totalRounds, topicChooserMode: gs.topicChooserMode });
    setShowSettings(true);
  };

  const saveSettings = () => {
    actions.updateRoomSettings(settings);
    setShowSettings(false);
  };

  return (
    <div className="screen lobby-screen">
      <div className="room-header">
        <p className="lobby-title">ルーム待ち</p>
        <h2>ルームID</h2>
        <div className="room-id-card">
          <span className="room-id">{gs.roomId}</span>
          <button
            type="button"
            className="room-settings-btn"
            onClick={openSettings}
            aria-label="ルーム設定"
          >
            ⚙
          </button>
        </div>
        <p className="player-count">{gs.players.length} / 8 人が参加中</p>

        <div className="share-actions">
          <button className="btn btn-share-pill" onClick={handleCopyUrl}>
            URLをコピー
          </button>
          <button className="btn btn-share-pill" onClick={handleShare}>
            招待リンクを共有
          </button>
        </div>
      </div>

      <ul className="player-list">
        {gs.players.map((p) => (
          <li key={p.id} className={`player-item ${p.isReady ? 'ready' : ''}`}>
            <span className="player-name">
              <RoleIcon isHost={p.isHost} />
              {p.name}
            </span>
            <span className="player-status">
              {p.isReady ? '✅ 準備OK' : '⏳ 待機中'}
            </span>
          </li>
        ))}
      </ul>

      <div className="lobby-actions">
        {!isHost && (
          <button className="btn btn-bone" onClick={actions.toggleReady}>
            {me?.isReady ? '準備を取り消す' : '準備完了'}
          </button>
        )}

        {isHost && (
          <button
            className="btn btn-bone"
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

      {showSettings ? (
        <div className="number-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="number-modal lobby-settings-modal" role="dialog" aria-modal="true" aria-label="ルーム設定" onClick={(e) => e.stopPropagation()}>
            <p className="number-modal-label">ルーム設定</p>

            <label className="settings-field">
              <span>ラウンド数</span>
              <select
                className="input"
                value={settings.totalRounds}
                onChange={(e) => setSettings((prev) => ({ ...prev, totalRounds: Number(e.target.value) }))}
                disabled={!isHost}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </label>

            <label className="settings-field">
              <span>お題決定者</span>
              <select
                className="input"
                value={settings.topicChooserMode}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  topicChooserMode: e.target.value as 'sequential' | 'random',
                }))}
                disabled={!isHost}
              >
                <option value="sequential">順番（ホスト→他プレイヤー）</option>
                <option value="random">毎ラウンドランダム</option>
              </select>
            </label>

            {!isHost ? <p className="settings-note">ホストのみ変更できます</p> : null}

            <div className="settings-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                閉じる
              </button>
              {isHost ? (
                <button type="button" className="btn btn-primary" onClick={saveSettings}>
                  保存
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
