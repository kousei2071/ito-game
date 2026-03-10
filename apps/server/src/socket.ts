import type { Server, Socket } from 'socket.io';
import { C2S, S2C, TOPICS, RANKING_TOPICS } from '@ito/shared';
import type { PublicGameState, GameState, ItoRoundResult, RankingRoundResult } from '@ito/shared';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  findRoomByPlayer,
  startNewRound,
  moveToGameSelect,
  moveToGameSettings,
  selectGame,
  returnToGameSelect,
  startSelectedGame,
  startWordWolfTalk,
  startWordWolfVote,
  getWordWolfExampleTalk,
  submitWordWolfVote,
  submitClue,
  confirmArrange,
  advanceRound,
  disconnectPlayer,
  updateRoomSettings,
  type PlayerExitResult,
} from './roomManager.js';

// ============================================================
// Helpers
// ============================================================

/** secretNumber を隠して返す */
function toPublic(room: GameState): PublicGameState {
  return {
    roomId: room.roomId,
    players: room.players.map(({ secretNumber, secretWord, ...rest }) => rest),
    phase: room.phase,
    selectedGame: room.selectedGame,
    currentRound: room.currentRound,
    roundResults: room.roundResults,
    totalRounds: room.totalRounds,
    topicChooserMode: room.topicChooserMode,
    score: room.score,
    wordWolfTalkSeconds: room.wordWolfTalkSeconds,
    wordWolfCountMode: room.wordWolfCountMode,
  };
}

function broadcastState(io: Server, room: GameState) {
  io.to(room.roomId).emit(S2C.GAME_STATE_CHANGED, toPublic(room));
}

function emitError(socket: Socket, message: string) {
  socket.emit(S2C.ERROR, { message });
}

