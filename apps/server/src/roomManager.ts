import type {
  GameState,
  Player,
  RoundState,
  RoundResult,
  TopicChooserMode,
  GameType,
  WordWolfCountMode,
  ItoRoundState,
  ItoRoundResult,
  WordWolfRoundResult,
} from '@ito/shared';
import { TOPICS, PRESET_WORD_WOLF_TOPICS } from '@ito/shared';

// ============================================================
// In-memory Room Store
// ============================================================
const rooms = new Map<string, GameState>();

interface WordWolfSecretState {
  majorityWord: string;
  minorityWord: string;
  wolfPlayerIds: Set<string>;
  votes: Map<string, string>;
}

const wordWolfSecrets = new Map<string, WordWolfSecretState>();

function toWordWolfTopicKey(majorityWord: string, minorityWord: string): string {
  return `${majorityWord}__${minorityWord}`;
}

function buildWordWolfTopicPool(room: GameState): Array<{ majorityWord: string; minorityWord: string }> {
  const fromPreset = PRESET_WORD_WOLF_TOPICS.map((topic) => ({
    majorityWord: topic.majorityWord,
    minorityWord: topic.minorityWord,
  }));

  const fromPlayerNames: Array<{ majorityWord: string; minorityWord: string }> = [];
  for (let i = 0; i < room.players.length; i += 1) {
    for (let j = i + 1; j < room.players.length; j += 1) {
      const a = room.players[i]?.name?.trim();
      const b = room.players[j]?.name?.trim();
      if (!a || !b || a === b) continue;
      fromPlayerNames.push({ majorityWord: a, minorityWord: b });
    }
  }

  const merged = [...fromPreset, ...fromPlayerNames];
  const seen = new Set<string>();
  const unique: Array<{ majorityWord: string; minorityWord: string }> = [];
  for (const topic of merged) {
    const key = toWordWolfTopicKey(topic.majorityWord, topic.minorityWord);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(topic);
  }

  return unique;
}

function buildWordWolfExampleTalk(): { title: string; lines: string[] } {
  const prompts = [
    '（これの第一印象は？）',
    '（あなたはこれを好きですか？）',
    '（どんな時にこれを使いますか？）',
    '（これを一言で表すと？）',
  ];

  return {
    title: 'AI例トーク',
    lines: [prompts[randInt(0, prompts.length - 1)]],
  };
}

