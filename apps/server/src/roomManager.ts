import type { GameState, Player, RoundState, RoundResult, TopicChooserMode, GameType } from '@ito/shared';
import { TOPICS } from '@ito/shared';

// ============================================================
// In-memory Room Store
// ============================================================
const rooms = new Map<string, GameState>();

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
  settings: { totalRounds: number; topicChooserMode: TopicChooserMode },
): GameState {
  if (room.phase !== 'lobby') {
    throw new Error('設定はロビーでのみ変更できます');
  }

  const player = room.players.find((p) => p.id === socketId);
  if (!player?.isHost) {
    throw new Error('設定を変更できるのはホストのみです');
  }

  const allowedRounds = new Set([5, 10, 15]);
  if (!allowedRounds.has(settings.totalRounds)) {
    throw new Error('ラウンド数は 5 / 10 / 15 から選択してください');
  }

  room.totalRounds = settings.totalRounds;
  room.topicChooserMode = settings.topicChooserMode;
  return room;
}

export function moveToGameSelect(room: GameState): GameState {
  room.phase = 'game-select';
  room.selectedGame = null;
  return room;
}

export function startSelectedGame(room: GameState, game: GameType): RoundState {
  room.selectedGame = game;
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
  const usedTopics = room.roundResults.map((r) => r.topic);
  const available = TOPICS.filter((t) => !usedTopics.includes(t));
  const topic = available.length > 0
    ? available[randInt(0, available.length - 1)]
    : TOPICS[randInt(0, TOPICS.length - 1)];

  const round: RoundState = {
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

/** ヒント提出 */
export function submitClue(room: GameState, socketId: string, clue: string): boolean {
  const round = room.currentRound;
  if (!round || room.phase !== 'clue') return false;
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
  const round = room.currentRound!;

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

  const result: RoundResult = {
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

/** 次のラウンドへ or 終了 */
export function advanceRound(room: GameState): 'next' | 'finished' {
  if (room.roundResults.length >= room.totalRounds) {
    room.phase = 'finished';
    return 'finished';
  }
  startNewRound(room);
  return 'next';
}
