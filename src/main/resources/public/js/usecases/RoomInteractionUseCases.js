export class RoomInteractionUseCases {
    constructor(chessService) {
        this.chessService = chessService;
    }

    setService(chessService) {
        this.chessService = chessService;
    }

    async loadRooms() {
        return await this.chessService.listRooms();
    }

    async createRoom(playerName, timeLimitSeconds = 0, vsBot = false, color = "White") {
        if (!playerName || !playerName.trim()) {
            throw new Error("Introduce tu nombre de usuario antes de crear una sala");
        }
        return await this.chessService.createRoom(playerName.trim(), timeLimitSeconds, vsBot, color);
    }

    async joinRoom(roomCode, playerName) {
        if (!playerName || !playerName.trim()) {
            throw new Error("Introduce tu nombre de usuario antes de unirte");
        }
        if (!roomCode || !roomCode.trim()) {
            throw new Error("Introduce el código de la sala");
        }
        return await this.chessService.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }

    async refreshRoom(roomId) {
        return await this.chessService.getRoomById(roomId);
    }

    async makeMove(roomId, playerName, from, to, promotion = null) {
        if (!playerName || !playerName.trim()) {
            throw new Error("Debes identificarte para mover piezas");
        }
        return await this.chessService.makeMove(roomId, playerName.trim(), from, to, promotion);
    }

    async resignGame(roomId, playerName) {
        if (!playerName || !playerName.trim()) {
            throw new Error("Debes identificarte para abandonar la partida");
        }
        return await this.chessService.resignGame(roomId, playerName.trim());
    }

    async agreeDraw(roomId, playerName) {
        if (!playerName || !playerName.trim()) {
            throw new Error("Debes identificarte para acordar tablas");
        }
        return await this.chessService.agreeDraw(roomId, playerName.trim());
    }

    async deleteRoom(roomId) {
        await this.chessService.deleteRoom(roomId);
    }

    async clearRooms() {
        await this.chessService.clearRooms();
    }
}