/** 4桁のルームID生成 */
function generateRoomId(): string {
  let id: string;
  do {
    id = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (rooms.has(id));
  return id;
}

/** ランダムな整数 [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 配列シャッフル (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// Room CRUD
// ============================================================
export function createRoom(hostSocketId: string, hostName: string): GameState {
  const roomId = generateRoomId();
  const host: Player = {
    id: hostSocketId,
    name: hostName,
    isHost: true,
    isReady: true,
    connected: true,
  };
  const state: GameState = {
    roomId,
    players: [host],
    phase: 'lobby',
    selectedGame: null,
    currentRound: null,
    roundResults: [],
    totalRounds: 10,
    topicChooserMode: 'sequential',
    score: 0,
    topicChooserIndex: 0,
    wordWolfTalkSeconds: 120,
    wordWolfCountMode: 'auto',
  };
  rooms.set(roomId, state);
  return state;
}

export function joinRoom(roomId: string, socketId: string, playerName: string): GameState {
  const room = rooms.get(roomId);
  if (!room) throw new Error('ルームが存在しません');
  if (room.phase !== 'lobby') throw new Error('ゲームが既に開始されています');
  if (room.players.length >= 8) throw new Error('ルームが満員です');
  if (room.players.some((p) => p.id === socketId)) throw new Error('既に参加しています');

  // 既存プレイヤー名とのマッチがあれば「席に戻る」とみなして再接続扱い
  const existing = room.players.find((p) => p.name === playerName && !p.connected);
  if (existing) {
    existing.id = socketId;
    existing.connected = true;
    // 切断中は準備状態をリセット
    existing.isReady = false;
    return room;
  }

  room.players.push({
    id: socketId,
    name: playerName,
    isHost: false,
    isReady: false,
    connected: true,
  });
  return room;
}

export function leaveRoom(socketId: string): { room: GameState; removed: boolean } | null {
  for (const [, room] of rooms) {
    const idx = room.players.findIndex((p) => p.id === socketId);
    if (idx === -1) continue;
    room.players.splice(idx, 1);
    // ホストが抜けた場合
    if (room.players.length > 0 && !room.players.some((p) => p.isHost)) {
      room.players[0].isHost = true;
    }
    if (room.players.length === 0) {
      rooms.delete(room.roomId);
      return { room, removed: true };
    }
    return { room, removed: false };
  }
  return null;
}

/** 一時的な切断（ブラウザを閉じた等）を扱う。席は残しつつオフライン扱い。 */
export function disconnectPlayer(socketId: string): GameState | null {
  for (const [, room] of rooms) {
    const player = room.players.find((p) => p.id === socketId);
    if (!player) continue;

    player.connected = false;
    player.isReady = false;

    // ホストが落ちた場合は次のオンラインの人にホスト権限を移譲
    if (player.isHost) {
      player.isHost = false;
      const nextHost = room.players.find((p) => p.connected && p.id !== socketId);
      if (nextHost) {
        nextHost.isHost = true;
      }
    }

    return room;
  }
  return null;
}

export function toggleReady(socketId: string): GameState | null {
  const room = findRoomByPlayer(socketId);
  if (!room) return null;
  const player = room.players.find((p) => p.id === socketId);
  if (player) player.isReady = !player.isReady;
  return room;
}

export function getRoom(roomId: string): GameState | undefined {
  return rooms.get(roomId);
}

export function findRoomByPlayer(socketId: string): GameState | undefined {
  for (const [, room] of rooms) {
    if (room.players.some((p) => p.id === socketId)) return room;
  }
  return undefined;
}

export function updateRoomSettings(
  room: GameState,
  socketId: string,
  settings: {
    totalRounds: number;
    topicChooserMode: TopicChooserMode;
    wordWolfTalkSeconds: number;
    wordWolfCountMode: WordWolfCountMode;
  },
): GameState {
  const allowedPhases = new Set(['lobby', 'game-select', 'game-settings']);
  if (!allowedPhases.has(room.phase)) {
    throw new Error('設定は準備フェーズでのみ変更できます');
  }

  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('設定を変更できるのはホストのみです');
  }

  const allowedRounds = new Set([5, 10, 15]);
  if (!allowedRounds.has(settings.totalRounds)) {
    throw new Error('ラウンド数は 5 / 10 / 15 から選択してください');
  }

  const allowedTalkSeconds = new Set([60, 120, 180]);
  if (!allowedTalkSeconds.has(settings.wordWolfTalkSeconds)) {
    throw new Error('会話時間は 60 / 120 / 180 から選択してください');
  }

  const allowedWolfCountMode = new Set<WordWolfCountMode>(['auto', 'one', 'two']);
  if (!allowedWolfCountMode.has(settings.wordWolfCountMode)) {
    throw new Error('ワードウルフ人数設定が不正です');
  }

  room.totalRounds = settings.totalRounds;
  room.topicChooserMode = settings.topicChooserMode;
  room.wordWolfTalkSeconds = settings.wordWolfTalkSeconds;
  room.wordWolfCountMode = settings.wordWolfCountMode;
  return room;
}

export function moveToGameSelect(room: GameState): GameState {
  room.phase = 'game-select';
  if (!room.selectedGame) {
    room.selectedGame = 'ito';
  }
  return room;
}

export function selectGame(room: GameState, socketId: string, game: GameType): GameState {
  if (room.phase !== 'game-select') {
    throw new Error('ゲーム選択中のみ変更できます');
  }
  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('ゲームを選択できるのはホストのみです');
  }
  room.selectedGame = game;
  return room;
}

export function moveToGameSettings(room: GameState, socketId: string): GameState {
  if (room.phase !== 'game-select') {
    throw new Error('ゲーム選択中のみ設定へ進めます');
  }
  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('設定へ進めるのはホストのみです');
  }
  if (!room.selectedGame) {
    throw new Error('ゲームを選択してください');
  }
  room.phase = 'game-settings';
  return room;
}

export function returnToGameSelect(room: GameState, socketId: string): string {
  const player = room.players.find((p) => p.id === socketId);
  if (!player) {
    throw new Error('プレイヤーが見つかりません');
  }

  room.phase = 'game-select';
  room.currentRound = null;
  room.roundResults = [];
  room.score = 0;
  room.topicChooserIndex = 0;
  if (!room.selectedGame) {
    room.selectedGame = 'ito';
  }
  room.players.forEach((p) => {
    p.secretNumber = undefined;
    p.secretWord = undefined;
    p.clue = undefined;
  });
  wordWolfSecrets.delete(room.roomId);

  return player.name;
}

export function startSelectedGame(room: GameState, game: GameType): RoundState {
  room.selectedGame = game;
  if (game === 'word-wolf') {
    return startWordWolfRound(room);
  }
  return startNewRound(room);
}

