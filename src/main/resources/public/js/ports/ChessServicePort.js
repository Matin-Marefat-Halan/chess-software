export class ChessServicePort {
    async listRooms() {
        throw new Error("Not implemented");
    }

    async createRoom(player, timeLimitSeconds = 0, vsBot = false, color = "White") {
        throw new Error("Not implemented");
    }

    async joinRoom(roomCode, player) {
        throw new Error("Not implemented");
    }

    async getRoomById(roomId) {
        throw new Error("Not implemented");
    }

    async getRoomByCode(roomCode) {
        throw new Error("Not implemented");
    }

    async makeMove(roomId, player, from, to, promotion = null) {
        throw new Error("Not implemented");
    }

    async resignGame(roomId, player) {
        throw new Error("Not implemented");
    }

    async agreeDraw(roomId, player) {
        throw new Error("Not implemented");
    }

    async requestRematch(roomId, player) {
        throw new Error("Not implemented");
    }

    async reviewGame(roomId) {
        throw new Error("Not implemented");
    }

    async deleteRoom(roomId) {
        throw new Error("Not implemented");
    }

    async clearRooms() {
        throw new Error("Not implemented");
    }
}