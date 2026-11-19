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

export const PIECE_VALUES = {
    Pawn: 1,
    Knight: 3,
    Bishop: 3,
    Rook: 5,
    Queen: 9,
    King: 0
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
        const moving = board[move.from];
        const targetWasEmpty = !board[move.to];
        delete board[move.from];

        if ((moving === "WhitePawn" || moving === "BlackPawn") && move.from[0] !== move.to[0] && targetWasEmpty) {
            delete board[`${move.to[0]}${move.from[1]}`];
        }

        board[move.to] = move.piece || moving;

        if ((moving === "WhiteKing" || moving === "BlackKing") && Math.abs(move.to.charCodeAt(0) - move.from.charCodeAt(0)) === 2) {
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

export function computeCapturedMaterial(moves) {
    const board = createInitialBoardMap();
    const capturedByWhite = [];
    const capturedByBlack = [];

    for (const move of moves) {
        const moving = board[move.from];
        const target = board[move.to];
        if (target) {
            if (move.color === "White") {
                capturedByWhite.push(target);
            } else {
                capturedByBlack.push(target);
            }
        } else if ((moving === "WhitePawn" || moving === "BlackPawn") && move.from[0] !== move.to[0]) {
            const epSquare = `${move.to[0]}${move.from[1]}`;
            const epPawn = board[epSquare];
            if (epPawn) {
                if (move.color === "White") {
                    capturedByWhite.push(epPawn);
                } else {
                    capturedByBlack.push(epPawn);
                }
                delete board[epSquare];
            }
        }

        delete board[move.from];
        board[move.to] = move.piece || moving;

        if ((moving === "WhiteKing" || moving === "BlackKing") && Math.abs(move.to.charCodeAt(0) - move.from.charCodeAt(0)) === 2) {
            const rank = move.from[1];
            const kingSide = move.to[0] === "g";
            const rookFrom = `${kingSide ? "h" : "a"}${rank}`;
            const rookTo = `${kingSide ? "f" : "d"}${rank}`;
            board[rookTo] = board[rookFrom];
            delete board[rookFrom];
        }
    }

    const pieceOrder = { Queen: 1, Rook: 2, Bishop: 3, Knight: 4, Pawn: 5 };
    const sortFn = (a, b) => (pieceOrder[a.slice(5)] || 9) - (pieceOrder[b.slice(5)] || 9);
    capturedByWhite.sort(sortFn);
    capturedByBlack.sort(sortFn);

    const whiteScore = capturedByWhite.reduce((sum, p) => sum + (PIECE_VALUES[p.slice(5)] || 0), 0);
    const blackScore = capturedByBlack.reduce((sum, p) => sum + (PIECE_VALUES[p.slice(5)] || 0), 0);

    return {
        capturedByWhite,
        capturedByBlack,
        whiteAdvantage: Math.max(0, whiteScore - blackScore),
        blackAdvantage: Math.max(0, blackScore - whiteScore)
    };
}

export function findKingSquare(boardMap, color) {
    const targetKing = `${color}King`;
    return Object.keys(boardMap).find(sq => boardMap[sq] === targetKing) || null;
}

export function isKingInCheck(boardMap, color) {
    const kingSq = findKingSquare(boardMap, color);
    if (!kingSq) return false;
    const enemy = color === "White" ? "Black" : "White";
    return isSquareAttacked(boardMap, kingSq, enemy);
}

export function getValidMovesForSquare(boardMap, fromCoord, moves = []) {
    if (!fromCoord || !boardMap[fromCoord]) return [];
    const moving = boardMap[fromCoord];
    const color = moving.startsWith("White") ? "White" : "Black";
    const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
    const results = [];

    for (const file of FILES) {
        for (const rank of RANKS) {
            const toCoord = `${file}${rank}`;
            const check = evaluatePseudoLegalMove(boardMap, fromCoord, toCoord, moves, lastMove);
            if (!check.valid) continue;

            if (moving.endsWith("King") && Math.abs(FILES.indexOf(toCoord[0]) - FILES.indexOf(fromCoord[0])) === 2) {
                if (isKingInCheck(boardMap, color)) continue;
                const stepF = Math.sign(FILES.indexOf(toCoord[0]) - FILES.indexOf(fromCoord[0]));
                const passingCoord = `${FILES[FILES.indexOf(fromCoord[0]) + stepF]}${fromCoord[1]}`;
                const enemy = color === "White" ? "Black" : "White";
                if (isSquareAttacked(boardMap, passingCoord, enemy) || isSquareAttacked(boardMap, toCoord, enemy)) {
                    continue;
                }
            }

            const simulated = simulateBoardMove(boardMap, fromCoord, toCoord);
            if (!isKingInCheck(simulated, color)) {
                results.push({
                    coord: toCoord,
                    isCapture: check.isCapture
                });
            }
        }
    }
    return results;
}

function simulateBoardMove(boardMap, from, to) {
    const copy = { ...boardMap };
    const moving = copy[from];
    const targetWasEmpty = !copy[to];
    delete copy[from];
    if ((moving === "WhitePawn" || moving === "BlackPawn") && from[0] !== to[0] && targetWasEmpty) {
        delete copy[`${to[0]}${from[1]}`];
    }
    copy[to] = moving;
    if ((moving === "WhiteKing" || moving === "BlackKing") && Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) === 2) {
        const rank = from[1];
        const kingSide = to[0] === "g";
        const rookFrom = `${kingSide ? "h" : "a"}${rank}`;
        const rookTo = `${kingSide ? "f" : "d"}${rank}`;
        copy[rookTo] = copy[rookFrom];
        delete copy[rookFrom];
    }
    return copy;
}

function isSquareAttacked(board, targetCoord, attackerColor) {
    const toF = FILES.indexOf(targetCoord[0]);
    const toR = parseInt(targetCoord[1], 10);

    for (const [fromCoord, piece] of Object.entries(board)) {
        if (!piece.startsWith(attackerColor)) continue;
        const fromF = FILES.indexOf(fromCoord[0]);
        const fromR = parseInt(fromCoord[1], 10);
        const df = toF - fromF;
        const dr = toR - fromR;
        if (df === 0 && dr === 0) continue;

        if (piece.endsWith("Pawn")) {
            const dir = attackerColor === "White" ? 1 : -1;
            if (Math.abs(df) === 1 && dr === dir) return true;
        } else if (piece.endsWith("Knight")) {
            if ((Math.abs(df) === 2 && Math.abs(dr) === 1) || (Math.abs(df) === 1 && Math.abs(dr) === 2)) return true;
        } else if (piece.endsWith("Bishop")) {
            if (Math.abs(df) === Math.abs(dr) && isPathClear(board, fromF, fromR, toF, toR)) return true;
        } else if (piece.endsWith("Rook")) {
            if ((df === 0 || dr === 0) && isPathClear(board, fromF, fromR, toF, toR)) return true;
        } else if (piece.endsWith("Queen")) {
            if ((df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) && isPathClear(board, fromF, fromR, toF, toR)) return true;
        } else if (piece.endsWith("King")) {
            if (Math.abs(df) <= 1 && Math.abs(dr) <= 1) return true;
        }
    }
    return false;
}

function evaluatePseudoLegalMove(board, from, to, moves, lastMove) {
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