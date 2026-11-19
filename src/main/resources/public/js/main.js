import { CONFIG } from "./config.js";
import {
    PIECE_SYMBOLS,
    computeCapturedMaterial,
    findKingSquare,
    getValidMovesForSquare,
    isKingInCheck,
    reconstructBoardAtMove
} from "./domain/ChessModels.js";
import { RoomInteractionUseCases } from "./usecases/RoomInteractionUseCases.js";
import { HttpChessAdapter } from "./adapters/HttpChessAdapter.js";
import { MockChessAdapter } from "./adapters/MockChessAdapter.js";
import { BoardRenderer } from "./ui/BoardRenderer.js";
import { SoundEffects } from "./ui/SoundEffects.js";

const httpAdapter = new HttpChessAdapter(CONFIG.API_BASE_URL);
const mockAdapter = new MockChessAdapter();
const useCases = new RoomInteractionUseCases(httpAdapter);
const sounds = new SoundEffects();

const state = {
    currentRoom: null,
    currentReview: null,
    selectedSquare: null,
    replayIndex: null,
    boardFlipped: false,
    pendingPromotion: null,
    isSubmittingMove: false,
    lastKnownMoveCount: 0,
    lastKnownCapturedCount: 0,
    lastKnownStatus: null,
    pollTimer: null,
    clockTimer: null
};

