import { CONFIG } from "./config.js";
import { reconstructBoardAtMove } from "./domain/ChessModels.js";
import { RoomInteractionUseCases } from "./usecases/RoomInteractionUseCases.js";
import { HttpChessAdapter } from "./adapters/HttpChessAdapter.js";
import { MockChessAdapter } from "./adapters/MockChessAdapter.js";
import { BoardRenderer } from "./ui/BoardRenderer.js";

const httpAdapter = new HttpChessAdapter(CONFIG.API_BASE_URL);
const mockAdapter = new MockChessAdapter();
const useCases = new RoomInteractionUseCases(httpAdapter);

const state = {
    currentRoom: null,
    selectedSquare: null,
    replayIndex: null,
    pollTimer: null
};

const elements = {
    adapterSelect: document.getElementById("adapterSelect"),
    lobbyView: document.getElementById("lobbyView"),
    gameView: document.getElementById("gameView"),
    playerNameInput: document.getElementById("playerNameInput"),
    roomCodeInput: document.getElementById("roomCodeInput"),
    createRoomBtn: document.getElementById("createRoomBtn"),
    joinRoomBtn: document.getElementById("joinRoomBtn"),
    refreshRoomsBtn: document.getElementById("refreshRoomsBtn"),
    roomsList: document.getElementById("roomsList"),
    roomStatusBadge: document.getElementById("roomStatusBadge"),
    roleBadge: document.getElementById("roleBadge"),
    activeRoomCode: document.getElementById("activeRoomCode"),
    backToLobbyBtn: document.getElementById("backToLobbyBtn"),
    whitePlayerName: document.getElementById("whitePlayerName"),
    blackPlayerName: document.getElementById("blackPlayerName"),
    turnIndicator: document.getElementById("turnIndicator"),
    resignBtn: document.getElementById("resignBtn"),
    replayPrevBtn: document.getElementById("replayPrevBtn"),
    replayNextBtn: document.getElementById("replayNextBtn"),
    replayLiveBtn: document.getElementById("replayLiveBtn"),
    replayLabel: document.getElementById("replayLabel"),
    movesHistoryList: document.getElementById("movesHistoryList"),
    toastMessage: document.getElementById("toastMessage")
};

const boardRenderer = new BoardRenderer(
    document.getElementById("chessBoard"),
    handleSquareClick
);

function getPlayerName() {
    return elements.playerNameInput.value.trim();
}

function getPlayerRole(room) {
    const player = getPlayerName().toLowerCase();
    if (!player) return "ESPECTADOR";
    if (room.whitePlayer && room.whitePlayer.toLowerCase() === player) return "BLANCAS";
    if (room.blackPlayer && room.blackPlayer.toLowerCase() === player) return "NEGRAS";
    return "ESPECTADOR";
}

function showToast(message, isError = false) {
    elements.toastMessage.textContent = message;
    elements.toastMessage.classList.toggle("error", isError);
    elements.toastMessage.classList.remove("hidden");
    clearTimeout(elements.toastMessage._timer);
    elements.toastMessage._timer = setTimeout(() => {
        elements.toastMessage.classList.add("hidden");
    }, 3200);
}

async function refreshLobby() {
    try {
        const rooms = await useCases.loadRooms();
        renderRoomsList(rooms);
    } catch (error) {
        showToast(error.message, true);
    }
}

