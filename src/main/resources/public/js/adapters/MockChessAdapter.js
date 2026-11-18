import { ChessServicePort } from "../ports/ChessServicePort.js";
import { createInitialBoardMap, getValidMovesForSquare } from "../domain/ChessModels.js";

export class MockChessAdapter extends ChessServicePort {
    constructor() {
        super();
        this.rooms = new Map();
        this.#seedSampleRoom();
    }

    async listRooms() {
        return Array.from(this.rooms.values()).reverse();
    }

    async createRoom(player, timeLimitSeconds = 0, vsBot = false) {
        const roomId = crypto.randomUUID();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const now = new Date().toISOString();
        const initialMs = timeLimitSeconds * 1000;
        const room = {
            roomId,
            roomCode,
            whitePlayer: player,
            blackPlayer: vsBot ? "ChessBot" : null,
            currentTurn: "White",
            status: vsBot ? "PLAYING" : "WAITING",
            winner: null,
            board: createInitialBoardMap(),
            moves: [],
            createdAt: now,
            timeLimitSeconds,
            whiteTimeRemainingMs: initialMs,
            blackTimeRemainingMs: initialMs,
            lastMoveTimestamp: now
        };
        this.rooms.set(roomId, room);
        return structuredClone(room);
    }

    async joinRoom(roomCode, player) {
        const room = Array.from(this.rooms.values()).find(r => r.roomCode === roomCode);
        if (!room) throw new Error(`Room not found with code: ${roomCode}`);
        if (room.status !== "WAITING") throw new Error("Room is not available to join");
        if (room.whitePlayer.toLowerCase() === player.toLowerCase()) {
            throw new Error("El nombre del rival debe ser distinto al del creador");
        }
        room.blackPlayer = player;
        room.status = "PLAYING";
        room.lastMoveTimestamp = new Date().toISOString();
        return structuredClone(room);
    }

    async getRoomById(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Room not found: ${roomId}`);
        return structuredClone(room);
    }

    async getRoomByCode(roomCode) {
        const room = Array.from(this.rooms.values()).find(r => r.roomCode === roomCode);
        if (!room) throw new Error(`Room not found with code: ${roomCode}`);
        return structuredClone(room);
    }

    async makeMove(roomId, player, from, to) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Room not found: ${roomId}`);
        this.#applySingleMove(room, player, from, to);

        if (room.status === "PLAYING" && room.blackPlayer === "ChessBot" && room.currentTurn === "Black") {
            const blackSquares = Object.keys(room.board).filter(sq => room.board[sq].startsWith("Black"));
            for (const sq of blackSquares) {
                const legal = getValidMovesForSquare(room.board, sq, room.moves);
                if (legal.length > 0) {
                    this.#applySingleMove(room, "ChessBot", sq, legal[0].coord);
                    break;
                }
            }
        }

        return structuredClone(room);
    }

    #applySingleMove(room, player, from, to) {
        if (room.status !== "PLAYING") throw new Error("Game is not currently active");
        const expectedPlayer = room.currentTurn === "White" ? room.whitePlayer : room.blackPlayer;
        if (!expectedPlayer || expectedPlayer.toLowerCase() !== player.toLowerCase()) {
            throw new Error("It is not this player's turn");
        }
        const piece = room.board[from];
        if (!piece || !piece.startsWith(room.currentTurn)) {
            throw new Error(`No valid piece of your color at ${from}`);
        }
        const targetWasEmpty = !room.board[to];
        delete room.board[from];
        if ((piece === "WhitePawn" || piece === "BlackPawn") && from[0] !== to[0] && targetWasEmpty) {
            delete room.board[`${to[0]}${from[1]}`];
        }
        room.board[to] = piece;
        if ((piece === "WhiteKing" || piece === "BlackKing") && Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) === 2) {
            const rank = from[1];
            const kingSide = to[0] === "g";
            const rookFrom = `${kingSide ? "h" : "a"}${rank}`;
            const rookTo = `${kingSide ? "f" : "d"}${rank}`;
            room.board[rookTo] = room.board[rookFrom];
            delete room.board[rookFrom];
        }
        const now = new Date().toISOString();
        room.moves.push({
            moveNumber: room.moves.length + 1,
            player,
            color: room.currentTurn,
            from,
            to,
            piece,
            timestamp: now
        });
        room.currentTurn = room.currentTurn === "White" ? "Black" : "White";
        room.lastMoveTimestamp = now;
    }

    async resignGame(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Room not found: ${roomId}`);
        if (room.status !== "PLAYING") throw new Error("Only active games can be resigned");
        if (room.whitePlayer.toLowerCase() === player.toLowerCase()) {
            room.winner = room.blackPlayer;
        } else if (room.blackPlayer && room.blackPlayer.toLowerCase() === player.toLowerCase()) {
            room.winner = room.whitePlayer;
        } else {
            throw new Error("Player does not belong to this room");
        }
        room.status = "FINISHED";
        return structuredClone(room);
    }

    async deleteRoom(roomId) {
        this.rooms.delete(roomId);
    }

    async clearRooms() {
        this.rooms.clear();
    }

    #seedSampleRoom() {
        const board = createInitialBoardMap();
        delete board.e2;
        board.e4 = "WhitePawn";
        delete board.e7;
        board.e5 = "BlackPawn";
        const now = new Date().toISOString();
        this.rooms.set("mock-demo-room", {
            roomId: "mock-demo-room",
            roomCode: "DEMO01",
            whitePlayer: "Ana",
            blackPlayer: "Luis",
            currentTurn: "White",
            status: "PLAYING",
            winner: null,
            board,
            moves: [
                { moveNumber: 1, player: "Ana", color: "White", from: "e2", to: "e4", piece: "WhitePawn", timestamp: now },
                { moveNumber: 2, player: "Luis", color: "Black", from: "e7", to: "e5", piece: "BlackPawn", timestamp: now }
            ],
            createdAt: now,
            timeLimitSeconds: 300,
            whiteTimeRemainingMs: 290000,
            blackTimeRemainingMs: 285000,
            lastMoveTimestamp: now
        });
    }
}