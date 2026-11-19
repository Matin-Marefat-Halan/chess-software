import { FILES, PIECE_SYMBOLS, RANKS } from "../domain/ChessModels.js";

export class BoardRenderer {
    constructor(boardElement, onSquareClick) {
        this.boardElement = boardElement;
        this.onSquareClick = onSquareClick;
    }

    render(boardMap, selectedSquare, lastMove, validMoves = [], options = {}) {
        const { flipped = false, checkedKingSquare = null } = options;
        this.boardElement.innerHTML = "";
        const validMap = new Map(validMoves.map(m => [m.coord, m.isCapture]));

        const displayRanks = flipped ? [...RANKS].reverse() : RANKS;
        const displayFiles = flipped ? [...FILES].reverse() : FILES;

        displayRanks.forEach((rank, rIdx) => {
            displayFiles.forEach((file, fIdx) => {
                const coord = `${file}${rank}`;
                const fileIndex = FILES.indexOf(file);
                const rankIndex = RANKS.indexOf(rank);
                const isLight = (fileIndex + rankIndex) % 2 === 0;

                const sq = document.createElement("div");
                sq.className = `square ${isLight ? "light" : "dark"}`;
                sq.dataset.coord = coord;

                if (selectedSquare === coord) {
                    sq.classList.add("selected");
                }
                if (lastMove && (lastMove.from === coord || lastMove.to === coord)) {
                    sq.classList.add("last-move");
                }
                if (checkedKingSquare === coord) {
                    sq.classList.add("in-check");
                }
                if (validMap.has(coord)) {
                    sq.classList.add(validMap.get(coord) ? "valid-capture" : "valid-move");
                }

                if (fIdx === 0) {
                    const rankSpan = document.createElement("span");
                    rankSpan.className = "coord-label coord-rank";
                    rankSpan.textContent = rank;
                    sq.appendChild(rankSpan);
                }
                if (rIdx === 7) {
                    const fileSpan = document.createElement("span");
                    fileSpan.className = "coord-label coord-file";
                    fileSpan.textContent = file;
                    sq.appendChild(fileSpan);
                }

                const pieceKey = boardMap[coord];
                if (pieceKey && PIECE_SYMBOLS[pieceKey]) {
                    const pieceSpan = document.createElement("span");
                    pieceSpan.textContent = PIECE_SYMBOLS[pieceKey];
                    sq.appendChild(pieceSpan);
                }

                sq.addEventListener("click", () => this.onSquareClick(coord));
                this.boardElement.appendChild(sq);
            });
        });
    }
}