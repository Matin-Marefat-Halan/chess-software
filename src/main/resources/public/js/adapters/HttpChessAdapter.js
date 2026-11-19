import { ChessServicePort } from "../ports/ChessServicePort.js";

export class HttpChessAdapter extends ChessServicePort {
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl;
    }

    async listRooms() {
        return await this.#request("/api/rooms", { method: "GET" });
    }

    async createRoom(player, timeLimitSeconds = 0, vsBot = false, color = "White") {
        return await this.#request("/api/rooms", {
            method: "POST",
            body: JSON.stringify({ player, timeLimitSeconds, vsBot, color })
        });
    }

    async joinRoom(roomCode, player) {
        return await this.#request("/api/rooms/join", {
            method: "POST",
            body: JSON.stringify({ roomCode, player })
        });
    }

    async getRoomById(roomId) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}`, { method: "GET" });
    }

    async getRoomByCode(roomCode) {
        return await this.#request(`/api/rooms/code/${encodeURIComponent(roomCode)}`, { method: "GET" });
    }

    async makeMove(roomId, player, from, to, promotion = null) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/moves`, {
            method: "POST",
            body: JSON.stringify({ player, from, to, promotion })
        });
    }

    async resignGame(roomId, player) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/resign`, {
            method: "POST",
            body: JSON.stringify({ player })
        });
    }

    async agreeDraw(roomId, player) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/draw`, {
            method: "POST",
            body: JSON.stringify({ player })
        });
    }

    async requestRematch(roomId, player) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/rematch`, {
            method: "POST",
            body: JSON.stringify({ player })
        });
    }

    async reviewGame(roomId) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/review`, { method: "GET" });
    }

    async deleteRoom(roomId) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}`, { method: "DELETE" });
    }

    async clearRooms() {
        return await this.#request("/api/rooms", { method: "DELETE" });
    }

    async #request(path, options) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
            throw new Error(data?.error || `Error HTTP ${response.status}`);
        }
        return data;
    }
}