import { useGame } from './context/GameContext';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { TopicSelectScreen } from './screens/TopicSelectScreen';
import { ClueScreen } from './screens/ClueScreen';
import { ArrangeScreen } from './screens/ArrangeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { FinalScreen } from './screens/FinalScreen';
import { GameSelectScreen } from './screens/GameSelectScreen';
import { GameSettingsScreen } from './screens/GameSettingsScreen';
import { WordWolfRevealScreen } from './screens/WordWolfRevealScreen';
import { WordWolfTalkScreen } from './screens/WordWolfTalkScreen';
import { WordWolfVoteScreen } from './screens/WordWolfVoteScreen';
import { WordWolfResultScreen } from './screens/WordWolfResultScreen';
import { NgWordTalkScreen } from './screens/NgWordTalkScreen';
import { RankingRevealScreen } from './screens/RankingRevealScreen';
import { RankingResultScreen } from './screens/RankingResultScreen';
import { DrawGuessScreen } from './screens/DrawGuessScreen';
import { DrawGuessResultScreen } from './screens/DrawGuessResultScreen';
import { AnonymousSurveyAnswerScreen } from './screens/AnonymousSurveyAnswerScreen';
import { AnonymousSurveyResultScreen } from './screens/AnonymousSurveyResultScreen';
import { getSocket } from './socket';

export default function App() {
  const { state, actions } = useGame();
  const { gameState, finalResult } = state;

  let screen = <HomeScreen />;

  if (finalResult) {
    screen = <FinalScreen />;
  } else if (!gameState) {
    screen = <HomeScreen />;
  } else {
    switch (gameState.phase) {
      case 'lobby':
        screen = <LobbyScreen />;
        break;
      case 'game-select':
        screen = <GameSelectScreen />;
        break;
      case 'game-settings':
        screen = <GameSettingsScreen />;
        break;
      case 'topic':
        screen = <TopicSelectScreen />;
        break;
      case 'clue':
        screen = <ClueScreen />;
        break;
      case 'arrange':
        screen = <ArrangeScreen />;
        break;
      case 'ranking-reveal':
        screen = <RankingRevealScreen />;
        break;
      case 'ranking-result':
        screen = <RankingResultScreen />;
        break;
      case 'result':
        screen = <ResultScreen />;
        break;
      case 'wordwolf-reveal':
        screen = <WordWolfRevealScreen />;
        break;
      case 'wordwolf-talk':
        screen = <WordWolfTalkScreen />;
        break;
      case 'wordwolf-vote':
        screen = <WordWolfVoteScreen />;
        break;
      case 'wordwolf-result':
        screen = <WordWolfResultScreen />;
        break;
      case 'ngword-talk':
        screen = <NgWordTalkScreen />;
        break;
      case 'drawguess-drawing':
        screen = <DrawGuessScreen />;
        break;
      case 'drawguess-result':
        screen = <DrawGuessResultScreen />;
        break;
      case 'survey-answer':
        screen = <AnonymousSurveyAnswerScreen />;
        break;
      case 'survey-result':
        screen = <AnonymousSurveyResultScreen />;
        break;
      case 'finished':
        screen = <FinalScreen />;
        break;
      default:
        screen = <HomeScreen />;
    }
  }

  const socket = getSocket();
  const me = gameState?.players.find((p) => p.id === socket.id);
  const normalAdvancePhases = new Set(['result', 'ranking-result', 'wordwolf-result', 'drawguess-result']);
  const showRecoveryButton = Boolean(
    gameState
    && me?.isHost
    && gameState.phase !== 'lobby'
    && gameState.phase !== 'game-select'
    && gameState.phase !== 'game-settings'
    && gameState.phase !== 'finished'
    && !normalAdvancePhases.has(gameState.phase),
  );

  const handleRecoveryAdvance = () => {
    const ok = window.confirm('進行が止まった場合のみ使ってください。このラウンドをスキップして次へ進みます。');
    if (!ok) return;
    actions.nextRound();
  };

  return (
    <>
      {state.notice ? <div className="global-notice">{state.notice}</div> : null}
      {showRecoveryButton ? (
        <button type="button" className="btn btn-recovery-next" onClick={handleRecoveryAdvance}>
          進行復旧
        </button>
      ) : null}
      {screen}
    </>
  );
}
