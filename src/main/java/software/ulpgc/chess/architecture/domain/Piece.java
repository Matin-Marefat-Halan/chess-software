package software.ulpgc.chess.architecture.domain;

import static software.ulpgc.chess.architecture.domain.Color.Black;
import static software.ulpgc.chess.architecture.domain.Color.White;

public enum Piece {
    WhitePawn,
    WhiteRook,
    WhiteKnight,
    WhiteBishop,
    WhiteKing,
    WhiteQueen,
    BlackPawn,
    BlackRook,
    BlackKnight,
    BlackBishop,
    BlackKing,
    BlackQueen;

    public Color color() {
        return isWhite() ? White : Black;
    }

    public boolean isPawn() {
        return this == WhitePawn || this == BlackPawn;
    }

    public boolean isRook() {
        return this == WhiteRook || this == BlackRook;
    }

    public boolean isKnight() {
        return this == WhiteKnight || this == BlackKnight;
    }

    public boolean isBishop() {
        return this == WhiteBishop || this == BlackBishop;
    }

    public boolean isKing() {
        return this == WhiteKing || this == BlackKing;
    }

    public boolean isQueen() {
        return this == WhiteQueen || this == BlackQueen;
    }

    private boolean isWhite() {
        return this == WhitePawn ||
                this == WhiteRook ||
                this == WhiteKnight ||
                this == WhiteBishop ||
                this == WhiteKing ||
                this == WhiteQueen;
    }
}