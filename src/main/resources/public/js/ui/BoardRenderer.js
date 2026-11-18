import { FILES, PIECE_SYMBOLS, RANKS } from "../domain/ChessModels.js";

export class BoardRenderer {
    constructor(boardElement, onSquareClick) {
        this.boardElement = boardElement;
        this.onSquareClick = onSquareClick;
    }

    render(boardMap, selectedSquare, lastMove, validMoves = []) {
        const validMap = new Map(validMoves.map(m => [m.coord, m.isCapture]));
        this.boardElement.innerHTML = "";
        RANKS.forEach((rank, rankIdx) => {
            FILES.forEach((file, fileIdx) => {
                const coord = `${file}${rank}`;
                const squareEl = document.createElement("div");
                const isLight = (rankIdx + fileIdx) % 2 === 0;
                squareEl.className = `square ${isLight ? "light" : "dark"}`;

                if (selectedSquare === coord) {
                    squareEl.classList.add("selected");
                }
                if (lastMove && (lastMove.from === coord || lastMove.to === coord)) {
                    squareEl.classList.add("last-move");
                }
                if (validMap.has(coord)) {
                    squareEl.classList.add(validMap.get(coord) ? "valid-capture" : "valid-move");
                }

                if (fileIdx === 0) {
                    const rankLabel = document.createElement("span");
                    rankLabel.className = "coord-label coord-rank";
                    rankLabel.textContent = rank;
                    squareEl.appendChild(rankLabel);
                }
                if (rankIdx === 7) {
                    const fileLabel = document.createElement("span");
                    fileLabel.className = "coord-label coord-file";
                    fileLabel.textContent = file;
                    squareEl.appendChild(fileLabel);
                }

                const pieceName = boardMap?.[coord];
                if (pieceName && PIECE_SYMBOLS[pieceName]) {
                    const pieceSpan = document.createElement("span");
                    pieceSpan.textContent = PIECE_SYMBOLS[pieceName];
                    squareEl.appendChild(pieceSpan);
                }

                squareEl.addEventListener("click", () => this.onSquareClick(coord));
                this.boardElement.appendChild(squareEl);
            });
        });
    }
}