import type {
  GameState,
  Player,
  RoundState,
  RoundResult,
  TopicChooserMode,
  GameType,
  WordWolfCountMode,
  PlayerIconId,
  ItoRoundState,
  ItoRoundResult,
  RankingRoundState,
  RankingRoundResult,
  WordWolfRoundResult,
  DrawGuessRoundState,
  DrawGuessRoundResult,
  DrawGuessStroke,
  DrawGuessDifficulty,
  DrawGuessTimeLimit,
  AllMatchRoundState,
  AllMatchRoundResult,
  NgWordRoundState,
  NgWordRoundResult,
  NgWordIncident,
} from '@ito/shared';
import { TOPICS, RANKING_TOPICS, PRESET_WORD_WOLF_TOPICS, PRESET_WORD_WOLF_EXAMPLE_TALKS, DRAW_GUESS_TOPICS_BY_DIFFICULTY, ALL_MATCH_TOPICS, NG_WORDS } from '@ito/shared';

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

interface DrawGuessSecretState {
  topic: string;
  drawerId: string;
  strokes: DrawGuessStroke[];
  undoneStrokes: DrawGuessStroke[];
  correctPlayerIds: string[];
  timer: ReturnType<typeof setInterval> | null;
  timeLeft: number;
  onTick?: (roomId: string, timeLeft: number) => void;
  onTimeUp?: (roomId: string) => void;
}

const drawGuessSecrets = new Map<string, DrawGuessSecretState>();

export type PlayerExitResult =
  | { kind: 'room-closed'; roomId: string; actorName: string }
  | { kind: 'state-updated'; room: GameState; actorName: string; forcedToGameSelect: boolean };

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
  const prompts = PRESET_WORD_WOLF_EXAMPLE_TALKS;
  const fallback = '（これの第一印象は？）';
  const line = prompts.length > 0 ? prompts[randInt(0, prompts.length - 1)] : fallback;

  return {
    title: 'AI例トーク',
    lines: [line],
  };
}

