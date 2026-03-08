// ============================================================
// Player
// ============================================================
export interface Player {
  id: string;          // socket.id
  name: string;
  isHost: boolean;
  isReady: boolean;
  /** 現在オンラインかどうか */
  connected: boolean;
  /** 現ラウンドで配られた秘密の数字 (1-100) */
  secretNumber?: number;
  /** 現ラウンドで提出したヒント */
  clue?: string;
}

export type TopicChooserMode = 'sequential' | 'random';

// ============================================================
// Game Phase
// ============================================================
export type GamePhase =
  | 'lobby'    // 参加待ち
  | 'topic'    // お題選択中
  | 'clue'     // ヒント入力中
  | 'arrange'  // 並び替え中
  | 'result'   // ラウンド結果表示
  | 'finished'; // 全ラウンド終了

// ============================================================
// Round
// ============================================================
export interface RoundState {
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

// ============================================================
// Room / GameState
// ============================================================
export interface GameState {
  roomId: string;
  players: Player[];
  phase: GamePhase;
  currentRound: RoundState | null;
  roundResults: RoundResult[];
  totalRounds: number;       // 10
  /** お題を決める人の選び方 */
  topicChooserMode: TopicChooserMode;
  score: number;             // 累積成功数
  /** 次のラウンドでお題を決めるプレイヤーのインデックス（players配列基準） */
  topicChooserIndex: number;
}

export interface RoundResult {
  roundNumber: number;
  topic: string;
  isCorrect: boolean;
  correctOrder: { playerId: string; playerName: string; secretNumber: number }[];
}

// ============================================================
// Public game state (secretNumber を隠したもの)
// ============================================================
export type PublicPlayer = Omit<Player, 'secretNumber'>;

export interface PublicGameState {
  roomId: string;
  players: PublicPlayer[];
  phase: GamePhase;
  currentRound: RoundState | null;
  roundResults: RoundResult[];
  totalRounds: number;
  topicChooserMode: TopicChooserMode;
  score: number;
}
