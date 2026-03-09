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
export type GameType = 'ito' | 'word-wolf';
export type WordWolfCountMode = 'auto' | 'one' | 'two';

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
  | 'result'   // ラウンド結果表示
  | 'wordwolf-reveal' // ワード配布
  | 'wordwolf-talk'   // 会話フェーズ
  | 'wordwolf-vote'   // 投票フェーズ
  | 'wordwolf-result' // ワードウルフ結果
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

export type RoundState = ItoRoundState | WordWolfRoundState;

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

export type RoundResult = ItoRoundResult | WordWolfRoundResult;

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
}
