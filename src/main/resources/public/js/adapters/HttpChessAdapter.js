import { ChessServicePort } from "../ports/ChessServicePort.js";

export class HttpChessAdapter extends ChessServicePort {
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl;
    }

    async listRooms() {
        return await this.#request("/api/rooms", { method: "GET" });
    }

    async createRoom(player, timeLimitSeconds = 0) {
        return await this.#request("/api/rooms", {
            method: "POST",
            body: JSON.stringify({ player, timeLimitSeconds })
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

    async makeMove(roomId, player, from, to) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/moves`, {
            method: "POST",
            body: JSON.stringify({ player, from, to })
        });
    }

    async resignGame(roomId, player) {
        return await this.#request(`/api/rooms/${encodeURIComponent(roomId)}/resign`, {
            method: "POST",
            body: JSON.stringify({ player })
        });
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