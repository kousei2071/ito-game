import type { Server, Socket } from 'socket.io';
import { C2S, S2C } from '@ito/shared';
import type { PublicGameState, GameState } from '@ito/shared';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  findRoomByPlayer,
  startNewRound,
  submitClue,
  confirmArrange,
  advanceRound,
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
    currentRound: room.currentRound,
    roundResults: room.roundResults,
    totalRounds: room.totalRounds,
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
    handleLeave(io, socket);
  });

  // ---------- room:ready ----------
  socket.on(C2S.ROOM_READY, () => {
    const room = toggleReady(socket.id);
    if (room) broadcastState(io, room);
  });

  // ---------- game:start ----------
  socket.on(C2S.GAME_START, () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return emitError(socket, 'ルームが見つかりません');
    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return emitError(socket, 'ホストのみ開始できます');
    if (room.players.length < 1) return emitError(socket, 'プレイヤーがいません');

    const round = startNewRound(room);

    // 各プレイヤーに自分の数字を通知
    room.players.forEach((p) => {
      io.to(p.id).emit(S2C.YOUR_NUMBER, { secretNumber: p.secretNumber });
    });
    io.to(room.roomId).emit(S2C.ROUND_STARTED, {
      roundNumber: round.roundNumber,
      topic: round.topic,
    });
    broadcastState(io, room);
  });

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
