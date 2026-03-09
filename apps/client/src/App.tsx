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

export default function App() {
  const { state } = useGame();
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
      case 'result':
        screen = <ResultScreen />;
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
