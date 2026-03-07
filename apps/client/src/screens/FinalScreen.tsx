import { useGame } from '../context/GameContext';

export function FinalScreen() {
  const { state, actions } = useGame();
  const final = state.finalResult;
  const gs = state.gameState;

  const score = final?.score ?? gs?.score ?? 0;
  const total = final?.totalRounds ?? gs?.totalRounds ?? 10;
  const results = final?.roundResults ?? gs?.roundResults ?? [];

  return (
    <div className="screen final-screen">
      <h1 className="final-title">🏆 ゲーム終了！</h1>

      <div className="final-score-card">
        <p className="final-score-label">最終スコア</p>
        <h2 className="final-score-value">{score} / {total}</h2>
      </div>

      <h3>ラウンド結果</h3>
      <ul className="final-rounds">
        {results.map((r) => (
          <li key={r.roundNumber} className={`final-round-item ${r.isCorrect ? 'success' : 'failure'}`}>
            <span className="final-round-num">R{r.roundNumber}</span>
            <span className="final-round-topic">{r.topic}</span>
            <span className="final-round-result">{r.isCorrect ? '✅' : '❌'}</span>
          </li>
        ))}
      </ul>

      <button className="btn btn-primary" onClick={actions.leaveRoom}>
        ホームに戻る
      </button>
    </div>
  );
}
