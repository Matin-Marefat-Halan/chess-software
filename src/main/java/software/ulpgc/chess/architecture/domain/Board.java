package software.ulpgc.chess.architecture.domain;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import static software.ulpgc.chess.architecture.domain.Piece.*;
import static software.ulpgc.chess.architecture.domain.Square.at;

public final class Board {
    private final Map<Square, Piece> pieces;

    public Board(Map<Square, Piece> pieces) {
        this.pieces = Map.copyOf(pieces);
    }

    public static Board initial() {
        return new Board(initialMap());
    }

    public Board move(Square from, Square to) {
        return move(from, to, null);
    }

    public Board move(Square from, Square to, Move lastMove) {
        MovementValidator validator = new MovementValidator();
        if (!validator.isValidMove(this, from, to, lastMove)) {
            throw new IllegalArgumentException("Invalid move from " + from.notation() + " to " + to.notation());
        }
        Piece moving = pieceAt(from);
        Piece targetBeforeMove = pieceAt(to);
        Map<Square, Piece> updated = new HashMap<>(pieces);
        updated.remove(from);
        updated.put(to, promoteIfEligible(moving, to));

        if (moving.isPawn() && from.file() != to.file() && targetBeforeMove == null) {
            Square capturedPawnSquare = new Square(to.file(), from.rank());
            updated.remove(capturedPawnSquare);
        }

        if (moving.isKing() && Math.abs(to.file().index() - from.file().index()) == 2) {
            boolean kingSide = to.file() == File.G;
            Square rookFrom = new Square(kingSide ? File.H : File.A, from.rank());
            Square rookTo = new Square(kingSide ? File.F : File.D, from.rank());
            Piece rook = updated.remove(rookFrom);
            if (rook != null) {
                updated.put(rookTo, rook);
            }
        }

        return new Board(updated);
    }

    private Piece promoteIfEligible(Piece piece, Square destination) {
        if (piece == WhitePawn && destination.rank() == Rank.R8) {
            return WhiteQueen;
        }
        if (piece == BlackPawn && destination.rank() == Rank.R1) {
            return BlackQueen;
        }
        return piece;
    }

    public Piece pieceAt(File file, Rank rank) {
        return pieceAt(new Square(file, rank));
    }

    public Piece pieceAt(String square) {
        return pieceAt(at(square));
    }

    public Piece pieceAt(Square square) {
        return pieces.get(square);
    }

    public Map<Square, Piece> pieces() {
        return pieces;
    }

    private static Map<Square, Piece> initialMap() {
        return Map.ofEntries(
                Map.entry(at("a1"), WhiteRook),
                Map.entry(at("b1"), WhiteKnight),
                Map.entry(at("c1"), WhiteBishop),
                Map.entry(at("d1"), WhiteQueen),
                Map.entry(at("e1"), WhiteKing),
                Map.entry(at("f1"), WhiteBishop),
                Map.entry(at("g1"), WhiteKnight),
                Map.entry(at("h1"), WhiteRook),
                Map.entry(at("a2"), WhitePawn),
                Map.entry(at("b2"), WhitePawn),
                Map.entry(at("c2"), WhitePawn),
                Map.entry(at("d2"), WhitePawn),
                Map.entry(at("e2"), WhitePawn),
                Map.entry(at("f2"), WhitePawn),
                Map.entry(at("g2"), WhitePawn),
                Map.entry(at("h2"), WhitePawn),
                Map.entry(at("a7"), BlackPawn),
                Map.entry(at("b7"), BlackPawn),
                Map.entry(at("c7"), BlackPawn),
                Map.entry(at("d7"), BlackPawn),
                Map.entry(at("e7"), BlackPawn),
                Map.entry(at("f7"), BlackPawn),
                Map.entry(at("g7"), BlackPawn),
                Map.entry(at("h7"), BlackPawn),
                Map.entry(at("a8"), BlackRook),
                Map.entry(at("b8"), BlackKnight),
                Map.entry(at("c8"), BlackBishop),
                Map.entry(at("d8"), BlackQueen),
                Map.entry(at("e8"), BlackKing),
                Map.entry(at("f8"), BlackBishop),
                Map.entry(at("g8"), BlackKnight),
                Map.entry(at("h8"), BlackRook)
        );
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == this) return true;
        if (obj == null || obj.getClass() != this.getClass()) return false;
        Board that = (Board) obj;
        return Objects.equals(this.pieces, that.pieces);
    }

    @Override
    public int hashCode() {
        return Objects.hash(pieces);
    }

    @Override
    public String toString() {
        return "Board[pieces=" + pieces + ']';
    }
}