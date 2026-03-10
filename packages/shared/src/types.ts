// ============================================================
// Player
// ============================================================
export interface Player {
  id: string;          // socket.id
  name: string;
  playerIconId: PlayerIconId;
  isHost: boolean;
  isReady: boolean;
  /** 現在オンラインかどうか */
  connected: boolean;
  /** 現ラウンドで配られた秘密の数字 (1-100) */
  secretNumber?: number;
  /** 現ラウンドで配られた秘密のワード (word-wolf) */
  secretWord?: string;
  /** 現ラウンドで提出したヒント */
  clue?: string;
}

export type PlayerIconId = 'icon1' | 'icon2' | 'icon3' | 'icon4' | 'icon5' | 'icon6' | 'icon7' | 'icon8' | 'icon9' | 'icon10';

export type TopicChooserMode = 'sequential' | 'random';
export type GameType = 'ito' | 'ranking' | 'word-wolf' | 'draw-guess' | 'all-match';
export type WordWolfCountMode = 'auto' | 'one' | 'two';
export type DrawGuessTimeLimit = 0 | 60 | 90 | 120;
export type DrawGuessDifficulty = 'easy' | 'normal' | 'hard';

// ============================================================
// Game Phase
// ============================================================
export type GamePhase =
  | 'lobby'    // 参加待ち
  | 'game-select' // ゲーム選択
  | 'game-settings' // ゲーム設定
  | 'topic'    // お題選択中
  | 'clue'     // ヒント入力中
  | 'arrange'  // 並び替え中
  | 'ranking-reveal' // ランキング公開中
  | 'ranking-result' // ランキング結果
  | 'result'   // ラウンド結果表示
  | 'wordwolf-reveal' // ワード配布
  | 'wordwolf-talk'   // 会話フェーズ
  | 'wordwolf-vote'   // 投票フェーズ
  | 'wordwolf-result' // ワードウルフ結果
  | 'drawguess-drawing' // お絵描き中
  | 'drawguess-result'  // お絵描き結果
  | 'finished'; // 全ラウンド終了

// ============================================================
// Round
// ============================================================
export interface ItoRoundState {
  game: 'ito';
  roundNumber: number;       // 1-indexed
  topic: string;             // お題
  /** このラウンドでお題を決めるプレイヤーID */
  topicChooserId: string;
  /** ランダムお題に変更した回数（最大10回） */
  topicChangeCount: number;
  /** ヒントを提出済みのプレイヤーID */
  submittedCluePlayerIds: string[];
  /** 公開されたヒント一覧 (clueフェーズ完了後) */
  clues: { playerId: string; clue: string }[];
  /** 並び替え順 (プレイヤーID配列、小さい順) */
  arrangedOrder: string[];
  /** 正解順 (サーバーのみ保持、result時に公開) */
  correctOrder?: string[];
  /** ラウンド成功かどうか */
  isCorrect?: boolean;
}

export interface WordWolfRoundState {
  game: 'word-wolf';
  roundNumber: number;
  talkSeconds: number;
  voteSubmittedPlayerIds: string[];
  votedPlayerId?: string;
  votedPlayerName?: string;
  wolfPlayerNames?: string[];
  majorityWord?: string;
  minorityWord?: string;
  villageWon?: boolean;
}

export interface RankingRoundState {
  game: 'ranking';
  roundNumber: number;
  topic: string;
  topicChooserId: string;
  topicChangeCount: number;
  submittedCluePlayerIds: string[];
  clues: { playerId: string; clue: string }[];
  arrangedOrder: string[];
  rankingSelections: { playerId: string; rank: number }[];
  rankingSubmittedPlayerIds: string[];
  revealedRank: number;
  correctOrder?: string[];
  isCorrect?: boolean;
}

export interface DrawGuessStroke {
  tool: 'pen' | 'eraser';
  color: string;
  size: number;
  points: number[];
}

