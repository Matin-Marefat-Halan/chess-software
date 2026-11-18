import { ChessServicePort } from "../ports/ChessServicePort.js";
import { createInitialBoardMap } from "../domain/ChessModels.js";

export class MockChessAdapter extends ChessServicePort {
    constructor() {
        super();
        this.rooms = new Map();
        this.#seedSampleRoom();
    }

    async listRooms() {
        return Array.from(this.rooms.values()).reverse();
    }

    async createRoom(player) {
        const roomId = crypto.randomUUID();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const room = {
            roomId,
            roomCode,
            whitePlayer: player,
            blackPlayer: null,
            currentTurn: "White",
            status: "WAITING",
            winner: null,
            board: createInitialBoardMap(),
            moves: [],
            createdAt: new Date().toISOString()
        };
        this.rooms.set(roomId, room);
        return structuredClone(room);
    }

    async joinRoom(roomCode, player) {
        const room = Array.from(this.rooms.values()).find(r => r.roomCode === roomCode);
        if (!room) {
            throw new Error(`Room not found with code: ${roomCode}`);
        }
        if (room.status !== "WAITING") {
            throw new Error("Room is not available to join");
        }
        if (room.whitePlayer.toLowerCase() === player.toLowerCase()) {
            throw new Error("Player name must be different from host");
        }
        room.blackPlayer = player;
        room.status = "PLAYING";
        return structuredClone(room);
    }

    async getRoomById(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room not found: ${roomId}`);
        }
        return structuredClone(room);
    }

    async getRoomByCode(roomCode) {
        const room = Array.from(this.rooms.values()).find(r => r.roomCode === roomCode);
        if (!room) {
            throw new Error(`Room not found with code: ${roomCode}`);
        }
        return structuredClone(room);
    }

    async makeMove(roomId, player, from, to) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room not found: ${roomId}`);
        }
        if (room.status !== "PLAYING") {
            throw new Error("Game is not currently active");
        }
        const expectedPlayer = room.currentTurn === "White" ? room.whitePlayer : room.blackPlayer;
        if (!expectedPlayer || expectedPlayer.toLowerCase() !== player.toLowerCase()) {
            throw new Error("It is not this player's turn");
        }
        const piece = room.board[from];
        if (!piece || !piece.startsWith(room.currentTurn)) {
            throw new Error(`No valid piece of your color at ${from}`);
        }
        const target = room.board[to];
        if (target && target.startsWith(room.currentTurn)) {
            throw new Error("Cannot capture your own piece");
        }
        delete room.board[from];
        room.board[to] = piece;
        room.moves.push({
            moveNumber: room.moves.length + 1,
            player,
            color: room.currentTurn,
            from,
            to,
            piece,
            timestamp: new Date().toISOString()
        });
        room.currentTurn = room.currentTurn === "White" ? "Black" : "White";
        return structuredClone(room);
    }

    async resignGame(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room not found: ${roomId}`);
        }
        if (room.status !== "PLAYING") {
            throw new Error("Only active games can be resigned");
        }
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

    #seedSampleRoom() {
        const board = createInitialBoardMap();
        delete board.e2;
        board.e4 = "WhitePawn";
        delete board.e7;
        board.e5 = "BlackPawn";
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
                { moveNumber: 1, player: "Ana", color: "White", from: "e2", to: "e4", piece: "WhitePawn", timestamp: new Date().toISOString() },
                { moveNumber: 2, player: "Luis", color: "Black", from: "e7", to: "e5", piece: "BlackPawn", timestamp: new Date().toISOString() }
            ],
            createdAt: new Date().toISOString()
        });
    }
}