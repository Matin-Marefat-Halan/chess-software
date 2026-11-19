import { ChessServicePort } from "../ports/ChessServicePort.js";
import { createInitialBoardMap, getValidMovesForSquare, isKingInCheck } from "../domain/ChessModels.js";

export class MockChessAdapter extends ChessServicePort {
    constructor() {
        super();
        this.rooms = new Map();
        this.#seedSampleRoom();
    }

    async listRooms() {
        return Array.from(this.rooms.values()).reverse();
    }

    async createRoom(player, timeLimitSeconds = 0, vsBot = false, color = "White") {
        const roomId = crypto.randomUUID();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const now = new Date().toISOString();
        const initialMs = timeLimitSeconds * 1000;
        const resolvedColor = color === "Random" ? (Math.random() < 0.5 ? "White" : "Black") : color;
        const playAsBlack = resolvedColor === "Black";

        const room = {
            roomId,
            roomCode,
            whitePlayer: playAsBlack ? (vsBot ? "ChessBot" : null) : player,
            blackPlayer: playAsBlack ? player : (vsBot ? "ChessBot" : null),
            currentTurn: "White",
            status: vsBot ? "PLAYING" : "WAITING",
            winner: null,
            board: createInitialBoardMap(),
            moves: [],
            createdAt: now,
            timeLimitSeconds,
            whiteTimeRemainingMs: initialMs,
            blackTimeRemainingMs: initialMs,
            lastMoveTimestamp: now,
            inCheck: false,
            endReason: null
        };

        if (vsBot && playAsBlack) {
            this.#applySingleMove(room, "ChessBot", "e2", "e4", null);
            if (room.timeLimitSeconds > 0) {
                room.whiteTimeRemainingMs = Math.max(0, room.whiteTimeRemainingMs - 1500);
            }
        }

        this.rooms.set(roomId, room);
        return structuredClone(room);
    }

    async joinRoom(roomCode, player) {
        const room = Array.from(this.rooms.values()).find(r => r.roomCode === roomCode);
        if (!room) throw new Error(`Room not found with code: ${roomCode}`);
        if (room.status !== "WAITING") throw new Error("Room is not available to join");

        if (!room.whitePlayer) {
            if (room.blackPlayer && room.blackPlayer.toLowerCase() === player.toLowerCase()) {
                throw new Error("El nombre del rival debe ser distinto al del creador");
            }
            room.whitePlayer = player;
        } else {
            if (room.whitePlayer.toLowerCase() === player.toLowerCase()) {
                throw new Error("El nombre del rival debe ser distinto al del creador");
            }
            room.blackPlayer = player;
        }
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

    async makeMove(roomId, player, from, to, promotion = null) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Room not found: ${roomId}`);
        this.#applySingleMove(room, player, from, to, promotion);

        const botSide = room.whitePlayer === "ChessBot" ? "White" : (room.blackPlayer === "ChessBot" ? "Black" : null);
        if (room.status === "PLAYING" && botSide && room.currentTurn === botSide) {
            const botSquares = Object.keys(room.board).filter(sq => room.board[sq].startsWith(botSide));
            for (const sq of botSquares) {
                const legal = getValidMovesForSquare(room.board, sq, room.moves);
                if (legal.length > 0) {
                    this.#applySingleMove(room, "ChessBot", sq, legal[0].coord, "Queen");
                    if (room.timeLimitSeconds > 0) {
                        if (botSide === "White") {
                            room.whiteTimeRemainingMs = Math.max(0, room.whiteTimeRemainingMs - 1600);
                        } else {
                            room.blackTimeRemainingMs = Math.max(0, room.blackTimeRemainingMs - 1600);
                        }
                    }
                    break;
                }
            }
        }

        return structuredClone(room);
    }

    #applySingleMove(room, player, from, to, promotion) {
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
        let finalPiece = piece;
        if (piece === "WhitePawn" && to.endsWith("8")) {
            finalPiece = `White${promotion || "Queen"}`;
        } else if (piece === "BlackPawn" && to.endsWith("1")) {
            finalPiece = `Black${promotion || "Queen"}`;
        }
        room.board[to] = finalPiece;

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
            piece: finalPiece,
            timestamp: now
        });

        const nextTurn = room.currentTurn === "White" ? "Black" : "White";
        room.currentTurn = nextTurn;
        room.lastMoveTimestamp = now;
        room.inCheck = isKingInCheck(room.board, nextTurn);

        const hasMoves = Object.keys(room.board)
            .filter(sq => room.board[sq].startsWith(nextTurn))
            .some(sq => getValidMovesForSquare(room.board, sq, room.moves).length > 0);

        if (!hasMoves) {
            room.status = "FINISHED";
            if (room.inCheck) {
                room.winner = nextTurn === "White" ? room.blackPlayer : room.whitePlayer;
                room.endReason = "CHECKMATE";
            } else {
                room.winner = "DRAW";
                room.endReason = "STALEMATE";
            }
        }
    }

    async resignGame(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Room not found: ${roomId}`);
        if (room.status !== "PLAYING") throw new Error("Only active games can be resigned");
        if (room.whitePlayer && room.whitePlayer.toLowerCase() === player.toLowerCase()) {
            room.winner = room.blackPlayer;
        } else if (room.blackPlayer && room.blackPlayer.toLowerCase() === player.toLowerCase()) {
            room.winner = room.whitePlayer;
        } else {
            throw new Error("Player does not belong to this room");
        }
        room.status = "FINISHED";
        room.endReason = "RESIGNATION";
        return structuredClone(room);
    }

    async agreeDraw(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Room not found: ${roomId}`);
        room.status = "FINISHED";
        room.winner = "DRAW";
        room.endReason = "DRAW_AGREED";
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
            lastMoveTimestamp: now,
            inCheck: false,
            endReason: null
        });
    }
}