function renderRoomsList(rooms) {
    elements.roomsList.innerHTML = "";
    if (!rooms || rooms.length === 0) {
        elements.roomsList.innerHTML = `<p class="hint">No hay salas registradas todavía. Crea la primera.</p>`;
        return;
    }

    rooms.forEach(room => {
        const item = document.createElement("div");
        item.className = "room-item";

        const info = document.createElement("div");
        const opponent = room.blackPlayer ? room.blackPlayer : "Esperando rival...";
        const resultText = room.winner ? ` · Ganador: ${room.winner}` : "";
        info.innerHTML = `
            <strong>Sala ${room.roomCode}</strong> <span class="badge">${room.status}</span>
            <div class="hint">♔ ${room.whitePlayer} vs ♚ ${opponent} · ${room.moves.length} jugadas${resultText}</div>
        `;

        const actions = document.createElement("div");
        actions.className = "room-actions";

        if (room.status === "WAITING") {
            const joinBtn = document.createElement("button");
            joinBtn.className = "btn btn-secondary";
            joinBtn.textContent = "Unirse";
            joinBtn.addEventListener("click", () => handleJoinByCode(room.roomCode));
            actions.appendChild(joinBtn);
        }

        const openBtn = document.createElement("button");
        openBtn.className = "btn btn-ghost";
        openBtn.textContent = room.status === "FINISHED" ? "Ver histórico" : "Entrar / Observar";
        openBtn.addEventListener("click", () => enterRoom(room));
        actions.appendChild(openBtn);

        item.appendChild(info);
        item.appendChild(actions);
        elements.roomsList.appendChild(item);
    });
}

function enterRoom(room) {
    state.currentRoom = room;
    state.selectedSquare = null;
    state.replayIndex = null;
    elements.lobbyView.classList.add("hidden");
    elements.gameView.classList.remove("hidden");
    renderGameView();
    startPolling();
}

function leaveRoom() {
    stopPolling();
    state.currentRoom = null;
    state.selectedSquare = null;
    state.replayIndex = null;
    elements.gameView.classList.add("hidden");
    elements.lobbyView.classList.remove("hidden");
    refreshLobby();
}

function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(async () => {
        if (!state.currentRoom) return;
        try {
            const updated = await useCases.refreshRoom(state.currentRoom.roomId);
            state.currentRoom = updated;
            renderGameView();
        } catch (error) {
            stopPolling();
        }
    }, CONFIG.POLL_INTERVAL_MS);
}

function stopPolling() {
    if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
    }
}

function renderGameView() {
    const room = state.currentRoom;
    if (!room) return;

    const role = getPlayerRole(room);
    elements.roomStatusBadge.textContent = room.status;
    elements.roleBadge.textContent = role;
    elements.activeRoomCode.textContent = room.roomCode;
    elements.whitePlayerName.textContent = room.whitePlayer;
    elements.blackPlayerName.textContent = room.blackPlayer || "Esperando rival...";

    if (room.status === "WAITING") {
        elements.turnIndicator.textContent = "Esperando segundo jugador";
    } else if (room.status === "FINISHED") {
        elements.turnIndicator.textContent = `Fin · Ganador: ${room.winner}`;
    } else {
        const turnColor = room.currentTurn === "White" ? "Blancas" : "Negras";
        elements.turnIndicator.textContent = `Turno: ${turnColor}`;
    }

    elements.resignBtn.disabled = room.status !== "PLAYING" || role === "ESPECTADOR";

    const totalMoves = room.moves.length;
    const isReplaying = state.replayIndex !== null && state.replayIndex < totalMoves;
    const boardToRender = isReplaying
        ? reconstructBoardAtMove(room.moves, state.replayIndex)
        : room.board;

    const activeMoveIndex = isReplaying ? state.replayIndex : totalMoves;
    const lastMove = activeMoveIndex > 0 ? room.moves[activeMoveIndex - 1] : null;
    elements.replayLabel.textContent = isReplaying ? `Jugada ${state.replayIndex}/${totalMoves}` : "En vivo";

    boardRenderer.render(boardToRender, isReplaying ? null : state.selectedSquare, lastMove);
    renderMovesHistory(room.moves, activeMoveIndex);
}

