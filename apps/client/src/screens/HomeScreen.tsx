import { useState } from 'react';
import { useGame } from '../context/GameContext';

export function HomeScreen() {
  const { state, actions } = useGame();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (!name.trim()) return;
    actions.createRoom(name.trim());
  };

  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return;
    actions.joinRoom(roomId.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="screen home-screen">
      <h1 className="logo">🎴 ito</h1>
      <p className="subtitle">協力推理ゲーム</p>

      {state.lastError && <div className="error">{state.lastError}</div>}

      {mode === 'menu' && (
        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            ルームを作成
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('join')}>
            ルームに参加
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="form">
          <input
            className="input"
            placeholder="あなたの名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
          />
          <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>
            作成する
          </button>
          <button className="btn btn-text" onClick={() => setMode('menu')}>
            戻る
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="form">
          <input
            className="input"
            placeholder="あなたの名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
          />
          <input
            className="input"
            placeholder="ルームID (4文字)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <button className="btn btn-primary" onClick={handleJoin} disabled={!name.trim() || !roomId.trim()}>
            参加する
          </button>
          <button className="btn btn-text" onClick={() => setMode('menu')}>
            戻る
          </button>
        </div>
      )}

      <div className="connection-status">
        {state.connected ? '🟢 接続中' : '🔴 未接続'}
      </div>
    </div>
  );
}
