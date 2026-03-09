import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { useState } from 'react';

export function GameSettingsScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;

  const [settings, setSettings] = useState({
    totalRounds: gs.totalRounds,
    topicChooserMode: gs.topicChooserMode,
  });

  const selectedGameLabel = gs.selectedGame === 'word-wolf' ? 'ワードウルフ' : 'ito';

  return (
    <div className="screen game-settings-screen">
      <div className="round-header round-header-with-back">
        <span className="round-badge">設定</span>
        <button type="button" className="btn btn-back-select" onClick={actions.returnToGameSelect}>
          ゲーム選択へ戻る
        </button>
        <span className="score-badge">{gs.players.length}人</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">選択中のゲーム</p>
        <h2 className="topic-text">{selectedGameLabel}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">設定の説明</p>
        <p className="settings-note">ラウンド数とお題決定者の方式を決めてから開始します。</p>

        <p className="game-members-title">ルーム設定</p>
        <div className="game-settings-grid">
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
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  topicChooserMode: e.target.value as 'sequential' | 'random',
                }))
              }
              disabled={!isHost}
            >
              <option value="sequential">順番（ホスト→他プレイヤー）</option>
              <option value="random">毎ラウンドランダム</option>
            </select>
          </label>
        </div>

        {isHost ? (
          <button type="button" className="btn btn-secondary" onClick={() => actions.updateRoomSettings(settings)}>
            設定を保存
          </button>
        ) : (
          <p className="settings-note">ホストが設定を調整中です</p>
        )}
      </div>

      <button type="button" className="btn btn-bone" onClick={actions.startGame} disabled={!isHost}>
        GAME START
      </button>

      {!isHost ? <p className="waiting">だれでもゲーム選択へ戻せます。ホストが開始するのを待っています…</p> : null}
      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
