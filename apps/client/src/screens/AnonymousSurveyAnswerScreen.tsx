import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';

export function AnonymousSurveyAnswerScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();

  if (!round || round.game !== 'anonymous-survey') {
    return <div className="screen"><p>読み込み中...</p></div>;
  }

  const me = gs.players.find((p) => p.id === socket.id);
  const isHost = me?.isHost ?? false;
  const isChooser = round.topicChooserId === socket.id;
  const myId = socket.id ?? '';
  const hasAnswered = myId ? round.answeredPlayerIds.includes(myId) : false;
  const answeredCount = round.answeredPlayerIds.length;
  const totalCount = gs.players.length;
  const canOpenResult = isChooser && answeredCount === totalCount;

  return (
    <div className="screen clue-screen">
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
        <span className="score-badge">回答 {answeredCount}/{totalCount}</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">匿名アンケート</p>
        <h2 className="topic-text">{round.topic}</h2>
      </div>

      <div className="game-members-panel">
        <p className="settings-note">YES か NO を選んでください（匿名集計）</p>
        <div className="button-group" style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => actions.submitAnonymousSurveyAnswer('yes')}
            disabled={hasAnswered}
            style={{ flex: 1 }}
          >
            YES
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => actions.submitAnonymousSurveyAnswer('no')}
            disabled={hasAnswered}
            style={{ flex: 1 }}
          >
            NO
          </button>
        </div>
      </div>

      {hasAnswered ? <p className="waiting">回答しました。ほかの人を待っています...</p> : null}

      {canOpenResult ? (
        <button type="button" className="btn btn-bone" onClick={actions.openAnonymousSurveyResult}>
          結果を見る
        </button>
      ) : null}

      {!canOpenResult && isHost ? (
        <p className="waiting">全員の回答後に結果を開けます</p>
      ) : null}

      {!isHost && answeredCount < totalCount ? (
        <p className="waiting">お題を決めた人が結果を開くまで待っています...</p>
      ) : null}

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
