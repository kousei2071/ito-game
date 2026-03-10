import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { useEffect, useState } from 'react';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function GameSelectScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;
  const games: Array<{ id: 'ito' | 'ranking' | 'word-wolf' | 'draw-guess' | 'all-match'; title: string; desc: string }> = [
    { id: 'ito', title: 'ito', desc: '価値観で数字を並べる協力ゲーム' },
    { id: 'ranking', title: 'ランキングゲーム', desc: 'お題に沿った答えを人気順に並べる協力ゲーム' },
    { id: 'word-wolf', title: 'ワードウルフ', desc: '少数派を見つける会話推理ゲーム' },
    { id: 'draw-guess', title: 'お絵描きクイズ', desc: '絵を描いてお題を当てるゲーム' },
    { id: 'all-match', title: '以心伝心ゲーム', desc: 'みんなで同じ答えを目指す協力ゲーム' },
  ];
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, games.findIndex((g) => g.id === (gs.selectedGame ?? 'ito'))),
  );
  const selectedGame = games[selectedIndex]?.id ?? 'ito';
  useEffect(() => {
    const idx = Math.max(0, games.findIndex((g) => g.id === (gs.selectedGame ?? 'ito')));
    setSelectedIndex(idx);
  }, [gs.selectedGame]);

  const updateSelectedGame = (nextIndex: number) => {
    const normalized = (nextIndex + games.length) % games.length;
    setSelectedIndex(normalized);
    if (isHost) {
      actions.selectGame(games[normalized].id);
    }
  };

  return (
    <div className="screen game-select-screen">
      <div className="round-header round-header-with-room-id">
        <span className="round-badge">ゲーム選択</span>
        <span className="room-id-badge">{gs.roomId}</span>
        <span className="score-badge">{gs.players.length}人</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">GAME HUB</p>
        <h2 className="topic-text">{games[selectedIndex].title}</h2>
        <p className="game-selected-desc">{games[selectedIndex].desc}</p>
      </div>

      <div className="game-select-arrow-wrap">
        <button
          type="button"
          className="game-arrow-btn"
          onClick={() => updateSelectedGame(selectedIndex - 1)}
          disabled={!isHost}
          aria-label="前のゲーム"
        >
          ◀
        </button>

        <p className="arrange-instruction game-select-instruction">遊ぶゲームを選んで開始してください</p>

        <button
          type="button"
          className="game-arrow-btn"
          onClick={() => updateSelectedGame(selectedIndex + 1)}
          disabled={!isHost}
          aria-label="次のゲーム"
        >
          ▶
        </button>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">ルームメンバー</p>
        <ul className="game-members-list">
          {gs.players.map((p) => (
            <li key={p.id} className="game-member-item">
              <PlayerIdentity player={p} className="game-member-name" />
              {p.isHost ? <span className="game-member-role">ホスト</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="btn btn-bone"
        onClick={actions.startGame}
        disabled={!isHost}
      >
        設定画面へ
      </button>

      {!isHost ? (
        <p className="waiting">ホストがゲームを選ぶのを待っています…</p>
      ) : null}

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
