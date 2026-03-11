import { useGame } from './context/GameContext';
import { getSocket } from './socket';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { TopicSelectScreen } from './screens/TopicSelectScreen';
import { ClueScreen } from './screens/ClueScreen';
import { ArrangeScreen } from './screens/ArrangeScreen';
import { AllMatchJudgeScreen } from './screens/AllMatchJudgeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { FinalScreen } from './screens/FinalScreen';
import { GameSelectScreen } from './screens/GameSelectScreen';
import { GameSettingsScreen } from './screens/GameSettingsScreen';
import { WordWolfRevealScreen } from './screens/WordWolfRevealScreen';
import { WordWolfTalkScreen } from './screens/WordWolfTalkScreen';
import { WordWolfVoteScreen } from './screens/WordWolfVoteScreen';
import { WordWolfResultScreen } from './screens/WordWolfResultScreen';
import { RankingRevealScreen } from './screens/RankingRevealScreen';
import { RankingResultScreen } from './screens/RankingResultScreen';
import { DrawGuessScreen } from './screens/DrawGuessScreen';
import { DrawGuessResultScreen } from './screens/DrawGuessResultScreen';

export default function App() {
  const { state } = useGame();
  const socket = getSocket();
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
      case 'all-match-judge':
        if (gameState.currentRound && gameState.currentRound.game === 'all-match' && socket.id) {
          const round = gameState.currentRound;
          const isTopicChooser = round.topicChooserId === socket.id;
          const playerNameMap = new Map(gameState.players.map((p) => [p.id, p.name]));
          screen = <AllMatchJudgeScreen round={round} myId={socket.id} isTopicChooser={isTopicChooser} playerNameMap={playerNameMap} />;
        }
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
      case 'drawguess-drawing':
        screen = <DrawGuessScreen />;
        break;
      case 'drawguess-result':
        screen = <DrawGuessResultScreen />;
        break;
      case 'finished':
        screen = <FinalScreen />;
        break;
      default:
        screen = <HomeScreen />;
    }
  }

  return (
    <>
      {state.notice ? <div className="global-notice">{state.notice}</div> : null}
      {screen}
    </>
  );
}