function renderMovesHistory(moves, activeMoveIndex) {
    elements.movesHistoryList.innerHTML = "";
    if (moves.length === 0) {
        elements.movesHistoryList.innerHTML = `<li class="hint">Sin movimientos registrados aún.</li>`;
        return;
    }

    moves.forEach((move, idx) => {
        const li = document.createElement("li");
        li.className = "move-entry";
        if (idx + 1 === activeMoveIndex) {
            li.classList.add("active");
        }
        const symbol = move.color === "White" ? "♔" : "♚";
        li.innerHTML = `
            <span><strong>#${move.moveNumber}</strong> ${symbol} ${move.from} → ${move.to}</span>
            <span class="hint">${move.player}</span>
        `;
        li.addEventListener("click", () => {
            state.replayIndex = idx + 1 === moves.length ? null : idx + 1;
            state.selectedSquare = null;
            renderGameView();
        });
        elements.movesHistoryList.appendChild(li);
    });
}

async function handleSquareClick(coord) {
    const room = state.currentRoom;
    if (!room || room.status !== "PLAYING") return;

    if (state.replayIndex !== null && state.replayIndex < room.moves.length) {
        showToast("Pulsa 'Actual' para volver al tablero en vivo antes de mover", true);
        return;
    }

    const role = getPlayerRole(room);
    if (role === "ESPECTADOR") {
        showToast("Estás en modo espectador", true);
        return;
    }

    const myColor = role === "BLANCAS" ? "White" : "Black";
    if (room.currentTurn !== myColor) {
        showToast("No es tu turno", true);
        return;
    }

    const clickedPiece = room.board[coord];
    if (clickedPiece && clickedPiece.startsWith(myColor)) {
        state.selectedSquare = state.selectedSquare === coord ? null : coord;
        renderGameView();
        return;
    }

    if (state.selectedSquare) {
        const from = state.selectedSquare;
        state.selectedSquare = null;
        try {
            const updated = await useCases.makeMove(room.roomId, getPlayerName(), from, coord);
            state.currentRoom = updated;
            renderGameView();
        } catch (error) {
            showToast(error.message, true);
            renderGameView();
        }
    }
}

async function handleCreateRoom() {
    try {
        const room = await useCases.createRoom(getPlayerName());
        showToast(`Sala creada con código ${room.roomCode}`);
        enterRoom(room);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleJoinByCode(code) {
    try {
        const room = await useCases.joinRoom(code, getPlayerName());
        showToast(`Te has unido a la sala ${room.roomCode}`);
        enterRoom(room);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleResign() {
    if (!state.currentRoom) return;
    try {
        const updated = await useCases.resignGame(state.currentRoom.roomId, getPlayerName());
        state.currentRoom = updated;
        showToast("Partida finalizada");
        renderGameView();
    } catch (error) {
        showToast(error.message, true);
    }
}

elements.adapterSelect.addEventListener("change", event => {
    const selected = event.target.value;
    useCases.setService(selected === "mock" ? mockAdapter : httpAdapter);
    showToast(`Adaptador cambiado a: ${selected === "mock" ? "Mock Local" : "HTTP Backend"}`);
    if (state.currentRoom) {
        leaveRoom();
    } else {
        refreshLobby();
    }
});

elements.createRoomBtn.addEventListener("click", handleCreateRoom);
elements.joinRoomBtn.addEventListener("click", () => handleJoinByCode(elements.roomCodeInput.value));
elements.refreshRoomsBtn.addEventListener("click", refreshLobby);
elements.backToLobbyBtn.addEventListener("click", leaveRoom);
elements.resignBtn.addEventListener("click", handleResign);

elements.replayPrevBtn.addEventListener("click", () => {
    if (!state.currentRoom || state.currentRoom.moves.length === 0) return;
    const total = state.currentRoom.moves.length;
    const current = state.replayIndex === null ? total : state.replayIndex;
    state.replayIndex = Math.max(0, current - 1);
    renderGameView();
});

elements.replayNextBtn.addEventListener("click", () => {
    if (!state.currentRoom || state.replayIndex === null) return;
    const total = state.currentRoom.moves.length;
    const next = state.replayIndex + 1;
    state.replayIndex = next >= total ? null : next;
    renderGameView();
});

elements.replayLiveBtn.addEventListener("click", () => {
    state.replayIndex = null;
    renderGameView();
});

refreshLobby();