/** 4桁のルームID生成 */
function generateRoomId(): string {
  const ROOM_ID_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  let id: string;
  do {
    id = Array.from({ length: 4 }, () => ROOM_ID_CHARS[randInt(0, ROOM_ID_CHARS.length - 1)]).join('');
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
export function createRoom(hostSocketId: string, hostName: string, hostIconId: PlayerIconId): GameState {
  const roomId = generateRoomId();
  const host: Player = {
    id: hostSocketId,
    name: hostName,
    playerIconId: hostIconId,
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
    drawGuessTimeLimit: 90,
    drawGuessDifficulty: 'normal',
    ngWordWordCount: 3,
  };
  rooms.set(roomId, state);
  return state;
}

export function joinRoom(roomId: string, socketId: string, playerName: string, playerIconId: PlayerIconId): GameState {
  const room = rooms.get(roomId);
  if (!room) throw new Error('ルームが存在しません');
  const joinablePhases = new Set(['lobby', 'game-select', 'game-settings']);
  if (!joinablePhases.has(room.phase)) throw new Error('ゲーム中は参加できません');
  if (room.players.length >= 8) throw new Error('ルームが満員です');
  if (room.players.some((p) => p.id === socketId)) throw new Error('既に参加しています');

  // 既存プレイヤー名とのマッチがあれば「席に戻る」とみなして再接続扱い
  const existing = room.players.find((p) => p.name === playerName && !p.connected);
  if (existing) {
    existing.id = socketId;
    existing.playerIconId = playerIconId;
    existing.connected = true;
    // 切断中は準備状態をリセット
    existing.isReady = false;
    return room;
  }

  room.players.push({
    id: socketId,
    name: playerName,
    playerIconId,
    isHost: false,
    isReady: false,
    connected: true,
  });
  return room;
}

function resetGameProgressToSelect(room: GameState): void {
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
  stopDrawGuessTimer(room.roomId);
  drawGuessSecrets.delete(room.roomId);
}

function applyItoExitAdjustments(room: GameState, removedPlayerId: string): void {
  const round = room.currentRound;
  if (!round || (round.game !== 'ito' && round.game !== 'ranking' && round.game !== 'all-match' && round.game !== 'ng-word')) return;

  if (round.game === 'ng-word') {
    if (round.topicChooserId === removedPlayerId) {
      round.topicChooserId = room.players[0]?.id ?? '';
    }
    round.eliminatedPlayerIds = round.eliminatedPlayerIds.filter((id) => id !== removedPlayerId);
    round.incidents = round.incidents.filter(
      (incident) => incident.targetId !== removedPlayerId && incident.reporterId !== removedPlayerId,
    );
    return;
  }

  if (round.game === 'all-match') {
    if (round.topicChooserId === removedPlayerId) {
      round.topicChooserId = room.players[0]?.id ?? '';
    }
    round.submittedCluePlayerIds = round.submittedCluePlayerIds.filter((id) => id !== removedPlayerId);
    round.clues = round.clues.filter((c) => c.playerId !== removedPlayerId);
    if (room.phase === 'clue' && round.submittedCluePlayerIds.length >= room.players.length) {
      finalizeAllMatchRound(room);
    }
    return;
  }

  round.submittedCluePlayerIds = round.submittedCluePlayerIds.filter((id) => id !== removedPlayerId);
  round.clues = round.clues.filter((c) => c.playerId !== removedPlayerId);
  round.arrangedOrder = round.arrangedOrder.filter((id) => id !== removedPlayerId);
  if (round.correctOrder) {
    round.correctOrder = round.correctOrder.filter((id) => id !== removedPlayerId);
  }

  if (round.topicChooserId === removedPlayerId) {
    round.topicChooserId = room.players[0]?.id ?? '';
  }

  if (room.phase === 'clue' && round.submittedCluePlayerIds.length >= room.players.length) {
    room.phase = 'arrange';
  }
}

export function leaveRoom(socketId: string): PlayerExitResult | null {
  for (const [, room] of rooms) {
    const idx = room.players.findIndex((p) => p.id === socketId);
    if (idx === -1) continue;
    const leavingPlayer = room.players[idx];
    room.players.splice(idx, 1);

    if (leavingPlayer.isHost) {
      wordWolfSecrets.delete(room.roomId);
      stopDrawGuessTimer(room.roomId);
      drawGuessSecrets.delete(room.roomId);
      rooms.delete(room.roomId);
      return { kind: 'room-closed', roomId: room.roomId, actorName: leavingPlayer.name };
    }

    if (room.players.length === 0) {
      wordWolfSecrets.delete(room.roomId);
      stopDrawGuessTimer(room.roomId);
      drawGuessSecrets.delete(room.roomId);
      rooms.delete(room.roomId);
      return { kind: 'room-closed', roomId: room.roomId, actorName: leavingPlayer.name };
    }

    let forcedToGameSelect = false;
    const isWordWolfInGamePhase =
      room.selectedGame === 'word-wolf'
      && room.phase !== 'lobby'
      && room.phase !== 'game-select'
      && room.phase !== 'game-settings';

    const isDrawGuessInGamePhase =
      room.selectedGame === 'draw-guess'
      && room.phase !== 'lobby'
      && room.phase !== 'game-select'
      && room.phase !== 'game-settings';

    if (isWordWolfInGamePhase || isDrawGuessInGamePhase) {
      resetGameProgressToSelect(room);
      forcedToGameSelect = true;
    } else {
      applyItoExitAdjustments(room, leavingPlayer.id);
    }

    return { kind: 'state-updated', room, actorName: leavingPlayer.name, forcedToGameSelect };
  }
  return null;
}

/** 切断時は離脱と同等に扱い、ゲームから除外する。 */
export function disconnectPlayer(socketId: string): PlayerExitResult | null {
  return leaveRoom(socketId);
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
    drawGuessTimeLimit: DrawGuessTimeLimit;
    drawGuessDifficulty: DrawGuessDifficulty;
    ngWordWordCount: number;
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

  const allowedRounds = room.selectedGame === 'ng-word'
    ? new Set([1, 2, 3, 4, 5])
    : new Set([5, 10, 15]);
  if (!allowedRounds.has(settings.totalRounds)) {
    if (room.selectedGame === 'ng-word') {
      throw new Error('ラウンド数は 1〜5 から選択してください');
    }
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

  const allowedDrawGuessTimeLimit = new Set<DrawGuessTimeLimit>([0, 60, 90, 120]);
  if (!allowedDrawGuessTimeLimit.has(settings.drawGuessTimeLimit)) {
    throw new Error('お絵描きクイズ制限時間が不正です');
  }

  const allowedDrawGuessDifficulty = new Set<DrawGuessDifficulty>(['easy', 'normal', 'hard']);
  if (!allowedDrawGuessDifficulty.has(settings.drawGuessDifficulty)) {
    throw new Error('お絵描きクイズ難易度が不正です');
  }

  if (!Number.isInteger(settings.ngWordWordCount) || settings.ngWordWordCount < 1 || settings.ngWordWordCount > 5) {
    throw new Error('お題量は 1〜5 で指定してください');
  }

  room.totalRounds = settings.totalRounds;
  room.topicChooserMode = settings.topicChooserMode;
  room.wordWolfTalkSeconds = settings.wordWolfTalkSeconds;
  room.wordWolfCountMode = settings.wordWolfCountMode;
  room.drawGuessTimeLimit = settings.drawGuessTimeLimit;
  room.drawGuessDifficulty = settings.drawGuessDifficulty;
  room.ngWordWordCount = settings.ngWordWordCount;
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

  resetGameProgressToSelect(room);

  return player.name;
}

export function startSelectedGame(room: GameState, game: GameType): RoundState {
  room.selectedGame = game;
  if (game === 'word-wolf') {
    return startWordWolfRound(room);
  }
  if (game === 'ng-word') {
    return startNgWordRound(room);
  }
  if (game === 'draw-guess') {
    return startDrawGuessRound(room);
  }
  if (game === 'all-match') {
    return startAllMatchRound(room);
  }
  return startClassicRound(room, game);
}

// ============================================================
// Game Flow
// ============================================================

/** ラウンド開始: 数字配布・お題選択 */
export function startNewRound(room: GameState): RoundState {
  return startClassicRound(room, 'ito');
}

function startRankingRound(room: GameState): RoundState {
  return startClassicRound(room, 'ranking');
}

function startAllMatchRound(room: GameState): RoundState {
  const roundNumber = room.roundResults.length + 1;
  if (room.players.length === 0) {
    throw new Error('プレイヤーがいません');
  }

  const index = room.topicChooserMode === 'random'
    ? randInt(0, room.players.length - 1)
    : room.topicChooserIndex % room.players.length;
  const topicChooser = room.players[index];
  if (room.topicChooserMode === 'sequential') {
    room.topicChooserIndex = (index + 1) % room.players.length;
  }

  const usedTopics = room.roundResults
    .filter((r): r is AllMatchRoundResult => r.game === 'all-match')
    .map((r) => r.topic);
  const available = ALL_MATCH_TOPICS.filter((t) => !usedTopics.includes(t));
  const topicPool = available.length > 0 ? available : ALL_MATCH_TOPICS;
  const topic = topicPool[randInt(0, topicPool.length - 1)];

  room.players.forEach((p) => {
    p.secretNumber = undefined;
    p.secretWord = undefined;
    p.clue = undefined;
  });

  const round: AllMatchRoundState = {
    game: 'all-match',
    roundNumber,
    topic,
    topicChooserId: topicChooser.id,
    topicChangeCount: 0,
    submittedCluePlayerIds: [],
    clues: [],
  };
  room.currentRound = round;
  room.phase = 'topic';
  return round;
}

function startNgWordRound(room: GameState): RoundState {
  const roundNumber = room.roundResults.length + 1;
  if (room.players.length < 2) {
    throw new Error('NGワードゲームは2人以上で遊べます');
  }

  const index = room.topicChooserMode === 'random'
    ? randInt(0, room.players.length - 1)
    : room.topicChooserIndex % room.players.length;
  const topicChooser = room.players[index];
  if (room.topicChooserMode === 'sequential') {
    room.topicChooserIndex = (index + 1) % room.players.length;
  }

  room.players.forEach((p) => {
    p.secretNumber = undefined;
    p.secretWord = undefined;
    p.clue = undefined;
  });

  const wordAssignments = room.players.map((p) => ({
    playerId: p.id,
    words: shuffle(NG_WORDS).slice(0, room.ngWordWordCount),
  }));

  const round: NgWordRoundState = {
    game: 'ng-word',
    roundNumber,
    topic: '',
    topicChooserId: topicChooser.id,
    topicChangeCount: 0,
    wordAssignments,
    eliminatedPlayerIds: [],
    incidents: [],
  };
  room.currentRound = round;
  room.phase = 'ngword-talk';
  return round;
}

function startClassicRound(room: GameState, game: 'ito' | 'ranking'): RoundState {
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

  if (game === 'ito') {
    // itoのみ重複しない数字を配布
    const numbers = shuffle(Array.from({ length: 100 }, (_, i) => i + 1)).slice(0, room.players.length);
    room.players.forEach((p, i) => {
      p.secretNumber = numbers[i];
      p.clue = undefined;
    });
  } else {
    room.players.forEach((p) => {
      p.secretNumber = undefined;
      p.clue = undefined;
    });
  }

  // お題
  const presetTopics = game === 'ranking' ? RANKING_TOPICS : TOPICS;

  const usedTopics = room.roundResults
    .filter((r): r is ItoRoundResult | RankingRoundResult => r.game === game)
    .map((r) => r.topic);
  const available = presetTopics.filter((t) => !usedTopics.includes(t));
  const topic = available.length > 0
    ? available[randInt(0, available.length - 1)]
    : presetTopics[randInt(0, presetTopics.length - 1)];

  const round: ItoRoundState | RankingRoundState = game === 'ranking'
    ? {
      game: 'ranking',
      roundNumber,
      topic,
      topicChooserId: topicChooser.id,
      topicChangeCount: 0,
      submittedCluePlayerIds: [],
      clues: [],
      arrangedOrder: [],
      rankingSelections: [],
      rankingSubmittedPlayerIds: [],
      revealedRank: 0,
    }
    : {
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
  const requestedWolfCount =
    room.wordWolfCountMode === 'one'
      ? 1
      : room.wordWolfCountMode === 'two'
        ? 2
        : room.players.length >= 5
          ? 2
          : 1;
  // 少数派がワードウルフになるよう、常に半数未満に丸める
  const maxMinorityWolfCount = Math.max(1, Math.floor((room.players.length - 1) / 2));
  const wolfCount = Math.min(requestedWolfCount, maxMinorityWolfCount);
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
  if (round.game !== 'ito' && round.game !== 'ranking' && round.game !== 'all-match') return false;
  if (round.submittedCluePlayerIds.includes(socketId)) return false;

  const player = room.players.find((p) => p.id === socketId);
  if (!player) return false;

  player.clue = clue;
  round.submittedCluePlayerIds.push(socketId);
  round.clues.push({ playerId: socketId, clue });

  if (round.game === 'all-match') {
    if (round.submittedCluePlayerIds.length === room.players.length) {
      // 全員提出後はトピック決定者の合図待ち
      return false;
    }
    return false;
  }

  // 全員提出済み→arrangeへ
  if (round.submittedCluePlayerIds.length === room.players.length) {
    if (round.game === 'ito') {
      round.arrangedOrder = round.clues.map((c) => c.playerId);
    }
    room.phase = 'arrange';
    return true; // phase changed
  }
  return false;
}

/** 以心伝心: 全員提出後にトピック決定者が結果画面へ進める */
export function openAllMatchResult(room: GameState, socketId: string): void {
  const round = room.currentRound;
  if (!round || round.game !== 'all-match') {
    throw new Error('以心伝心のラウンドではありません');
  }
  if (room.phase !== 'clue') {
    throw new Error('このフェーズでは結果画面へ進めません');
  }
  if (round.submittedCluePlayerIds.length !== room.players.length) {
    throw new Error('全員の回答がまだ揃っていません');
  }
  if (round.topicChooserId !== socketId) {
    throw new Error('結果画面へ進めるのはお題を決めた人だけです');
  }
  room.phase = 'result';
}

export function eliminateNgWordPlayer(
  room: GameState,
  socketId: string,
  payload: { targetPlayerId: string },
): NgWordIncident {
  const round = room.currentRound;
  if (!round || round.game !== 'ng-word') {
    throw new Error('NGワードゲームのラウンドではありません');
  }
  if (room.phase !== 'ngword-talk') {
    throw new Error('会話フェーズ中のみ脱落処理できます');
  }
  if (payload.targetPlayerId === socketId) {
    throw new Error('自分自身は脱落させられません');
  }

  const target = room.players.find((p) => p.id === payload.targetPlayerId);
  const reporter = room.players.find((p) => p.id === socketId);
  if (!target || !reporter) {
    throw new Error('プレイヤーが見つかりません');
  }

  if (round.eliminatedPlayerIds.includes(target.id)) {
    throw new Error('そのプレイヤーは既に脱落済みです');
  }

  const incident: NgWordIncident = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    targetId: target.id,
    reporterId: reporter.id,
  };

  round.eliminatedPlayerIds.push(target.id);
  round.incidents.push(incident);
  return incident;
}

export function rerollNgWordAssignments(room: GameState, socketId: string): void {
  const round = room.currentRound;
  if (!round || round.game !== 'ng-word') {
    throw new Error('NGワードゲームのラウンドではありません');
  }
  if (room.phase !== 'ngword-talk') {
    throw new Error('会話フェーズ中のみお題変更できます');
  }
  const actor = room.players.find((p) => p.id === socketId);
  if (!actor?.isHost) {
    throw new Error('お題変更できるのはホストのみです');
  }

  // お題変更: 全員分のNGワードを再配布
  round.wordAssignments = room.players.map((p) => ({
    playerId: p.id,
    words: shuffle(NG_WORDS).slice(0, room.ngWordWordCount),
  }));
}

function buildNgWordRoundResult(room: GameState, round: NgWordRoundState): NgWordRoundResult {
  const alivePlayerIds = room.players
    .map((p) => p.id)
    .filter((id) => !round.eliminatedPlayerIds.includes(id));
  const winnerPlayerId = alivePlayerIds.length === 1 ? alivePlayerIds[0] : undefined;
  const winnerPlayerName = winnerPlayerId
    ? room.players.find((p) => p.id === winnerPlayerId)?.name ?? ''
    : undefined;

  return {
    game: 'ng-word',
    roundNumber: round.roundNumber,
    topic: round.topic,
    isCorrect: true,
    winnerPlayerId,
    winnerPlayerName,
  };
}

export function maybeFinishNgWordByElimination(room: GameState): NgWordRoundResult | null {
  const round = room.currentRound;
  if (!round || round.game !== 'ng-word') return null;
  if (room.phase !== 'ngword-talk') return null;

  const aliveCount = room.players.length - round.eliminatedPlayerIds.length;
  if (aliveCount > 1) return null;

  const result = buildNgWordRoundResult(room, round);
  room.roundResults.push(result);
  room.phase = 'ngword-result';
  return result;
}

export function finishNgWordTalk(room: GameState, socketId: string): NgWordRoundResult {
  const round = room.currentRound;
  if (!round || round.game !== 'ng-word') {
    throw new Error('NGワードゲームのラウンドではありません');
  }
  if (room.phase !== 'ngword-talk') {
    throw new Error('このフェーズでは終了できません');
  }
  const actor = room.players.find((p) => p.id === socketId);
  if (!actor?.isHost) {
    throw new Error('終了できるのはホストのみです');
  }

  const result = buildNgWordRoundResult(room, round);

  room.roundResults.push(result);
  room.phase = 'ngword-result';
  return result;
}

export function updateItoArrangeOrder(room: GameState, socketId: string, order: string[]): void {
  if (room.phase !== 'arrange') {
    throw new Error('このフェーズでは並び替えできません');
  }
  const round = room.currentRound;
  if (!round || round.game !== 'ito') {
    throw new Error('itoの並び替え中ではありません');
  }
  if (round.topicChooserId !== socketId) {
    throw new Error('並び替えできるのはお題を決めた人だけです');
  }
  const expected = round.clues.map((c) => c.playerId).sort();
  const received = [...order].sort();
  if (expected.length !== received.length || expected.some((id, idx) => id !== received[idx])) {
    throw new Error('不正な並び順です');
  }
  round.arrangedOrder = [...order];
}

function finalizeAllMatchRound(room: GameState): AllMatchRoundResult | null {
  const round = room.currentRound;
  if (!round || round.game !== 'all-match') return null;
  if (round.clues.length < room.players.length) return null;

  const normalized = round.clues.map((c) => c.clue.trim().toLowerCase());
  const first = normalized[0] ?? '';
  const isCorrect = normalized.every((v) => v.length > 0 && v === first);
  round.isCorrect = isCorrect;
  if (isCorrect) {
    room.score += 1;
  }

  const answers = round.clues.map((c) => {
    const player = room.players.find((p) => p.id === c.playerId);
    return {
      playerId: c.playerId,
      playerName: player?.name ?? '',
      answer: c.clue,
    };
  });

  const result: AllMatchRoundResult = {
    game: 'all-match',
    roundNumber: round.roundNumber,
    topic: round.topic,
    isCorrect,
    matchedAnswer: isCorrect ? round.clues[0]?.clue ?? '' : undefined,
    answers,
  };

  room.roundResults.push(result);
  room.phase = 'result';
  return result;
}

/** トピック決定者による以心伝心判定確定 */
export function judgeAllMatchRound(room: GameState, socketId: string, isCorrect: boolean): AllMatchRoundResult | null {
  const round = room.currentRound as AllMatchRoundState;
  if (!round || round.game !== 'all-match') return null;
  if (room.phase !== 'result') return null;
  if (round.judgedAsCorrect !== undefined) return null;

  // トピック決定者のみ判定可能
  if (round.topicChooserId !== socketId) {
    throw new Error('判定できるのはお題を決めた人だけです');
  }

  round.judgedAsCorrect = isCorrect;
  round.isCorrect = isCorrect;
  if (isCorrect) {
    room.score += 1;
  }

  const answers = round.clues.map((c) => {
    const player = room.players.find((p) => p.id === c.playerId);
    return {
      playerId: c.playerId,
      playerName: player?.name ?? '',
      answer: c.clue,
    };
  });

  const result: AllMatchRoundResult = {
    game: 'all-match',
    roundNumber: round.roundNumber,
    topic: round.topic,
    isCorrect,
    matchedAnswer: isCorrect ? round.clues[0]?.clue ?? '' : undefined,
    answers,
  };

  room.roundResults.push(result);
  // 判定後も result 画面上で成功/失敗表示→次ラウンド進行を行う
  room.phase = 'result';
  return result;
}

/** 並び替え確定 → 判定 */
export function confirmArrange(room: GameState, order: string[]): RoundResult | null {
  const round = room.currentRound as ItoRoundState | RankingRoundState;

  if (round.game === 'ranking') {
    throw new Error('ランキングは各自の順位提出で確定します');
  }

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

  const arrangedPlayers = order.map((id) => {
    const p = room.players.find((pl) => pl.id === id)!;
    return { playerId: id, playerName: p.name, secretNumber: p.secretNumber ?? 0 };
  });

  const sortedPlayers = correctOrder.map((id) => {
    const p = room.players.find((pl) => pl.id === id)!;
    return { playerId: id, playerName: p.name, secretNumber: p.secretNumber ?? 0 };
  });

  const result: ItoRoundResult = {
    game: 'ito',
    roundNumber: round.roundNumber,
    topic: round.topic,
    isCorrect,
    arrangedOrder: arrangedPlayers,
    correctOrder: sortedPlayers,
  };
  room.roundResults.push(result);
  return result;
}

export function submitRankingSelfRank(room: GameState, socketId: string, rank: number): void {
  if (room.phase !== 'arrange') {
    throw new Error('このフェーズでは順位を提出できません');
  }
  const round = room.currentRound;
  if (!round || round.game !== 'ranking') {
    throw new Error('ランキングのラウンド情報が見つかりません');
  }
  if (!room.players.some((p) => p.id === socketId)) {
    throw new Error('プレイヤーが見つかりません');
  }
  const maxRank = room.players.length;
  if (!Number.isInteger(rank) || rank < 1 || rank > maxRank) {
    throw new Error(`順位は1位〜${maxRank}位で選んでください`);
  }

  const existing = round.rankingSelections.find((s) => s.playerId === socketId);
  if (existing) {
    existing.rank = rank;
  } else {
    round.rankingSelections.push({ playerId: socketId, rank });
  }

  if (!round.rankingSubmittedPlayerIds.includes(socketId)) {
    round.rankingSubmittedPlayerIds.push(socketId);
  }

  if (round.rankingSubmittedPlayerIds.length >= room.players.length) {
    round.arrangedOrder = [...room.players]
      .sort((a, b) => {
        const aRank = round.rankingSelections.find((s) => s.playerId === a.id)?.rank ?? maxRank;
        const bRank = round.rankingSelections.find((s) => s.playerId === b.id)?.rank ?? maxRank;
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name, 'ja');
      })
      .map((p) => p.id);
    round.revealedRank = 0;
    room.phase = 'ranking-reveal';
  }
}

export function revealNextRanking(room: GameState, socketId: string): RankingRoundResult | null {
  if (room.phase !== 'ranking-reveal') {
    throw new Error('このフェーズでは公開できません');
  }
  const round = room.currentRound;
  if (!round || round.game !== 'ranking') {
    throw new Error('ランキングのラウンド情報が見つかりません');
  }
  if (round.topicChooserId !== socketId) {
    throw new Error('公開できるのはお題を決めた人だけです');
  }

  const totalRank = room.players.length;
  if (round.rankingSelections.length === 0) {
    throw new Error('順位提出が完了していません');
  }

  if (round.revealedRank < totalRank) {
    round.revealedRank += 1;
  }

  if (round.revealedRank < totalRank) {
    return null;
  }

  const rankingCards = room.players.map((player) => {
    const rank = round.rankingSelections.find((s) => s.playerId === player.id)?.rank ?? totalRank;
    return {
      playerId: player.id,
      playerName: player.name,
      rank,
    };
  }).sort((a, b) => (a.rank - b.rank) || a.playerName.localeCompare(b.playerName, 'ja'));

  const uniqueRanks = new Set(rankingCards.map((c) => c.rank));
  const isCorrect = uniqueRanks.size === rankingCards.length;

  const result: RankingRoundResult = {
    game: 'ranking',
    roundNumber: round.roundNumber,
    topic: round.topic,
    isCorrect,
    rankingCards,
  };

  round.isCorrect = isCorrect;
  if (isCorrect) {
    room.score += 1;
  }
  room.roundResults.push(result);
  room.phase = 'ranking-result';
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

  const isTie = topTargets.length !== 1;
  const votedPlayerId = isTie ? undefined : topTargets[0];
  const votedPlayer = votedPlayerId ? room.players.find((p) => p.id === votedPlayerId) : undefined;
  // 市民勝利は「選ばれた人がウルフだった」場合のみ
  const villageWon = votedPlayerId ? secret.wolfPlayerIds.has(votedPlayerId) : false;
  if (villageWon) {
    room.score += 1;
  }

  round.votedPlayerId = votedPlayerId;
  round.votedPlayerName = votedPlayer?.name ?? '投票なし';
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
    votedPlayerName: votedPlayer?.name ?? '投票なし',
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
  } else if (room.selectedGame === 'ng-word') {
    startNgWordRound(room);
  } else if (room.selectedGame === 'ranking') {
    startRankingRound(room);
  } else if (room.selectedGame === 'all-match') {
    startAllMatchRound(room);
  } else if (room.selectedGame === 'draw-guess') {
    startDrawGuessRound(room);
  } else {
    startNewRound(room);
  }
  return 'next';
}

// ============================================================
// Draw & Guess Game
// ============================================================

function stopDrawGuessTimer(roomId: string): void {
  const secret = drawGuessSecrets.get(roomId);
  if (secret?.timer) {
    clearInterval(secret.timer);
    secret.timer = null;
  }
}

export function startDrawGuessRound(room: GameState): DrawGuessRoundState {
  const roundNumber = room.roundResults.length + 1;

  if (room.players.length < 2) {
    throw new Error('お絵描きゲームは2人以上で遊べます');
  }

  // drawer rotation
  const index = room.topicChooserMode === 'random'
    ? randInt(0, room.players.length - 1)
    : room.topicChooserIndex % room.players.length;
  const drawer = room.players[index];
  if (room.topicChooserMode === 'sequential') {
    room.topicChooserIndex = (index + 1) % room.players.length;
  }

  // pick topic
  const difficultyTopics = DRAW_GUESS_TOPICS_BY_DIFFICULTY[room.drawGuessDifficulty];
  const topicSource = difficultyTopics.length > 0
    ? difficultyTopics
    : DRAW_GUESS_TOPICS_BY_DIFFICULTY.normal;
  const usedTopics = room.roundResults
    .filter((r): r is DrawGuessRoundResult => r.game === 'draw-guess')
    .map((r) => r.topic);
  const available = topicSource.filter((t) => !usedTopics.includes(t));
  const topic = available.length > 0
    ? available[randInt(0, available.length - 1)]
    : topicSource[randInt(0, topicSource.length - 1)];

  const timeLimit = room.drawGuessTimeLimit;

  // clean up previous timer
  stopDrawGuessTimer(room.roomId);

  const round: DrawGuessRoundState = {
    game: 'draw-guess',
    roundNumber,
    topic: '', // hide topic from public state
    drawerId: drawer.id,
    correctPlayerIds: [],
    guessSubmittedPlayerIds: [],
    timeLeft: timeLimit,
    timeLimit,
    strokes: [],
  };

  drawGuessSecrets.set(room.roomId, {
    topic,
    drawerId: drawer.id,
    strokes: [],
    undoneStrokes: [],
    correctPlayerIds: [],
    timer: null,
    timeLeft: timeLimit,
  });

  room.currentRound = round;
  room.phase = 'drawguess-drawing';
  return round;
}

export function getDrawGuessTopic(roomId: string): string | null {
  return drawGuessSecrets.get(roomId)?.topic ?? null;
}

export function startDrawGuessTimer(
  roomId: string,
  onTick: (roomId: string, timeLeft: number) => void,
  onTimeUp: (roomId: string) => void,
): void {
  const secret = drawGuessSecrets.get(roomId);
  if (!secret || secret.timer || secret.timeLeft <= 0) return;

  const room = rooms.get(roomId);
  if (room?.currentRound?.game === 'draw-guess') {
    (room.currentRound as DrawGuessRoundState).timeLeft = secret.timeLeft;
  }
  onTick(roomId, secret.timeLeft);

  secret.onTick = onTick;
  secret.onTimeUp = onTimeUp;

  secret.timer = setInterval(() => {
    const s = drawGuessSecrets.get(roomId);
    if (!s) {
      stopDrawGuessTimer(roomId);
      return;
    }
    s.timeLeft -= 1;
    const room = rooms.get(roomId);
    if (room?.currentRound?.game === 'draw-guess') {
      (room.currentRound as DrawGuessRoundState).timeLeft = s.timeLeft;
    }
    if (s.onTick) s.onTick(roomId, s.timeLeft);
    if (s.timeLeft <= 0) {
      stopDrawGuessTimer(roomId);
      if (s.onTimeUp) s.onTimeUp(roomId);
    }
  }, 1000);
}

export function addDrawGuessStroke(roomId: string, socketId: string, stroke: DrawGuessStroke): boolean {
  const secret = drawGuessSecrets.get(roomId);
  if (!secret || secret.drawerId !== socketId) return false;
  secret.strokes.push(stroke);
  secret.undoneStrokes = [];
  const room = rooms.get(roomId);
  if (room?.currentRound?.game === 'draw-guess') {
    (room.currentRound as DrawGuessRoundState).strokes = [...secret.strokes];
  }
  return true;
}

export function undoDrawGuessStroke(roomId: string, socketId: string): boolean {
  const secret = drawGuessSecrets.get(roomId);
  if (!secret || secret.drawerId !== socketId || secret.strokes.length === 0) return false;
  const undone = secret.strokes.pop()!;
  secret.undoneStrokes.push(undone);
  const room = rooms.get(roomId);
  if (room?.currentRound?.game === 'draw-guess') {
    (room.currentRound as DrawGuessRoundState).strokes = [...secret.strokes];
  }
  return true;
}

export function redoDrawGuessStroke(roomId: string, socketId: string): boolean {
  const secret = drawGuessSecrets.get(roomId);
  if (!secret || secret.drawerId !== socketId || secret.undoneStrokes.length === 0) return false;
  const redone = secret.undoneStrokes.pop()!;
  secret.strokes.push(redone);
  const room = rooms.get(roomId);
  if (room?.currentRound?.game === 'draw-guess') {
    (room.currentRound as DrawGuessRoundState).strokes = [...secret.strokes];
  }
  return true;
}

export function clearDrawGuessCanvas(roomId: string, socketId: string): boolean {
  const secret = drawGuessSecrets.get(roomId);
  if (!secret || secret.drawerId !== socketId) return false;
  secret.strokes = [];
  secret.undoneStrokes = [];
  const room = rooms.get(roomId);
  if (room?.currentRound?.game === 'draw-guess') {
    (room.currentRound as DrawGuessRoundState).strokes = [];
  }
  return true;
}

export function submitDrawGuessGuess(
  room: GameState,
  socketId: string,
  guess: string,
): { correct: boolean; playerName: string; points: number } | null {
  if (room.phase !== 'drawguess-drawing') return null;
  const round = room.currentRound;
  if (!round || round.game !== 'draw-guess') return null;
  const secret = drawGuessSecrets.get(room.roomId);
  if (!secret) return null;

  // drawer can't guess
  if (socketId === secret.drawerId) return null;
  // already answered correctly
  if (secret.correctPlayerIds.includes(socketId)) return null;

  const player = room.players.find((p) => p.id === socketId);
  if (!player) return null;

  const normalizedGuess = guess.trim().toLowerCase().replace(/\s+/g, '');
  const normalizedTopic = secret.topic.trim().toLowerCase().replace(/\s+/g, '');

  if (normalizedGuess !== normalizedTopic) {
    return { correct: false, playerName: player.name, points: 0 };
  }

  // correct!
  secret.correctPlayerIds.push(socketId);
  round.correctPlayerIds = [...secret.correctPlayerIds];

  const order = secret.correctPlayerIds.length;
  const points = Math.max(1, 4 - order); // 1st=3, 2nd=2, 3rd+=1

  // check if all guessers answered
  const guesserCount = room.players.length - 1; // exclude drawer
  if (secret.correctPlayerIds.length >= guesserCount) {
    // everyone guessed correctly - end round
    stopDrawGuessTimer(room.roomId);
    finishDrawGuessRound(room);
  }

  return { correct: true, playerName: player.name, points };
}

export function finishDrawGuessRound(room: GameState): DrawGuessRoundResult | null {
  const round = room.currentRound;
  if (!round || round.game !== 'draw-guess') return null;
  const secret = drawGuessSecrets.get(room.roomId);
  if (!secret) return null;

  stopDrawGuessTimer(room.roomId);

  const drawer = room.players.find((p) => p.id === secret.drawerId);
  const correctPlayers = secret.correctPlayerIds.map((id, i) => {
    const p = room.players.find((pl) => pl.id === id);
    const points = Math.max(1, 4 - (i + 1));
    return {
      playerId: id,
      playerName: p?.name ?? '',
      points,
    };
  });

  const drawerPoints = secret.correctPlayerIds.length > 0 ? secret.correctPlayerIds.length : 0;
  const isCorrect = secret.correctPlayerIds.length > 0;

  if (isCorrect) room.score += 1;

  const result: DrawGuessRoundResult = {
    game: 'draw-guess',
    roundNumber: round.roundNumber,
    topic: secret.topic,
    drawerName: drawer?.name ?? '',
    isCorrect,
    correctPlayers,
    drawerPoints,
  };

  // reveal topic in round state
  round.topic = secret.topic;

  room.roundResults.push(result);
  room.phase = 'drawguess-result';
  drawGuessSecrets.delete(room.roomId);
  return result;
}