export interface DrawGuessRoundState {
  game: 'draw-guess';
  roundNumber: number;
  topic: string;
  drawerId: string;
  /** 正解済みプレイヤーID（早い順） */
  correctPlayerIds: string[];
  /** 回答提出済みプレイヤーID */
  guessSubmittedPlayerIds: string[];
  /** 残り秒数 */
  timeLeft: number;
  /** 制限時間 (秒) */
  timeLimit: number;
  /** ストローク履歴 (リアルタイム同期用) */
  strokes: DrawGuessStroke[];
}

export interface AllMatchRoundState {
  game: 'all-match';
  roundNumber: number;
  topic: string;
  topicChooserId: string;
  topicChangeCount: number;
  submittedCluePlayerIds: string[];
  clues: { playerId: string; clue: string }[];
  isCorrect?: boolean;
}

export type RoundState = ItoRoundState | RankingRoundState | WordWolfRoundState | DrawGuessRoundState | AllMatchRoundState;

// ============================================================
// Room / GameState
// ============================================================
export interface GameState {
  roomId: string;
  players: Player[];
  phase: GamePhase;
  /** 選択中 or 選択済みのゲーム */
  selectedGame: GameType | null;
  currentRound: RoundState | null;
  roundResults: RoundResult[];
  totalRounds: number;       // 10
  /** お題を決める人の選び方 */
  topicChooserMode: TopicChooserMode;
  score: number;             // 累積成功数
  /** 次のラウンドでお題を決めるプレイヤーのインデックス（players配列基準） */
  topicChooserIndex: number;
  /** ワードウルフの会話時間（秒） */
  wordWolfTalkSeconds: number;
  /** ワードウルフ人数設定 */
  wordWolfCountMode: WordWolfCountMode;
  /** お絵描きクイズ制限時間（0は無制限） */
  drawGuessTimeLimit: DrawGuessTimeLimit;
  /** お絵描きクイズ難易度 */
  drawGuessDifficulty: DrawGuessDifficulty;
}

export interface ItoRoundResult {
  game: 'ito';
  roundNumber: number;
  topic: string;
  isCorrect: boolean;
  correctOrder: { playerId: string; playerName: string; secretNumber: number }[];
}

export interface WordWolfRoundResult {
  game: 'word-wolf';
  roundNumber: number;
  majorityWord: string;
  minorityWord: string;
  votedPlayerName: string;
  wolfPlayerNames: string[];
  isCorrect: boolean;
}

export interface RankingRoundResult {
  game: 'ranking';
  roundNumber: number;
  topic: string;
  isCorrect: boolean;
  rankingCards: { playerId: string; playerName: string; rank: number }[];
}

export interface DrawGuessRoundResult {
  game: 'draw-guess';
  roundNumber: number;
  topic: string;
  drawerName: string;
  isCorrect: boolean;
  /** 正解者一覧（早い順） */
  correctPlayers: { playerId: string; playerName: string; points: number }[];
  drawerPoints: number;
}

export interface AllMatchRoundResult {
  game: 'all-match';
  roundNumber: number;
  topic: string;
  isCorrect: boolean;
  matchedAnswer?: string;
  answers: { playerId: string; playerName: string; answer: string }[];
}

export type RoundResult = ItoRoundResult | RankingRoundResult | WordWolfRoundResult | DrawGuessRoundResult | AllMatchRoundResult;

// ============================================================
// Public game state (secretNumber を隠したもの)
// ============================================================
export type PublicPlayer = Omit<Player, 'secretNumber' | 'secretWord'>;

export interface PublicGameState {
  roomId: string;
  players: PublicPlayer[];
  phase: GamePhase;
  selectedGame: GameType | null;
  currentRound: RoundState | null;
  roundResults: RoundResult[];
  totalRounds: number;
  topicChooserMode: TopicChooserMode;
  score: number;
  wordWolfTalkSeconds: number;
  wordWolfCountMode: WordWolfCountMode;
  drawGuessTimeLimit: DrawGuessTimeLimit;
  drawGuessDifficulty: DrawGuessDifficulty;
}
