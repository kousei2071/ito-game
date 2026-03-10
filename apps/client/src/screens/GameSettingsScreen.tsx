import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { useEffect, useState } from 'react';

export function GameSettingsScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;

  const [settings, setSettings] = useState({
    totalRounds: gs.totalRounds,
    topicChooserMode: gs.topicChooserMode,
    wordWolfTalkSeconds: gs.wordWolfTalkSeconds,
    wordWolfCountMode: gs.wordWolfCountMode,
  });

  useEffect(() => {
    setSettings({
      totalRounds: gs.totalRounds,
      topicChooserMode: gs.topicChooserMode,
      wordWolfTalkSeconds: gs.wordWolfTalkSeconds,
      wordWolfCountMode: gs.wordWolfCountMode,
    });
  }, [gs.totalRounds, gs.topicChooserMode, gs.wordWolfTalkSeconds, gs.wordWolfCountMode]);

  useEffect(() => {
    if (!isHost) return;
    if (
      settings.totalRounds === gs.totalRounds &&
      settings.topicChooserMode === gs.topicChooserMode &&
      settings.wordWolfTalkSeconds === gs.wordWolfTalkSeconds &&
      settings.wordWolfCountMode === gs.wordWolfCountMode
    ) {
      return;
    }
    actions.updateRoomSettings(settings);
  }, [
    isHost,
    settings,
    gs.totalRounds,
    gs.topicChooserMode,
    gs.wordWolfTalkSeconds,
    gs.wordWolfCountMode,
    actions,
  ]);

  const selectedGameLabel =
    gs.selectedGame === 'word-wolf'
      ? 'ワードウルフ'
      : gs.selectedGame === 'ranking'
        ? 'ランキングゲーム'
        : gs.selectedGame === 'draw-guess'
          ? 'お絵描きクイズ'
        : 'ito';

  return (
    <div className="screen game-settings-screen">
      <div className="round-header round-header-with-back">
        <span className="round-badge">設定</span>
        <button
          type="button"
          className="btn btn-back-select"
          onClick={actions.returnToGameSelect}
          aria-label="ゲーム選択へ戻る"
          title="ゲーム選択へ戻る"
        >
          ←
        </button>
        <span className="score-badge">{gs.players.length}人</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">選択中のゲーム</p>
        <h2 className="topic-text">{selectedGameLabel}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">設定の説明</p>
        <p className="settings-note">
          {gs.selectedGame === 'word-wolf'
            ? 'ラウンド数・会話時間・ワードウルフ人数を決めてから開始します。'
            : 'ラウンド数を決めてから開始します（お題は自作またはランダム選択）。'}
        </p>

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

          {gs.selectedGame === 'word-wolf' ? (
            <>
              <label className="settings-field">
                <span>会話時間（秒）</span>
                <select
                  className="input"
                  value={settings.wordWolfTalkSeconds}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, wordWolfTalkSeconds: Number(e.target.value) }))
                  }
                  disabled={!isHost}
                >
                  <option value={60}>60</option>
                  <option value={120}>120</option>
                  <option value={180}>180</option>
                </select>
              </label>

              <label className="settings-field">
                <span>ワードウルフ人数</span>
                <select
                  className="input"
                  value={settings.wordWolfCountMode}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      wordWolfCountMode: e.target.value as 'auto' | 'one' | 'two',
                    }))
                  }
                  disabled={!isHost}
                >
                  <option value="auto">自動（4人以下で1人 / 5人以上で2人）</option>
                  <option value="one">1人</option>
                  <option value="two">2人</option>
                </select>
              </label>
            </>
          ) : null}
        </div>

        {!isHost ? (
          <p className="settings-note">ホストが設定を調整中です</p>
        ) : null}
      </div>

      <button type="button" className="btn btn-bone" onClick={actions.startGame} disabled={!isHost}>
        GAME START
      </button>

      {!isHost ? <p className="waiting">だれでもゲーム選択へ戻せます。ホストが開始するのを待っています…</p> : null}
      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
