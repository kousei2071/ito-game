import React from 'react';
import type { AllMatchRoundState } from '@ito/shared';
import { useGame } from '../context/GameContext';

interface AllMatchJudgeScreenProps {
  round: AllMatchRoundState;
  myId: string;
  isTopicChooser: boolean;
  playerNameMap: Map<string, string>;
}

export function AllMatchJudgeScreen({
  round,
  myId,
  isTopicChooser,
  playerNameMap,
}: AllMatchJudgeScreenProps) {
  const { actions } = useGame();
  const { judgeAllMatch } = actions;

  const handleJudge = (isCorrect: boolean) => {
    judgeAllMatch(isCorrect);
  };

  return (
    <div className="judge-container">
      <div className="judge-header">
        <h2>以心伝心 判定中</h2>
      </div>

      <div className="judge-topic">
        <p className="topic-label">お題</p>
        <p className="topic-value">{round.topic}</p>
      </div>

      <div className="judge-answers">
        <p className="answers-label">プレイヤーの答え</p>
        <div className="answers-list">
          {round.clues.map((clue) => {
            const playerName = playerNameMap.get(clue.playerId) ?? '不明';
            return (
              <div key={clue.playerId} className="answer-item">
                <span className="answer-player">{playerName}</span>
                <span className="answer-text">{clue.clue}</span>
              </div>
            );
          })}
        </div>
      </div>

      {isTopicChooser ? (
        <div className="judge-buttons">
          <p className="judge-instruction">すべての答えが以心伝心でしたか？</p>
          <div className="button-group">
            <button
              className="judge-button correct-button"
              onClick={() => handleJudge(true)}
            >
              正解
            </button>
            <button
              className="judge-button incorrect-button"
              onClick={() => handleJudge(false)}
            >
              不正解
            </button>
          </div>
        </div>
      ) : (
        <div className="judge-waiting">
          <p>お題を決めた人が答えを確認中です...</p>
        </div>
      )}
    </div>
  );
}
