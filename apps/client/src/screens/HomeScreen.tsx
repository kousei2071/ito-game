import { useState } from 'react';
import { useGame } from '../context/GameContext';

const mascotCandidates = [
  '/mascot.png',
  '/mascot.webp',
  '/mascot.jpg',
  '/mascot.jpeg',
  '/character.png',
  '/character.webp',
  '/character.jpg',
  '/character.jpeg',
];

export function HomeScreen() {
  const { state, actions } = useGame();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [mascotIndex, setMascotIndex] = useState(0);

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
      <div className="home-hero">
        <div className="home-mascot" aria-label="マスコット">
          {mascotIndex < mascotCandidates.length ? (
            <img
              key={mascotCandidates[mascotIndex]}
              src={mascotCandidates[mascotIndex]}
              alt="ito マスコット"
              className="home-mascot-image"
              onError={() => setMascotIndex((prev) => prev + 1)}
            />
          ) : (
            <span className="home-mascot-fallback">画像を配置してください</span>
          )}
        </div>
        <h1 className="home-logo" aria-label="Ito logo">
          <span className="home-logo-i">I</span>
          <span className="home-logo-t">t</span>
          <span className="home-logo-o">o</span>
        </h1>
        <p className="home-subtitle">みんなで数遊び</p>
      </div>

      {state.lastError && <div className="error">{state.lastError}</div>}

      {mode === 'menu' && (
        <div className="menu-buttons">
          <button className="btn btn-bone" onClick={() => setMode('create')}>
            ルームを作成
          </button>
          <button className="btn btn-bone" onClick={() => setMode('join')}>
            ルームに参加
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="form home-form">
          <input
            className="input"
            placeholder="あなたの名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
          />
          <button className="btn btn-bone" onClick={handleCreate} disabled={!name.trim()}>
            作成する
          </button>
          <button className="btn btn-text" onClick={() => setMode('menu')}>
            戻る
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="form home-form">
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
          <button className="btn btn-bone" onClick={handleJoin} disabled={!name.trim() || !roomId.trim()}>
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
