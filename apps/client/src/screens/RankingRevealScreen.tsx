import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function RankingRevealScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();

  if (!round || round.game !== 'ranking') {
    return <div className="screen"><p>公開情報を読み込み中…</p></div>;
  }

  const me = gs.players.find((p) => p.id === socket.id);
  const isChooser = round.topicChooserId === socket.id;
  const chooserName = gs.players.find((p) => p.id === round.topicChooserId)?.name ?? '???';
  const total = gs.players.length;
  const revealedRank = Math.min(round.revealedRank, total);

  const rankRows = Array.from({ length: total }, (_, i) => {
    const rank = i + 1;
    const players = round.rankingSelections
      .filter((s) => s.rank === rank)
      .map((s) => gs.players.find((p) => p.id === s.playerId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return { rank, revealed: rank <= revealedRank, players };
  });

  return (
    <div className="screen ranking-reveal-screen">
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
        <span className="score-badge">公開 {revealedRank}/{total}</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">お題</p>
        <h2 className="topic-text">{round.topic}</h2>
      </div>

      <p className="arrange-instruction">
        {isChooser
          ? '上から順番に公開してください'
          : `${chooserName}がランキングを上から公開しています…`}
      </p>

      <ul className="result-order">
        {rankRows.map((row) => (
          <li key={`rank-${row.rank}`} className={`result-item ${row.revealed ? '' : 'ranking-hidden-item'}`}>
            <span className="result-rank">{row.rank}</span>
            {row.revealed ? (
              row.players.length > 0 ? (
                <div className="ranking-reveal-players">
                  {row.players.map((player) => (
                    <PlayerIdentity key={player.id} player={player} className="result-name" />
                  ))}
                </div>
              ) : (
                <span className="result-name">該当なし</span>
              )
            ) : (
              <span className="result-name">???</span>
            )}
          </li>
        ))}
      </ul>

      {isChooser ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={actions.revealNextRanking}
          disabled={revealedRank >= total}
        >
          {revealedRank < total ? `${revealedRank + 1}位を公開` : '公開完了'}
        </button>
      ) : null}

      {!isChooser ? <p className="waiting">公開が終わるまでお待ちください…</p> : null}
      {!me ? <p className="waiting">接続情報を確認中…</p> : null}
      {state.lastError ? <div className="error">{state.lastError}</div> : null}
    </div>
  );
}