// ============================================================
// Game Flow
// ============================================================

/** ラウンド開始: 数字配布・お題選択 */
export function startNewRound(room: GameState): RoundState {
  const roundNumber = room.roundResults.length + 1;

   if (room.players.length === 0) {
     throw new Error('プレイヤーがいません');
   }

   // このラウンドのお題決定者を決定
   // sequential: ホスト→他プレイヤーでローテーション
   // random: 毎ラウンドランダム
   const index = room.topicChooserMode === 'random'
     ? randInt(0, room.players.length - 1)
     : room.topicChooserIndex % room.players.length;
   const topicChooser = room.players[index];
   if (room.topicChooserMode === 'sequential') {
     room.topicChooserIndex = (index + 1) % room.players.length;
   }

  // 重複しない数字を配布
  const numbers = shuffle(Array.from({ length: 100 }, (_, i) => i + 1)).slice(0, room.players.length);
  room.players.forEach((p, i) => {
    p.secretNumber = numbers[i];
    p.clue = undefined;
  });

  // お題
  const usedTopics = room.roundResults
    .filter((r): r is ItoRoundResult => r.game === 'ito')
    .map((r) => r.topic);
  const available = TOPICS.filter((t) => !usedTopics.includes(t));
  const topic = available.length > 0
    ? available[randInt(0, available.length - 1)]
    : TOPICS[randInt(0, TOPICS.length - 1)];

  const round: ItoRoundState = {
    game: 'ito',
    roundNumber,
    topic,
    topicChooserId: topicChooser.id,
    topicChangeCount: 0,
    submittedCluePlayerIds: [],
    clues: [],
    arrangedOrder: [],
  };
  room.currentRound = round;
  // まずはお題選択フェーズから開始
  room.phase = 'topic';
  return round;
}

export function startWordWolfRound(room: GameState): RoundState {
  const roundNumber = room.roundResults.length + 1;

  if (room.players.length < 3) {
    throw new Error('ワードウルフは3人以上で遊べます');
  }

  const allTopics = buildWordWolfTopicPool(room);
  const usedTopicKeys = new Set(
    room.roundResults
      .filter((r): r is WordWolfRoundResult => r.game === 'word-wolf')
      .map((r) => toWordWolfTopicKey(r.majorityWord, r.minorityWord)),
  );
  const availableTopics = allTopics.filter(
    (topic) => !usedTopicKeys.has(toWordWolfTopicKey(topic.majorityWord, topic.minorityWord)),
  );
  const topicPool = availableTopics.length > 0 ? availableTopics : allTopics;
  const pair = topicPool[randInt(0, topicPool.length - 1)];
  const wolfCount =
    room.wordWolfCountMode === 'one'
      ? 1
      : room.wordWolfCountMode === 'two'
        ? 2
        : room.players.length >= 6
          ? 1
          : 2;
  const shuffledPlayers = shuffle(room.players.map((p) => p.id));
  const wolfIds = new Set(shuffledPlayers.slice(0, wolfCount));

  room.players.forEach((p) => {
    p.secretNumber = undefined;
    p.clue = undefined;
    p.secretWord = wolfIds.has(p.id) ? pair.minorityWord : pair.majorityWord;
  });

  wordWolfSecrets.set(room.roomId, {
    majorityWord: pair.majorityWord,
    minorityWord: pair.minorityWord,
    wolfPlayerIds: wolfIds,
    votes: new Map<string, string>(),
  });

  const round: RoundState = {
    game: 'word-wolf',
    roundNumber,
    talkSeconds: room.wordWolfTalkSeconds,
    voteSubmittedPlayerIds: [],
  };

  room.currentRound = round;
  room.phase = 'wordwolf-reveal';
  return round;
}

/** ヒント提出 */
export function submitClue(room: GameState, socketId: string, clue: string): boolean {
  const round = room.currentRound;
  if (!round || room.phase !== 'clue') return false;
  if (round.game !== 'ito') return false;
  if (round.submittedCluePlayerIds.includes(socketId)) return false;

  const player = room.players.find((p) => p.id === socketId);
  if (!player) return false;

  player.clue = clue;
  round.submittedCluePlayerIds.push(socketId);
  round.clues.push({ playerId: socketId, clue });

  // 全員提出済み→arrangeへ
  if (round.submittedCluePlayerIds.length === room.players.length) {
    room.phase = 'arrange';
    return true; // phase changed
  }
  return false;
}

