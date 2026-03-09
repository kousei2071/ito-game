import { useGame } from './context/GameContext';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { TopicSelectScreen } from './screens/TopicSelectScreen';
import { ClueScreen } from './screens/ClueScreen';
import { ArrangeScreen } from './screens/ArrangeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { FinalScreen } from './screens/FinalScreen';
import { GameSelectScreen } from './screens/GameSelectScreen';

export default function App() {
  const { state } = useGame();
  const { gameState, finalResult } = state;

  // 最終結果
  if (finalResult) return <FinalScreen />;

  // ゲーム未参加
  if (!gameState) return <HomeScreen />;

  // フェーズに応じた画面
  switch (gameState.phase) {
    case 'lobby':
      return <LobbyScreen />;
    case 'game-select':
      return <GameSelectScreen />;
    case 'topic':
      return <TopicSelectScreen />;
    case 'clue':
      return <ClueScreen />;
    case 'arrange':
      return <ArrangeScreen />;
    case 'result':
      return <ResultScreen />;
    case 'finished':
      return <FinalScreen />;
    default:
      return <HomeScreen />;
  }
}
