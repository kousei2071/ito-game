import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSocket } from '../socket';
import { PlayerIdentity } from '../components/PlayerIdentity';

export function NgWordTalkScreen() {
  const { state, actions } = useGame();
  const gs = state.gameState!;
  const round = gs.currentRound;
  const socket = getSocket();

  const [speakerId, setSpeakerId] = useState('');
  const [inducerId, setInducerId] = useState('');
  const [spokenWord, setSpokenWord] = useState('');

  if (!round || round.game !== 'ng-word') {
    return <div className="screen"><p>読み込み中...</p></div>;
  }

  const me = gs.players.find((p) => p.id === socket.id);
  const isChooser = round.topicChooserId === socket.id;
  const chooser = gs.players.find((p) => p.id === round.topicChooserId);

  const handleReport = () => {
    if (!speakerId || !inducerId || !spokenWord.trim()) return;
    actions.reportNgWordIncident({
      speakerId,
      inducerId,
      spokenWord: spokenWord.trim(),
    });
    setSpokenWord('');
  };

  return (
    <div className="screen ngword-screen">
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
        <span className="score-badge">対戦</span>
      </div>

      <div className="topic-card">
        <p className="topic-label">会話テーマ</p>
        <h2 className="topic-text">{round.topic}</h2>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">あなたのNGワード (3つ)</p>
        <div className="ngword-tags">
          {state.myNgWords.length > 0 ? state.myNgWords.map((w) => (
            <span key={w} className="ngword-tag">{w}</span>
          )) : <span className="settings-note">配布中...</span>}
        </div>
      </div>

      <div className="game-members-panel">
        <p className="game-members-title">現在の記録</p>
        {round.incidents.length === 0 ? (
          <p className="settings-note">まだNG発言はありません</p>
        ) : (
          <ul className="ngword-incident-list">
            {round.incidents.map((incident) => {
              const speaker = gs.players.find((p) => p.id === incident.speakerId);
              const inducer = gs.players.find((p) => p.id === incident.inducerId);
              return (
                <li key={incident.id} className="ngword-incident-item">
                  <span>{speaker?.name ?? '不明'} が「{incident.spokenWord}」</span>
                  <span className="settings-note">誘導: {inducer?.name ?? '不明'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isChooser ? (
        <div className="game-members-panel">
          <p className="game-members-title">NG発言を記録</p>
          <select className="input" value={speakerId} onChange={(e) => setSpeakerId(e.target.value)}>
            <option value="">NGを言った人</option>
            {gs.players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="input" value={inducerId} onChange={(e) => setInducerId(e.target.value)}>
            <option value="">言わせた人</option>
            {gs.players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            className="input"
            value={spokenWord}
            onChange={(e) => setSpokenWord(e.target.value)}
            placeholder="実際に発言したNGワード"
            maxLength={30}
          />
          <button className="btn btn-secondary" onClick={handleReport} disabled={!speakerId || !inducerId || !spokenWord.trim()}>
            記録する
          </button>
          <button className="btn btn-primary" onClick={actions.finishNgWordTalk}>
            結果へ進む
          </button>
        </div>
      ) : (
        <p className="waiting">{chooser?.name ?? 'お題担当'} が記録と進行をしています...</p>
      )}

      <div className="game-members-panel">
        <p className="game-members-title">参加メンバー</p>
        <ul className="game-members-list">
          {gs.players.map((p) => (
            <li key={p.id} className="game-member-item">
              <PlayerIdentity player={p} className="game-member-name" />
            </li>
          ))}
        </ul>
      </div>

      {state.lastError ? <div className="error">{state.lastError}</div> : null}
      {me ? null : <p className="waiting">接続を確認しています...</p>}
    </div>
  );
}