/** 並び替え確定 → 判定 */
export function confirmArrange(room: GameState, order: string[]): RoundResult {
  const round = room.currentRound as ItoRoundState;

  // 正解順 (number が大きい順)
  const correctOrder = [...room.players]
    .sort((a, b) => (b.secretNumber ?? 0) - (a.secretNumber ?? 0))
    .map((p) => p.id);

  round.correctOrder = correctOrder;
  round.arrangedOrder = order;

  const isCorrect = correctOrder.every((id, i) => id === order[i]);
  round.isCorrect = isCorrect;
  if (isCorrect) room.score += 1;

  room.phase = 'result';

  const result: ItoRoundResult = {
    game: 'ito',
    roundNumber: round.roundNumber,
    topic: round.topic,
    isCorrect,
    correctOrder: correctOrder.map((id) => {
      const p = room.players.find((pl) => pl.id === id)!;
      return { playerId: id, playerName: p.name, secretNumber: p.secretNumber ?? 0 };
    }),
  };
  room.roundResults.push(result);
  return result;
}

export function startWordWolfTalk(room: GameState, socketId: string): void {
  if (room.phase !== 'wordwolf-reveal') {
    throw new Error('このフェーズでは開始できません');
  }
  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('ホストのみ開始できます');
  }
  room.phase = 'wordwolf-talk';
}

export function startWordWolfVote(room: GameState, socketId: string): void {
  if (room.phase !== 'wordwolf-talk') {
    throw new Error('このフェーズでは投票に進めません');
  }
  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('ホストのみ投票フェーズに進めます');
  }
  room.phase = 'wordwolf-vote';
}

export function getWordWolfExampleTalk(room: GameState, socketId: string): { title: string; lines: string[] } {
  if (room.phase !== 'wordwolf-talk') {
    throw new Error('トーク中のみ例トークを表示できます');
  }
  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('例トークを出せるのはホストのみです');
  }
  return buildWordWolfExampleTalk();
}

export function submitWordWolfVote(
  room: GameState,
  socketId: string,
  targetPlayerId: string,
): WordWolfRoundResult | null {
  if (room.phase !== 'wordwolf-vote') return null;
  const round = room.currentRound;
  if (!round || round.game !== 'word-wolf') return null;

  const secret = wordWolfSecrets.get(room.roomId);
  if (!secret) return null;

  if (secret.votes.has(socketId)) {
    throw new Error('すでに投票済みです');
  }
  if (!room.players.some((p) => p.id === targetPlayerId)) {
    throw new Error('投票先のプレイヤーが見つかりません');
  }

  secret.votes.set(socketId, targetPlayerId);
  round.voteSubmittedPlayerIds.push(socketId);

  if (round.voteSubmittedPlayerIds.length < room.players.length) {
    return null;
  }

  const voteCount = new Map<string, number>();
  for (const target of secret.votes.values()) {
    voteCount.set(target, (voteCount.get(target) ?? 0) + 1);
  }

  let maxVote = -1;
  let topTargets: string[] = [];
  for (const [target, count] of voteCount.entries()) {
    if (count > maxVote) {
      maxVote = count;
      topTargets = [target];
    } else if (count === maxVote) {
      topTargets.push(target);
    }
  }

  const votedPlayerId = topTargets[randInt(0, topTargets.length - 1)];
  const votedPlayer = room.players.find((p) => p.id === votedPlayerId);
  const villageWon = !secret.wolfPlayerIds.has(votedPlayerId);
  if (villageWon) {
    room.score += 1;
  }

  round.votedPlayerId = votedPlayerId;
  round.votedPlayerName = votedPlayer?.name ?? '???';
  round.wolfPlayerNames = room.players
    .filter((p) => secret.wolfPlayerIds.has(p.id))
    .map((p) => p.name);
  round.majorityWord = secret.majorityWord;
  round.minorityWord = secret.minorityWord;
  round.villageWon = villageWon;

  const result: WordWolfRoundResult = {
    game: 'word-wolf',
    roundNumber: round.roundNumber,
    majorityWord: secret.majorityWord,
    minorityWord: secret.minorityWord,
    votedPlayerName: votedPlayer?.name ?? '???',
    wolfPlayerNames: round.wolfPlayerNames,
    isCorrect: villageWon,
  };

  room.roundResults.push(result);
  room.phase = 'wordwolf-result';
  return result;
}

/** 次のラウンドへ or 終了 */
export function advanceRound(room: GameState): 'next' | 'finished' {
  if (room.roundResults.length >= room.totalRounds) {
    room.phase = 'finished';
    return 'finished';
  }

  if (room.selectedGame === 'word-wolf') {
    startWordWolfRound(room);
  } else {
    startNewRound(room);
  }
  return 'next';
}
