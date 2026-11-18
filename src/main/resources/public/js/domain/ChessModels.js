export const PIECE_SYMBOLS = {
    WhiteKing: "♔",
    WhiteQueen: "♕",
    WhiteRook: "♖",
    WhiteBishop: "♗",
    WhiteKnight: "♘",
    WhitePawn: "♙",
    BlackKing: "♚",
    BlackQueen: "♛",
    BlackRook: "♜",
    BlackBishop: "♝",
    BlackKnight: "♞",
    BlackPawn: "♟"
};

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export function createInitialBoardMap() {
    return {
        a1: "WhiteRook", b1: "WhiteKnight", c1: "WhiteBishop", d1: "WhiteQueen",
        e1: "WhiteKing", f1: "WhiteBishop", g1: "WhiteKnight", h1: "WhiteRook",
        a2: "WhitePawn", b2: "WhitePawn", c2: "WhitePawn", d2: "WhitePawn",
        e2: "WhitePawn", f2: "WhitePawn", g2: "WhitePawn", h2: "WhitePawn",
        a7: "BlackPawn", b7: "BlackPawn", c7: "BlackPawn", d7: "BlackPawn",
        e7: "BlackPawn", f7: "BlackPawn", g7: "BlackPawn", h7: "BlackPawn",
        a8: "BlackRook", b8: "BlackKnight", c8: "BlackBishop", d8: "BlackQueen",
        e8: "BlackKing", f8: "BlackBishop", g8: "BlackKnight", h8: "BlackRook"
    };
}

export function reconstructBoardAtMove(moves, moveIndex) {
    const board = createInitialBoardMap();
    const limit = Math.min(moveIndex, moves.length);
    for (let i = 0; i < limit; i++) {
        const move = moves[i];
        const piece = board[move.from];
        const targetWasEmpty = !board[move.to];
        delete board[move.from];

        if ((piece === "WhitePawn" || piece === "BlackPawn") && move.from[0] !== move.to[0] && targetWasEmpty) {
            delete board[`${move.to[0]}${move.from[1]}`];
        }

        if (piece === "WhitePawn" && move.to.endsWith("8")) {
            board[move.to] = "WhiteQueen";
        } else if (piece === "BlackPawn" && move.to.endsWith("1")) {
            board[move.to] = "BlackQueen";
        } else {
            board[move.to] = piece;
        }

        if ((piece === "WhiteKing" || piece === "BlackKing") && Math.abs(move.to.charCodeAt(0) - move.from.charCodeAt(0)) === 2) {
            const rank = move.from[1];
            const kingSide = move.to[0] === "g";
            const rookFrom = `${kingSide ? "h" : "a"}${rank}`;
            const rookTo = `${kingSide ? "f" : "d"}${rank}`;
            board[rookTo] = board[rookFrom];
            delete board[rookFrom];
        }
    }
    return board;
}

export function getValidMovesForSquare(boardMap, fromCoord, moves = []) {
    if (!fromCoord || !boardMap[fromCoord]) return [];
    const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
    const results = [];
    for (const file of FILES) {
        for (const rank of RANKS) {
            const toCoord = `${file}${rank}`;
            const check = evaluateMove(boardMap, fromCoord, toCoord, moves, lastMove);
            if (check.valid) {
                results.push({
                    coord: toCoord,
                    isCapture: check.isCapture
                });
            }
        }
    }
    return results;
}

function evaluateMove(board, from, to, moves, lastMove) {
    if (from === to) return { valid: false };
    const moving = board[from];
    if (!moving) return { valid: false };
    const color = moving.startsWith("White") ? "White" : "Black";
    const target = board[to];
    if (target && (target.startsWith(color) || target.endsWith("King"))) return { valid: false };

    const fromF = FILES.indexOf(from[0]);
    const fromR = parseInt(from[1], 10);
    const toF = FILES.indexOf(to[0]);
    const toR = parseInt(to[1], 10);
    const df = toF - fromF;
    const dr = toR - fromR;

    if (moving.endsWith("Pawn")) {
        const dir = color === "White" ? 1 : -1;
        const startRank = color === "White" ? 2 : 7;
        if (df === 0 && !target) {
            if (dr === dir) return { valid: true, isCapture: false };
            if (dr === 2 * dir && fromR === startRank) {
                return { valid: !board[`${from[0]}${fromR + dir}`], isCapture: false };
            }
        }
        if (Math.abs(df) === 1 && dr === dir && Boolean(target)) {
            return { valid: true, isCapture: true };
        }
        if (Math.abs(df) === 1 && dr === dir && !target && lastMove) {
            const enPassantRank = color === "White" ? 5 : 4;
            const lastFromR = parseInt(lastMove.from[1], 10);
            const lastToR = parseInt(lastMove.to[1], 10);
            const isEnPassant = fromR === enPassantRank
                && lastMove.piece.endsWith("Pawn")
                && !lastMove.piece.startsWith(color)
                && Math.abs(lastToR - lastFromR) === 2
                && lastMove.to[0] === to[0]
                && lastToR === fromR;
            return { valid: isEnPassant, isCapture: isEnPassant };
        }
        return { valid: false };
    }
    if (moving.endsWith("Rook")) {
        return { valid: (df === 0 || dr === 0) && isPathClear(board, fromF, fromR, toF, toR), isCapture: Boolean(target) };
    }
    if (moving.endsWith("Bishop")) {
        return { valid: Math.abs(df) === Math.abs(dr) && isPathClear(board, fromF, fromR, toF, toR), isCapture: Boolean(target) };
    }
    if (moving.endsWith("Queen")) {
        return { valid: (df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) && isPathClear(board, fromF, fromR, toF, toR), isCapture: Boolean(target) };
    }
    if (moving.endsWith("Knight")) {
        return { valid: (Math.abs(df) === 2 && Math.abs(dr) === 1) || (Math.abs(df) === 1 && Math.abs(dr) === 2), isCapture: Boolean(target) };
    }
    if (moving.endsWith("King")) {
        if (Math.abs(df) <= 1 && Math.abs(dr) <= 1) return { valid: true, isCapture: Boolean(target) };
        return { valid: canCastle(board, color, from, df, dr, moves), isCapture: false };
    }
    return { valid: false };
}

function canCastle(board, color, from, df, dr, moves) {
    if (dr !== 0 || Math.abs(df) !== 2 || from[0] !== "e") return false;
    const rank = color === "White" ? "1" : "8";
    if (from[1] !== rank) return false;
    const kingSide = df === 2;
    const rookCoord = `${kingSide ? "h" : "a"}${rank}`;
    const rook = board[rookCoord];
    if (rook !== `${color}Rook`) return false;
    const kingMoved = moves.some(m => m.from === from);
    const rookMoved = moves.some(m => m.from === rookCoord);
    if (kingMoved || rookMoved) return false;
    return isPathClear(board, 4, parseInt(rank, 10), kingSide ? 7 : 0, parseInt(rank, 10));
}

function isPathClear(board, fromF, fromR, toF, toR) {
    const stepF = Math.sign(toF - fromF);
    const stepR = Math.sign(toR - fromR);
    let curF = fromF + stepF;
    let curR = fromR + stepR;
    while (curF !== toF || curR !== toR) {
        if (board[`${FILES[curF]}${curR}`]) return false;
        curF += stepF;
        curR += stepR;
    }
    return true;
}