const elements = {
    soundToggleBtn: document.getElementById("soundToggleBtn"),
    adapterSelect: document.getElementById("adapterSelect"),
    lobbyView: document.getElementById("lobbyView"),
    gameView: document.getElementById("gameView"),
    playerNameInput: document.getElementById("playerNameInput"),
    opponentModeSelect: document.getElementById("opponentModeSelect"),
    playerColorSelect: document.getElementById("playerColorSelect"),
    timeLimitSelect: document.getElementById("timeLimitSelect"),
    roomCodeInput: document.getElementById("roomCodeInput"),
    createRoomBtn: document.getElementById("createRoomBtn"),
    joinRoomBtn: document.getElementById("joinRoomBtn"),
    refreshRoomsBtn: document.getElementById("refreshRoomsBtn"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    roomsList: document.getElementById("roomsList"),
    roomStatusBadge: document.getElementById("roomStatusBadge"),
    roleBadge: document.getElementById("roleBadge"),
    activeRoomCode: document.getElementById("activeRoomCode"),
    flipBoardBtn: document.getElementById("flipBoardBtn"),
    copyInviteBtn: document.getElementById("copyInviteBtn"),
    backToLobbyBtn: document.getElementById("backToLobbyBtn"),
    gameAlertBanner: document.getElementById("gameAlertBanner"),
    topPlayerBar: document.getElementById("topPlayerBar"),
    topPlayerIcon: document.getElementById("topPlayerIcon"),
    topPlayerName: document.getElementById("topPlayerName"),
    topCapturedPieces: document.getElementById("topCapturedPieces"),
    topPlayerClock: document.getElementById("topPlayerClock"),
    bottomPlayerBar: document.getElementById("bottomPlayerBar"),
    bottomPlayerIcon: document.getElementById("bottomPlayerIcon"),
    bottomPlayerName: document.getElementById("bottomPlayerName"),
    bottomCapturedPieces: document.getElementById("bottomCapturedPieces"),
    bottomPlayerClock: document.getElementById("bottomPlayerClock"),
    promotionModal: document.getElementById("promotionModal"),
    turnIndicator: document.getElementById("turnIndicator"),
    reviewGameBtn: document.getElementById("reviewGameBtn"),
    rematchBtn: document.getElementById("rematchBtn"),
    drawBtn: document.getElementById("drawBtn"),
    resignBtn: document.getElementById("resignBtn"),
    replayPrevBtn: document.getElementById("replayPrevBtn"),
    replayNextBtn: document.getElementById("replayNextBtn"),
    replayLiveBtn: document.getElementById("replayLiveBtn"),
    replayLabel: document.getElementById("replayLabel"),
    gameReviewPanel: document.getElementById("gameReviewPanel"),
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

function formatClock(ms, timeLimitSeconds) {
    if (!timeLimitSeconds || timeLimitSeconds <= 0) return "∞";
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatEndReason(reason) {
    const labels = {
        CHECKMATE: "Jaque Mate",
        STALEMATE: "Tablas por Ahogado",
        INSUFFICIENT_MATERIAL: "Tablas por material insuficiente",
        DRAW_AGREED: "Tablas acordadas",
        TIMEOUT: "Tiempo agotado",
        RESIGNATION: "Abandono"
    };
    return labels[reason] || "Partida finalizada";
}

function showToast(message, isError = false) {
    elements.toastMessage.textContent = message;
    elements.toastMessage.classList.toggle("error", isError);
    elements.toastMessage.classList.remove("hidden");
    clearTimeout(elements.toastMessage._timer);
    elements.toastMessage._timer = setTimeout(() => {
        elements.toastMessage.classList.add("hidden");
    }, 3500);
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
        const whiteName = room.whitePlayer || "Esperando blancas...";
        const blackName = room.blackPlayer || "Esperando negras...";
        let resultText = "";
        if (room.winner) {
            resultText = room.winner === "DRAW"
                ? ` · Resultado: Tablas (${formatEndReason(room.endReason)})`
                : ` · Ganador: ${room.winner} (${formatEndReason(room.endReason)})`;
        }
        const timeText = room.timeLimitSeconds > 0 ? ` · ${Math.floor(room.timeLimitSeconds / 60)} min` : " · Sin reloj";
        info.innerHTML = `
            <strong>Sala ${room.roomCode}</strong> <span class="badge">${room.status}</span>
            <div class="hint">♔ ${whiteName} vs ♚ ${blackName} · ${room.moves.length} jugadas${timeText}${resultText}</div>
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

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger";
        deleteBtn.textContent = "✕";
        deleteBtn.title = "Eliminar sala";
        deleteBtn.addEventListener("click", async () => {
            await useCases.deleteRoom(room.roomId);
            refreshLobby();
        });
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);
        elements.roomsList.appendChild(item);
    });
}

function enterRoom(room) {
    const initialCaptured = computeCapturedMaterial(room.moves);
    state.currentRoom = room;
    state.currentReview = null;
    state.selectedSquare = null;
    state.replayIndex = null;
    state.pendingPromotion = null;
    state.isSubmittingMove = false;
    state.lastKnownMoveCount = room.moves.length;
    state.lastKnownCapturedCount = initialCaptured.capturedByWhite.length + initialCaptured.capturedByBlack.length;
    state.lastKnownStatus = room.status;
    state.boardFlipped = getPlayerRole(room) === "NEGRAS";
    elements.promotionModal.classList.add("hidden");
    elements.gameReviewPanel.classList.add("hidden");
    elements.lobbyView.classList.add("hidden");
    elements.gameView.classList.remove("hidden");
    renderGameView();
    startTimers();
}

function leaveRoom() {
    stopTimers();
    state.currentRoom = null;
    state.currentReview = null;
    state.selectedSquare = null;
    state.replayIndex = null;
    state.pendingPromotion = null;
    state.isSubmittingMove = false;
    elements.promotionModal.classList.add("hidden");
    elements.gameReviewPanel.classList.add("hidden");
    elements.gameView.classList.add("hidden");
    elements.lobbyView.classList.remove("hidden");
    refreshLobby();
}

function startTimers() {
    stopTimers();
    state.pollTimer = setInterval(async () => {
        if (!state.currentRoom || state.isSubmittingMove) return;
        try {
            const updated = await useCases.refreshRoom(state.currentRoom.roomId);
            if (!state.isSubmittingMove) {
                handleRoomUpdateWithEffects(updated);
            }
        } catch (error) {
            stopTimers();
        }
    }, CONFIG.POLL_INTERVAL_MS);

    state.clockTimer = setInterval(() => {
        updateClocksDisplay();
    }, 400);
}

function stopTimers() {
    if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
    }
    if (state.clockTimer) {
        clearInterval(state.clockTimer);
        state.clockTimer = null;
    }
}

function handleRoomUpdateWithEffects(updated) {
    const captured = computeCapturedMaterial(updated.moves);
    const totalCaptured = captured.capturedByWhite.length + captured.capturedByBlack.length;
    const hadNewMove = updated.moves.length > state.lastKnownMoveCount;
    const hadCapture = totalCaptured > state.lastKnownCapturedCount;
    const justFinished = updated.status === "FINISHED" && state.lastKnownStatus !== "FINISHED";

    state.currentRoom = updated;
    state.lastKnownMoveCount = updated.moves.length;
    state.lastKnownCapturedCount = totalCaptured;
    state.lastKnownStatus = updated.status;

    if (justFinished) {
        sounds.playGameOver();
    } else if (hadNewMove) {
        if (updated.inCheck) {
            sounds.playCheck();
        } else if (hadCapture) {
            sounds.playCapture();
        } else {
            sounds.playMove();
        }
    }

    renderGameView();
}

function updateClocksDisplay() {
    const room = state.currentRoom;
    if (!room) return;
    let whiteMs = room.whiteTimeRemainingMs || 0;
    let blackMs = room.blackTimeRemainingMs || 0;

    if (room.status === "PLAYING" && room.timeLimitSeconds > 0 && room.lastMoveTimestamp) {
        const elapsed = Math.max(0, Date.now() - Date.parse(room.lastMoveTimestamp));
        if (room.currentTurn === "White") {
            whiteMs = Math.max(0, whiteMs - elapsed);
        } else {
            blackMs = Math.max(0, blackMs - elapsed);
        }
    }

    const whiteText = formatClock(whiteMs, room.timeLimitSeconds);
    const blackText = formatClock(blackMs, room.timeLimitSeconds);

    if (state.boardFlipped) {
        elements.topPlayerClock.textContent = whiteText;
        elements.bottomPlayerClock.textContent = blackText;
    } else {
        elements.topPlayerClock.textContent = blackText;
        elements.bottomPlayerClock.textContent = whiteText;
    }
}

function renderCapturedRow(container, pieces, advantage) {
    container.innerHTML = "";
    const grouped = new Map();
    pieces.forEach(p => {
        grouped.set(p, (grouped.get(p) || 0) + 1);
    });

    grouped.forEach((count, pieceKey) => {
        const groupSpan = document.createElement("span");
        groupSpan.className = "captured-group";
        groupSpan.textContent = PIECE_SYMBOLS[pieceKey] || "";
        if (count > 1) {
            const countSpan = document.createElement("span");
            countSpan.className = "captured-count";
            countSpan.textContent = `×${count}`;
            groupSpan.appendChild(countSpan);
        }
        container.appendChild(groupSpan);
    });

    if (advantage > 0) {
        const advSpan = document.createElement("span");
        advSpan.className = "material-adv";
        advSpan.textContent = `+${advantage}`;
        container.appendChild(advSpan);
    }
}

function renderReviewSummaryPanel() {
    const room = state.currentRoom;
    const review = state.currentReview;
    if (!room || !review) {
        elements.gameReviewPanel.classList.add("hidden");
        return;
    }

    const renderPlayerCard = (label, accuracy, summary) => `
        <div class="review-player-box">
            <strong>${label}</strong>
            <div class="review-accuracy">${accuracy.toFixed(1)}%</div>
            <div class="review-stats">
                <span><span class="move-tag tag-EXCELLENT">!</span> Excelentes: <strong>${summary.excellent}</strong></span>
                <span><span class="move-tag tag-GOOD">✓</span> Buenas: <strong>${summary.good}</strong></span>
                <span><span class="move-tag tag-INACCURACY">?!</span> Imprecisiones: <strong>${summary.inaccuracy}</strong></span>
                <span><span class="move-tag tag-MISTAKE">?</span> Errores: <strong>${summary.mistake}</strong></span>
                <span><span class="move-tag tag-BLUNDER">??</span> Graves: <strong>${summary.blunder}</strong></span>
            </div>
        </div>
    `;

    elements.gameReviewPanel.innerHTML = `
        <h4>📊 Revisión de la partida</h4>
        <div class="review-grid">
            ${renderPlayerCard(`♔ ${room.whitePlayer || "Blancas"}`, review.whiteAccuracy, review.whiteSummary)}
            ${renderPlayerCard(`♚ ${room.blackPlayer || "Negras"}`, review.blackAccuracy, review.blackSummary)}
        </div>
    `;
    elements.gameReviewPanel.classList.remove("hidden");
}

function renderGameView() {
    const room = state.currentRoom;
    if (!room) return;

    const role = getPlayerRole(room);
    elements.roomStatusBadge.textContent = room.status;
    elements.roleBadge.textContent = role;
    elements.activeRoomCode.textContent = room.roomCode;

    const captured = computeCapturedMaterial(room.moves);
    const whiteLabel = room.whitePlayer || "Esperando rival...";
    const blackLabel = room.blackPlayer || "Esperando rival...";

    if (state.boardFlipped) {
        elements.topPlayerIcon.textContent = "♔";
        elements.topPlayerName.textContent = whiteLabel;
        renderCapturedRow(elements.topCapturedPieces, captured.capturedByWhite, captured.whiteAdvantage);
        elements.topPlayerBar.classList.toggle("active-turn", room.status === "PLAYING" && room.currentTurn === "White");

        elements.bottomPlayerIcon.textContent = "♚";
        elements.bottomPlayerName.textContent = blackLabel;
        renderCapturedRow(elements.bottomCapturedPieces, captured.capturedByBlack, captured.blackAdvantage);
        elements.bottomPlayerBar.classList.toggle("active-turn", room.status === "PLAYING" && room.currentTurn === "Black");
    } else {
        elements.topPlayerIcon.textContent = "♚";
        elements.topPlayerName.textContent = blackLabel;
        renderCapturedRow(elements.topCapturedPieces, captured.capturedByBlack, captured.blackAdvantage);
        elements.topPlayerBar.classList.toggle("active-turn", room.status === "PLAYING" && room.currentTurn === "Black");

        elements.bottomPlayerIcon.textContent = "♔";
        elements.bottomPlayerName.textContent = whiteLabel;
        renderCapturedRow(elements.bottomCapturedPieces, captured.capturedByWhite, captured.whiteAdvantage);
        elements.bottomPlayerBar.classList.toggle("active-turn", room.status === "PLAYING" && room.currentTurn === "White");
    }

    const me = getPlayerName().toLowerCase();
    const opponentRequestedRematch = room.status === "FINISHED"
        && room.rematchRoomId
        && room.rematchRequestedBy
        && room.rematchRequestedBy.toLowerCase() !== me
        && role !== "ESPECTADOR";

    elements.reviewGameBtn.classList.toggle("hidden", room.status !== "FINISHED" || room.moves.length === 0);

    if (opponentRequestedRematch) {
        elements.gameAlertBanner.className = "game-alert rematch-alert";
        elements.gameAlertBanner.innerHTML = "";
        const msgSpan = document.createElement("span");
        msgSpan.textContent = `⚔️ ¡${room.rematchRequestedBy} te ha retado a la revancha!`;
        const acceptBtn = document.createElement("button");
        acceptBtn.className = "btn btn-secondary";
        acceptBtn.textContent = "✅ Aceptar revancha";
        acceptBtn.addEventListener("click", handleRematch);
        elements.gameAlertBanner.appendChild(msgSpan);
        elements.gameAlertBanner.appendChild(acceptBtn);
        elements.gameAlertBanner.classList.remove("hidden");
        elements.rematchBtn.textContent = "✅ Aceptar revancha";
        elements.rematchBtn.classList.remove("hidden");
    } else if (room.status === "FINISHED") {
        elements.gameAlertBanner.className = "game-alert finish-alert";
        const winnerLabel = room.winner === "DRAW"
            ? "Empate / Tablas"
            : `Ganador: ${room.winner}`;
        elements.gameAlertBanner.textContent = `🏁 ${formatEndReason(room.endReason)} · ${winnerLabel}`;
        elements.gameAlertBanner.classList.remove("hidden");
        elements.rematchBtn.textContent = "🔄 Revancha";
        elements.rematchBtn.classList.toggle("hidden", role === "ESPECTADOR");
    } else if (room.inCheck) {
        elements.gameAlertBanner.className = "game-alert check-alert";
        const checkedSide = room.currentTurn === "White" ? "Blancas" : "Negras";
        elements.gameAlertBanner.textContent = `⚠️ ¡JAQUE al rey de ${checkedSide}!`;
        elements.gameAlertBanner.classList.remove("hidden");
        elements.rematchBtn.classList.add("hidden");
    } else {
        elements.gameAlertBanner.classList.add("hidden");
        elements.rematchBtn.classList.add("hidden");
    }

    const myColor = role === "BLANCAS" ? "White" : role === "NEGRAS" ? "Black" : null;
    const isMyTurn = room.status === "PLAYING" && myColor === room.currentTurn;
    elements.turnIndicator.classList.toggle("my-turn", isMyTurn && !room.inCheck);
    elements.turnIndicator.classList.toggle("in-check-pill", room.status === "PLAYING" && room.inCheck);

    if (room.status === "WAITING") {
        elements.turnIndicator.textContent = "Esperando rival...";
    } else if (room.status === "FINISHED") {
        elements.turnIndicator.textContent = formatEndReason(room.endReason);
    } else if (room.inCheck) {
        elements.turnIndicator.textContent = isMyTurn ? "¡ESTÁS EN JAQUE!" : "¡JAQUE!";
    } else if (isMyTurn) {
        elements.turnIndicator.textContent = "¡TU TURNO!";
    } else {
        const turnColor = room.currentTurn === "White" ? "Blancas" : "Negras";
        elements.turnIndicator.textContent = `Turno: ${turnColor}`;
    }

    updateClocksDisplay();
    const canAct = room.status === "PLAYING" && role !== "ESPECTADOR";
    elements.resignBtn.disabled = !canAct;
    elements.drawBtn.disabled = !canAct;

    const totalMoves = room.moves.length;
    const isReplaying = state.replayIndex !== null && state.replayIndex < totalMoves;
    const boardToRender = isReplaying
        ? reconstructBoardAtMove(room.moves, state.replayIndex)
        : room.board;

    const activeMoveIndex = isReplaying ? state.replayIndex : totalMoves;
    const lastMove = activeMoveIndex > 0 ? room.moves[activeMoveIndex - 1] : null;
    elements.replayLabel.textContent = isReplaying ? `Jugada ${state.replayIndex}/${totalMoves}` : "En vivo";

    const validMoves = !isReplaying && isMyTurn && state.selectedSquare
        ? getValidMovesForSquare(boardToRender, state.selectedSquare, room.moves)
        : [];

    const checkedKingSquare = !isReplaying && room.inCheck
        ? findKingSquare(boardToRender, room.currentTurn)
        : null;

    boardRenderer.render(boardToRender, isReplaying ? null : state.selectedSquare, lastMove, validMoves, {
        flipped: state.boardFlipped,
        checkedKingSquare
    });
    renderReviewSummaryPanel();
    renderMovesHistory(room.moves, activeMoveIndex);
}

function renderMovesHistory(moves, activeMoveIndex) {
    elements.movesHistoryList.innerHTML = "";
    if (moves.length === 0) {
        elements.movesHistoryList.innerHTML = `<li class="hint">Sin movimientos registrados aún.</li>`;
        return;
    }

    const reviewByNumber = new Map();
    if (state.currentReview && state.currentReview.moves) {
        state.currentReview.moves.forEach(rm => reviewByNumber.set(rm.moveNumber, rm));
    }

    moves.forEach((move, idx) => {
        const li = document.createElement("li");
        li.className = "move-entry";
        if (idx + 1 === activeMoveIndex) {
            li.classList.add("active");
        }
        const symbol = PIECE_SYMBOLS[move.piece] || (move.color === "White" ? "♔" : "♚");
        const review = reviewByNumber.get(move.moveNumber);
        const tagHtml = review
            ? `<span class="move-tag tag-${review.classification}">${review.badge}</span>`
            : "";
        const showBestHint = review
            && (review.classification === "INACCURACY" || review.classification === "MISTAKE" || review.classification === "BLUNDER");
        const bestHtml = showBestHint
            ? `<span class="best-hint">Mejor era: ${review.bestMove}</span>`
            : "";

        li.innerHTML = `
            <div>
                <span><strong>#${move.moveNumber}</strong> ${symbol} ${move.from} → ${move.to}</span>${tagHtml}
                ${bestHtml}
            </div>
            <span class="hint">${move.player}</span>
        `;
        li.addEventListener("click", () => {
            state.replayIndex = idx + 1 === moves.length ? null : idx + 1;
            state.selectedSquare = null;
            renderGameView();
        });
        elements.movesHistoryList.appendChild(li);
    });
    elements.movesHistoryList.scrollTop = elements.movesHistoryList.scrollHeight;
}

async function handleSquareClick(coord) {
    const room = state.currentRoom;
    if (!room || room.status !== "PLAYING" || state.isSubmittingMove) return;

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
        const legalMoves = getValidMovesForSquare(room.board, from, room.moves);
        const chosenLegal = legalMoves.find(m => m.coord === coord);
        if (!chosenLegal) {
            state.selectedSquare = null;
            renderGameView();
            return;
        }

        const movingPiece = room.board[from];
        const isPromotionMove = (movingPiece === "WhitePawn" && coord.endsWith("8"))
            || (movingPiece === "BlackPawn" && coord.endsWith("1"));

        if (isPromotionMove) {
            state.pendingPromotion = { from, to: coord, color: myColor };
            openPromotionModal(myColor);
            return;
        }

        state.selectedSquare = null;
        await submitMove(from, coord, null);
    }
}

function openPromotionModal(color) {
    const buttons = elements.promotionModal.querySelectorAll(".promo-btn");
    buttons.forEach(btn => {
        const type = btn.dataset.piece;
        btn.textContent = PIECE_SYMBOLS[`${color}${type}`] || "♕";
    });
    elements.promotionModal.classList.remove("hidden");
}

function buildOptimisticRoom(room, from, to, promotion) {
    const boardCopy = { ...room.board };
    const movingPiece = boardCopy[from];
    const targetWasEmpty = !boardCopy[to];
    delete boardCopy[from];

    if ((movingPiece === "WhitePawn" || movingPiece === "BlackPawn") && from[0] !== to[0] && targetWasEmpty) {
        delete boardCopy[`${to[0]}${from[1]}`];
    }

    let finalPiece = movingPiece;
    if (movingPiece === "WhitePawn" && to.endsWith("8")) {
        finalPiece = `White${promotion || "Queen"}`;
    } else if (movingPiece === "BlackPawn" && to.endsWith("1")) {
        finalPiece = `Black${promotion || "Queen"}`;
    }
    boardCopy[to] = finalPiece;

    if ((movingPiece === "WhiteKing" || movingPiece === "BlackKing") && Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) === 2) {
        const rank = from[1];
        const kingSide = to[0] === "g";
        const rookFrom = `${kingSide ? "h" : "a"}${rank}`;
        const rookTo = `${kingSide ? "f" : "d"}${rank}`;
        boardCopy[rookTo] = boardCopy[rookFrom];
        delete boardCopy[rookFrom];
    }

    const nextTurn = room.currentTurn === "White" ? "Black" : "White";
    const nextInCheck = isKingInCheck(boardCopy, nextTurn);
    const optimisticMoves = [
        ...room.moves,
        {
            moveNumber: room.moves.length + 1,
            player: getPlayerName(),
            color: room.currentTurn,
            from,
            to,
            piece: finalPiece,
            timestamp: new Date().toISOString()
        }
    ];

    return {
        ...room,
        board: boardCopy,
        moves: optimisticMoves,
        currentTurn: nextTurn,
        inCheck: nextInCheck
    };
}

async function submitMove(from, to, promotion) {
    const room = state.currentRoom;
    if (!room) return;
    const snapshotBeforeMove = room;
    const prevCount = room.moves.length;

    state.isSubmittingMove = true;
    const optimistic = buildOptimisticRoom(room, from, to, promotion);
    handleRoomUpdateWithEffects(optimistic);

    const isBotGame = room.whitePlayer === "ChessBot" || room.blackPlayer === "ChessBot";
    if (isBotGame && optimistic.status === "PLAYING") {
        elements.turnIndicator.textContent = "ChessBot pensando...";
    }

    try {
        const updated = await useCases.makeMove(room.roomId, getPlayerName(), from, to, promotion);
        const isBotReply = isBotGame && updated.moves.length === prevCount + 2;

        if (isBotReply) {
            setTimeout(() => {
                state.isSubmittingMove = false;
                if (state.currentRoom && state.currentRoom.roomId === updated.roomId) {
                    handleRoomUpdateWithEffects(updated);
                }
            }, 350);
        } else {
            state.isSubmittingMove = false;
            handleRoomUpdateWithEffects(updated);
        }
    } catch (error) {
        state.isSubmittingMove = false;
        state.currentRoom = snapshotBeforeMove;
        state.lastKnownMoveCount = snapshotBeforeMove.moves.length;
        showToast(error.message, true);
        renderGameView();
    }
}

async function handleCreateRoom() {
    try {
        const timeLimit = parseInt(elements.timeLimitSelect.value, 10) || 0;
        const vsBot = elements.opponentModeSelect.value === "bot";
        const color = elements.playerColorSelect.value;
        const room = await useCases.createRoom(getPlayerName(), timeLimit, vsBot, color);
        showToast(vsBot ? "Partida contra ChessBot iniciada" : `Sala creada con código ${room.roomCode}`);
        enterRoom(room);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleRematch() {
    const oldRoom = state.currentRoom;
    if (!oldRoom) return;
    try {
        const nextRoom = await useCases.requestRematch(oldRoom.roomId, getPlayerName());
        const isBotGame = nextRoom.whitePlayer === "ChessBot" || nextRoom.blackPlayer === "ChessBot";
        if (isBotGame) {
            showToast("Revancha contra ChessBot iniciada");
        } else if (nextRoom.status === "PLAYING") {
            showToast("¡Revancha aceptada! Partida iniciada");
        } else {
            showToast("Solicitud de revancha enviada. Esperando a que tu rival acepte...");
        }
        enterRoom(nextRoom);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleReviewGame() {
    const room = state.currentRoom;
    if (!room) return;
    elements.reviewGameBtn.disabled = true;
    elements.reviewGameBtn.textContent = "Analizando...";
    try {
        state.currentReview = await useCases.reviewGame(room.roomId);
        renderGameView();
        showToast("Revisión de partida completada");
    } catch (error) {
        showToast(error.message, true);
    } finally {
        elements.reviewGameBtn.disabled = false;
        elements.reviewGameBtn.textContent = "📊 Revisar partida";
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

async function handleCopyInviteLink() {
    if (!state.currentRoom) return;
    const inviteUrl = `${window.location.origin}/?room=${state.currentRoom.roomCode}`;
    try {
        await navigator.clipboard.writeText(inviteUrl);
        showToast(`Enlace copiado: ${inviteUrl}`);
    } catch (error) {
        showToast(`Comparte este enlace: ${inviteUrl}`);
    }
}

async function handleResign() {
    if (!state.currentRoom) return;
    try {
        const updated = await useCases.resignGame(state.currentRoom.roomId, getPlayerName());
        handleRoomUpdateWithEffects(updated);
        showToast("Has abandonado la partida");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleDraw() {
    if (!state.currentRoom) return;
    try {
        const updated = await useCases.agreeDraw(state.currentRoom.roomId, getPlayerName());
        handleRoomUpdateWithEffects(updated);
        showToast("Partida finalizada en tablas");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleClearHistory() {
    try {
        await useCases.clearRooms();
        showToast("Historial de salas borrado");
        refreshLobby();
    } catch (error) {
        showToast(error.message, true);
    }
}

function checkInviteLinkOnLoad() {
    const params = new URLSearchParams(window.location.search);
    const invitedCode = params.get("room");
    if (invitedCode) {
        elements.roomCodeInput.value = invitedCode.trim().toUpperCase();
        elements.playerNameInput.focus();
        showToast(`Invitación detectada para sala ${invitedCode.trim().toUpperCase()}. Escribe tu nombre y pulsa Unirse.`);
    }
}

elements.soundToggleBtn.addEventListener("click", () => {
    const enabled = sounds.toggle();
    elements.soundToggleBtn.textContent = enabled ? "🔊 Sonido" : "🔇 Silencio";
});

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

elements.promotionModal.querySelectorAll(".promo-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        if (!state.pendingPromotion) return;
        const { from, to } = state.pendingPromotion;
        const chosenPiece = btn.dataset.piece;
        state.pendingPromotion = null;
        state.selectedSquare = null;
        elements.promotionModal.classList.add("hidden");
        await submitMove(from, to, chosenPiece);
    });
});

elements.flipBoardBtn.addEventListener("click", () => {
    state.boardFlipped = !state.boardFlipped;
    renderGameView();
});

elements.createRoomBtn.addEventListener("click", handleCreateRoom);
elements.reviewGameBtn.addEventListener("click", handleReviewGame);
elements.rematchBtn.addEventListener("click", handleRematch);
elements.joinRoomBtn.addEventListener("click", () => handleJoinByCode(elements.roomCodeInput.value));
elements.refreshRoomsBtn.addEventListener("click", refreshLobby);
elements.clearHistoryBtn.addEventListener("click", handleClearHistory);
elements.copyInviteBtn.addEventListener("click", handleCopyInviteLink);
elements.backToLobbyBtn.addEventListener("click", leaveRoom);
elements.resignBtn.addEventListener("click", handleResign);
elements.drawBtn.addEventListener("click", handleDraw);

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

checkInviteLinkOnLoad();
refreshLobby();