import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function WordWolfRevealScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();
  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;

  if (!round || round.game !== 'word-wolf') {
    return <div className="screen"><p>読み込み中…</p></div>;
  }

  return (
    <div className="screen wordwolf-screen">
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
        <span className="score-badge">{round.talkSeconds}</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">あなたのワード</p>
        <h2 className="topic-text">{state.myWord ?? '??'}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">遊び方</p>
        <p className="settings-note">自分のワードは口に出さず、会話で少数派を探ります。</p>
      </div>

      <button
        type="button"
        className="btn btn-bone"
        onClick={actions.startWordWolfTalk}
        disabled={!isHost}
      >
        トーク開始
      </button>

      {!isHost ? <p className="waiting">ホストがトークを開始するのを待っています…</p> : null}
      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
