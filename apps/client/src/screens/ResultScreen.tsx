import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function ResultScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const result = state.roundResult;
  const socket = getSocket();
  const isHost = gs.players.find((p) => p.id === socket.id)?.isHost ?? false;
  const currentRound = gs.currentRound;
  const isAllMatchPendingJudge =
    gs.phase === 'result'
    && currentRound?.game === 'all-match'
    && !result;
  const isTopicChooser = currentRound?.game === 'all-match' && currentRound.topicChooserId === socket.id;

  if (!isAllMatchPendingJudge && (!result || (result.game !== 'ito' && result.game !== 'all-match'))) {
    return <div className="screen"><p>結果を読み込み中…</p></div>;
  }

  const roundNumber = isAllMatchPendingJudge ? currentRound.roundNumber : result!.roundNumber;
  const topic = isAllMatchPendingJudge ? currentRound.topic : result!.topic;
  const isCorrect = isAllMatchPendingJudge ? undefined : result!.isCorrect;

  return (
    <div className={`screen result-screen ${isCorrect === undefined ? '' : isCorrect ? 'is-success' : 'is-failure'}`}>
      <div className="round-header round-header-with-back">
        <span className="round-badge">Round {roundNumber} / {gs.totalRounds}</span>
        <button
          type="button"
          className="btn btn-back-select"
          onClick={actions.returnToGameSelect}
          aria-label="ゲーム選択へ戻る"
          title="ゲーム選択へ戻る"
        >
          ←
        </button>
        <span className="score-badge">スコア: {gs.score}</span>
      </div>

      {isCorrect !== undefined ? (
        <div className={`result-status-pop ${isCorrect ? 'success' : 'failure'}`}>
          <h2>
            {isCorrect ? '成功！' : '失敗…'}
          </h2>
        </div>
      ) : null}

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{topic}</h2>
      </div>

      {!isAllMatchPendingJudge && result!.game === 'ito' ? (
        <>
          {(() => {
            const arrangedOrder = result!.arrangedOrder.length > 0 ? result!.arrangedOrder : result!.correctOrder;
            return (
              <>
          <h3>回答順</h3>
          <ul className="result-order">
            {arrangedOrder.map((entry, idx) => (
              <li key={entry.playerId} className="result-item">
                <span className="result-rank">{idx + 1}</span>
                {gs.players.find((p) => p.id === entry.playerId) ? (
                  <PlayerIdentity
                    player={gs.players.find((p) => p.id === entry.playerId)!}
                    className="result-name"
                  />
                ) : (
                  <span className="result-name">{entry.playerName}</span>
                )}
                <span className="result-number">{entry.secretNumber}</span>
              </li>
            ))}
          </ul>
              </>
            );
          })()}
        </>
      ) : (
        <>
          <h3>みんなの回答</h3>
          <ul className="result-order">
            {(isAllMatchPendingJudge
              ? currentRound.clues.map((c) => ({
                playerId: c.playerId,
                playerName: gs.players.find((p) => p.id === c.playerId)?.name ?? '',
                answer: c.clue,
              }))
              : result!.answers
            ).map((entry, idx) => (
              <li key={entry.playerId} className="result-item">
                <span className="result-rank">{idx + 1}</span>
                {gs.players.find((p) => p.id === entry.playerId) ? (
                  <PlayerIdentity
                    player={gs.players.find((p) => p.id === entry.playerId)!}
                    className="result-name"
                  />
                ) : (
                  <span className="result-name">{entry.playerName}</span>
                )}
                <span className="result-number" style={{ fontSize: 22 }}>{entry.answer}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {isAllMatchPendingJudge && isTopicChooser && (
        <div className="judge-buttons">
          <p className="judge-instruction">みんなの回答を見て判定してください</p>
          <div className="button-group">
            <button className="judge-button correct-button" onClick={() => actions.judgeAllMatch(true)}>
              正解
            </button>
            <button className="judge-button incorrect-button" onClick={() => actions.judgeAllMatch(false)}>
              不正解
            </button>
          </div>
        </div>
      )}

      {isAllMatchPendingJudge && !isTopicChooser && (
        <p className="waiting">お題を決めた人が判定中です…</p>
      )}

      {!isAllMatchPendingJudge && isHost && (
        <button className="btn btn-primary" onClick={actions.nextRound}>
          {roundNumber < gs.totalRounds ? '次のラウンドへ' : '最終結果を見る'}
        </button>
      )}

      {!isAllMatchPendingJudge && !isHost && (
        <p className="waiting">ホストが次へ進めるのを待っています…</p>
      )}
    </div>
  );
}
