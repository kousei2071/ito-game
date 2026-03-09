import type { Server, Socket } from 'socket.io';
import { C2S, S2C, TOPICS } from '@ito/shared';
import type { PublicGameState, GameState } from '@ito/shared';
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
  submitClue,
  confirmArrange,
  advanceRound,
  disconnectPlayer,
  updateRoomSettings,
} from './roomManager.js';

// ============================================================
// Helpers
// ============================================================

/** secretNumber を隠して返す */
function toPublic(room: GameState): PublicGameState {
  return {
    roomId: room.roomId,
    players: room.players.map(({ secretNumber, ...rest }) => rest),
    phase: room.phase,
    selectedGame: room.selectedGame,
    currentRound: room.currentRound,
    roundResults: room.roundResults,
    totalRounds: room.totalRounds,
    topicChooserMode: room.topicChooserMode,
    score: room.score,
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
  socket.on(C2S.ROOM_CREATE, ({ playerName }: { playerName: string }) => {
    try {
      const room = createRoom(socket.id, playerName);
      socket.join(room.roomId);
      socket.emit(S2C.ROOM_UPDATED, toPublic(room));
    } catch (e: any) {
      emitError(socket, e.message);
    }
  });

  // ---------- room:join ----------
  socket.on(C2S.ROOM_JOIN, ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    try {
      const room = joinRoom(roomId, socket.id, playerName);
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
    ({ totalRounds, topicChooserMode }: { totalRounds: number; topicChooserMode: 'sequential' | 'random' }) => {
      const room = findRoomByPlayer(socket.id);
      if (!room) return emitError(socket, 'ルームが見つかりません');
      try {
        updateRoomSettings(room, socket.id, { totalRounds, topicChooserMode });
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
      const round = startSelectedGame(room, room.selectedGame);

      room.players.forEach((p) => {
        io.to(p.id).emit(S2C.YOUR_NUMBER, { secretNumber: p.secretNumber });
      });
      io.to(room.roomId).emit(S2C.ROUND_STARTED, {
        roundNumber: round.roundNumber,
        topic: round.topic,
      });
      broadcastState(io, room);
      return;
    }

    emitError(socket, 'このフェーズでは開始できません');
  });

  // ---------- game:select ----------
  socket.on(C2S.GAME_SELECT, ({ game }: { game: 'ito' | 'word-wolf' }) => {
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
          const usedTopics = room.roundResults.map((r) => r.topic);
          const exclude = new Set<string>([...usedTopics, round.topic]);
          const candidates = TOPICS.filter((t) => !exclude.has(t));
          const pool = candidates.length > 0 ? candidates : TOPICS;
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
      // 全員のヒントを公開
      const clues = room.currentRound!.clues.map((c) => ({
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
    if (!room.currentRound || room.currentRound.topicChooserId !== socket.id) {
      return emitError(socket, 'このラウンドで並びを確定できるのはお題を決めた人だけです');
    }

    const result = confirmArrange(room, order);
    io.to(room.roomId).emit(S2C.ROUND_RESULT, result);
    broadcastState(io, room);
  });

  // ---------- round:next ----------
  socket.on(C2S.ROUND_NEXT, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    const status = advanceRound(room);
    if (status === 'next') {
      room.players.forEach((p) => {
        io.to(p.id).emit(S2C.YOUR_NUMBER, { secretNumber: p.secretNumber });
      });
      io.to(room.roomId).emit(S2C.ROUND_STARTED, {
        roundNumber: room.currentRound!.roundNumber,
        topic: room.currentRound!.topic,
      });
      // 次のラウンドもまずはお題選択フェーズ
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
  const result = leaveRoom(socket.id);
  if (result && !result.removed) {
    broadcastState(io, result.room);
  }
}

function handleDisconnect(io: Server, socket: Socket) {
  const room = disconnectPlayer(socket.id);
  if (room) {
    broadcastState(io, room);
  }
}