// ============================================================
// Register Events
// ============================================================
export function registerSocketHandlers(io: Server, socket: Socket) {
  // ---------- room:create ----------
  socket.on(C2S.ROOM_CREATE, ({ playerName, playerIconId }: { playerName: string; playerIconId: 'icon1' | 'icon2' | 'icon3' | 'icon4' | 'icon5' | 'icon6' | 'icon7' | 'icon8' | 'icon9' | 'icon10' }) => {
    try {
      const room = createRoom(socket.id, playerName, playerIconId);
      socket.join(room.roomId);
      socket.emit(S2C.ROOM_UPDATED, toPublic(room));
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  // ---------- room:join ----------
  socket.on(C2S.ROOM_JOIN, ({ roomId, playerName, playerIconId }: { roomId: string; playerName: string; playerIconId: 'icon1' | 'icon2' | 'icon3' | 'icon4' | 'icon5' | 'icon6' | 'icon7' | 'icon8' | 'icon9' | 'icon10' }) => {
    try {
      const room = joinRoom(roomId, socket.id, playerName, playerIconId);
      socket.join(roomId);
      broadcastState(io, room);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  // ---------- room:leave ----------
  socket.on(C2S.ROOM_LEAVE, () => {
    handleLeave(io, socket);
  });

  socket.on('disconnect', () => {
    handleDisconnect(io, socket);
  });

  // ---------- room:ready ----------
  socket.on(C2S.ROOM_READY, () => {
    const room = toggleReady(socket.id);
    if (room) broadcastState(io, room);
  });

  // ---------- room:updateSettings ----------
  socket.on(
    C2S.ROOM_UPDATE_SETTINGS,
    ({
      totalRounds,
      topicChooserMode,
      wordWolfTalkSeconds,
      wordWolfCountMode,
    }: {
      totalRounds: number;
      topicChooserMode: 'sequential' | 'random';
      wordWolfTalkSeconds: number;
      wordWolfCountMode: 'auto' | 'one' | 'two';
    }) => {
      const room = findRoomByPlayer(socket.id);
      if (!room) return emitError(socket, 'ルームが見つかりません');
      try {
        updateRoomSettings(room, socket.id, {
          totalRounds,
          topicChooserMode,
          wordWolfTalkSeconds,
          wordWolfCountMode,
        });
        broadcastState(io, room);
      } catch (e: any) {
        emitError(socket, e.message);
      }
    },
  );

  // ---------- game:start ----------
  socket.on(C2S.GAME_START, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return emitError(socket, 'ルームが見つかりません');
    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return emitError(socket, 'ホストのみ開始できます');
    if (room.players.length < 1) return emitError(socket, 'プレイヤーがいません');

    if (room.phase === 'lobby') {
      moveToGameSelect(room);
      broadcastState(io, room);
      return;
    }

    if (room.phase === 'game-select') {
      try {
        moveToGameSettings(room, socket.id);
        broadcastState(io, room);
      } catch (e: any) {
        emitError(socket, e.message);
      }
      return;
    }

    if (room.phase === 'game-settings') {
      if (!room.selectedGame) {
        return emitError(socket, 'ゲームを選択してください');
      }
      let round;
      try {
        round = startSelectedGame(room, room.selectedGame);
      } catch (e: any) {
        emitError(socket, e.message);
        return;
      }

      if (round.game === 'ito') {
        room.players.forEach((p) => {
          io.to(p.id).emit(S2C.YOUR_NUMBER, { secretNumber: p.secretNumber });
        });
        io.to(room.roomId).emit(S2C.ROUND_STARTED, {
          roundNumber: round.roundNumber,
          topic: round.topic,
        });
      } else {
        room.players.forEach((p) => {
          io.to(p.id).emit(S2C.YOUR_WORD, { word: p.secretWord ?? '' });
        });
      }
      broadcastState(io, room);
      return;
    }

    emitError(socket, 'このフェーズでは開始できません');
  });

  // ---------- game:select ----------
  socket.on(C2S.GAME_SELECT, ({ game }: { game: 'ito' | 'ranking' | 'word-wolf' }) => {
    const room = findRoomByPlayer(socket.id);
    if (!room || room.phase !== 'game-select') return;
    try {
      selectGame(room, socket.id, game);
      broadcastState(io, room);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  // ---------- game:returnToSelect ----------
  socket.on(C2S.GAME_RETURN_TO_SELECT, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return emitError(socket, 'ルームが見つかりません');
    try {
      const actorName = returnToGameSelect(room, socket.id);
      io.to(room.roomId).emit(S2C.NOTICE, { message: `${actorName}がゲームを終了しました` });
      broadcastState(io, room);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  // ---------- round:setTopic ----------
  socket.on(
    C2S.ROUND_SET_TOPIC,
    ({ topic, mode, finalize }: { topic?: string; mode: 'random' | 'custom'; finalize: boolean }) => {
      const room = findRoomByPlayer(socket.id);
      if (!room || room.phase !== 'topic' || !room.currentRound) return;

      const round = room.currentRound;
      if (round.game !== 'ito' && round.game !== 'ranking') return;
      if (round.topicChooserId !== socket.id) {
        return emitError(socket, 'このラウンドでお題を決められるのは順番のプレイヤーだけです');
      }

      if (!finalize) {
        // ランダムお題の更新（最大10回）
        if (round.topicChangeCount >= 10) {
          return emitError(socket, 'お題の更新は最大10回までです');
        }
        if (mode === 'random') {
          round.topicChangeCount += 1;
          const presetTopics = round.game === 'ranking' ? RANKING_TOPICS : TOPICS;
          const usedTopics = room.roundResults
            .filter((r): r is ItoRoundResult | RankingRoundResult => r.game === round.game)
            .map((r) => r.topic);
          const exclude = new Set<string>([...usedTopics, round.topic]);
          const candidates = presetTopics.filter((t) => !exclude.has(t));
          const pool = candidates.length > 0 ? candidates : presetTopics;
          const idx = Math.floor(Math.random() * pool.length);
          round.topic = pool[idx];
        }
        broadcastState(io, room);
        return;
      }

      // 確定
      const finalTopic = (mode === 'custom' ? topic : round.topic) ?? '';
      const trimmed = finalTopic.trim();
      if (!trimmed) {
        return emitError(socket, 'お題を入力してください');
      }
      round.topic = trimmed;
      room.phase = 'clue';

      io.to(room.roomId).emit(S2C.ROUND_STARTED, {
        roundNumber: round.roundNumber,
        topic: round.topic,
      });
      broadcastState(io, room);
    },
  );

  // ---------- round:submitClue ----------
  socket.on(C2S.ROUND_SUBMIT_CLUE, ({ clue }: { clue: string }) => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;

    const phaseChanged = submitClue(room, socket.id, clue);
    if (phaseChanged) {
      const currentRound = room.currentRound;
      if (!currentRound || (currentRound.game !== 'ito' && currentRound.game !== 'ranking')) {
        broadcastState(io, room);
        return;
      }
      // 全員のヒントを公開
      const clues = currentRound.clues.map((c) => ({
        ...c,
        playerName: room.players.find((p) => p.id === c.playerId)?.name ?? '',
      }));
      io.to(room.roomId).emit(S2C.ROUND_CLUES_COLLECTED, { clues });
    }
    broadcastState(io, room);
  });

  // ---------- round:confirmArrange ----------
  socket.on(C2S.ROUND_CONFIRM, ({ order }: { order: string[] }) => {
    const room = findRoomByPlayer(socket.id);
    if (!room || room.phase !== 'arrange') return;
    if (
      !room.currentRound
      || (room.currentRound.game !== 'ito' && room.currentRound.game !== 'ranking')
      || room.currentRound.topicChooserId !== socket.id
    ) {
      return emitError(socket, 'このラウンドで並びを確定できるのはお題を決めた人だけです');
    }

    const result = confirmArrange(room, order);
    io.to(room.roomId).emit(S2C.ROUND_RESULT, result);
    broadcastState(io, room);
  });

  // ---------- round:next ----------
  socket.on(C2S.WORDWOLF_START_TALK, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    try {
      startWordWolfTalk(room, socket.id);
      broadcastState(io, room);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  socket.on(C2S.WORDWOLF_START_VOTE, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    try {
      startWordWolfVote(room, socket.id);
      broadcastState(io, room);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  socket.on(C2S.WORDWOLF_SUBMIT_VOTE, ({ targetPlayerId }: { targetPlayerId: string }) => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    try {
      const result = submitWordWolfVote(room, socket.id, targetPlayerId);
      if (result) {
        io.to(room.roomId).emit(S2C.ROUND_RESULT, result);
      }
      broadcastState(io, room);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  socket.on(C2S.WORDWOLF_REQUEST_EXAMPLE_TALK, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    try {
      const payload = getWordWolfExampleTalk(room, socket.id);
      io.to(room.roomId).emit(S2C.WORDWOLF_EXAMPLE_TALK, payload);
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  socket.on(C2S.ROUND_NEXT, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    const status = advanceRound(room);
    if (status === 'next') {
      if (room.currentRound?.game === 'ito') {
        room.players.forEach((p) => {
          io.to(p.id).emit(S2C.YOUR_NUMBER, { secretNumber: p.secretNumber });
        });
        io.to(room.roomId).emit(S2C.ROUND_STARTED, {
          roundNumber: room.currentRound.roundNumber,
          topic: room.currentRound.topic,
        });
        // 次のラウンドもまずはお題選択フェーズ
      } else {
        room.players.forEach((p) => {
          io.to(p.id).emit(S2C.YOUR_WORD, { word: p.secretWord ?? '' });
        });
      }
    } else {
      io.to(room.roomId).emit(S2C.GAME_FINISHED, {
        score: room.score,
        totalRounds: room.totalRounds,
        roundResults: room.roundResults,
      });
    }
    broadcastState(io, room);
  });
}

function handleLeave(io: Server, socket: Socket) {
  for (const roomId of socket.rooms) {
    if (roomId !== socket.id) {
      socket.leave(roomId);
    }
  }
  const result = leaveRoom(socket.id);
  handlePlayerExitResult(io, result);
}

function handleDisconnect(io: Server, socket: Socket) {
  const result = disconnectPlayer(socket.id);
  handlePlayerExitResult(io, result);
}

function handlePlayerExitResult(io: Server, result: PlayerExitResult | null) {
  if (!result) return;

  if (result.kind === 'room-closed') {
    io.to(result.roomId).emit(S2C.ROOM_CLOSED, { message: 'ホストが退出したためルームを終了しました' });
    return;
  }

  if (result.forcedToGameSelect) {
    io.to(result.room.roomId).emit(S2C.NOTICE, {
      message: `${result.actorName}が退出したためゲーム選択に戻りました`,
    });
  }
  broadcastState(io, result.room);
}
