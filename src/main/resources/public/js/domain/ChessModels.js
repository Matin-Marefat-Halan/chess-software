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
        delete board[move.from];
        if (piece === "WhitePawn" && move.to.endsWith("8")) {
            board[move.to] = "WhiteQueen";
        } else if (piece === "BlackPawn" && move.to.endsWith("1")) {
            board[move.to] = "BlackQueen";
        } else {
            board[move.to] = piece;
        }
    }
    return board;
}