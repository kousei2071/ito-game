import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function WordWolfTalkScreen() {
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
        <p className="game-members-title">トーク中</p>
        <p className="settings-note">ワードを直接言わず、連想や特徴を話してください。</p>
        <p className="settings-note">目安時間: {round.talkSeconds}秒</p>
      </div>

      {isHost ? (
        <button type="button" className="btn btn-secondary" onClick={actions.requestWordWolfExampleTalk}>
          例トークを出す
        </button>
      ) : null}

      <button
        type="button"
        className="btn btn-primary"
        onClick={actions.startWordWolfVote}
        disabled={!isHost}
      >
        投票へ進む
      </button>

      {!isHost ? <p className="waiting">ホストが投票へ進めるのを待っています…</p> : null}

      {state.wordWolfExampleTalk ? (
        <div className="number-modal-overlay" onClick={actions.clearWordWolfExampleTalk}>
          <div
            className="number-modal guide-modal wordwolf-example-modal"
            role="dialog"
            aria-modal="true"
            aria-label="AI例トーク"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="number-modal-label">{state.wordWolfExampleTalk.title}</p>
            <div className="wordwolf-example-lines">
              {state.wordWolfExampleTalk.lines.map((line, idx) => (
                <p key={`${idx}-${line}`} className="settings-note">{line}</p>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={actions.clearWordWolfExampleTalk}>
              閉じる
            </button>
          </div>
        </div>
      ) : null}

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
