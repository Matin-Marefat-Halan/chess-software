package software.ulpgc.chess.architecture.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class MovementValidator {
    public boolean isValidMove(Board board, Square from, Square to) {
        return isValidMove(board, from, to, null);
    }

    public boolean isValidMove(Board board, Square from, Square to, Move lastMove) {
        if (!isPseudoLegalMove(board, from, to, lastMove)) {
            return false;
        }
        Piece moving = board.pieceAt(from);
        if (moving.isKing() && Math.abs(to.file().index() - from.file().index()) == 2) {
            if (isKingInCheck(board, moving.color())) {
                return false;
            }
            int stepFile = Integer.compare(to.file().index(), from.file().index());
            Square passingSquare = new Square(File.values()[from.file().index() + stepFile], from.rank());
            if (isSquareAttacked(board, passingSquare, moving.color().opposite())
                    || isSquareAttacked(board, to, moving.color().opposite())) {
                return false;
            }
        }
        Board simulated = board.applyUnchecked(from, to, lastMove, null);
        return !isKingInCheck(simulated, moving.color());
    }

    public boolean isKingInCheck(Board board, Color kingColor) {
        Piece kingPiece = kingColor == Color.White ? Piece.WhiteKing : Piece.BlackKing;
        Square kingSquare = null;
        for (Map.Entry<Square, Piece> entry : board.pieces().entrySet()) {
            if (entry.getValue() == kingPiece) {
                kingSquare = entry.getKey();
                break;
            }
        }
        if (kingSquare == null) {
            return false;
        }
        return isSquareAttacked(board, kingSquare, kingColor.opposite());
    }

    public boolean isSquareAttacked(Board board, Square target, Color attackerColor) {
        for (Map.Entry<Square, Piece> entry : board.pieces().entrySet()) {
            Square from = entry.getKey();
            Piece piece = entry.getValue();
            if (piece.color() != attackerColor) {
                continue;
            }
            int df = target.file().index() - from.file().index();
            int dr = target.rank().index() - from.rank().index();
            if (df == 0 && dr == 0) {
                continue;
            }
            if (piece.isPawn()) {
                int direction = attackerColor == Color.White ? 1 : -1;
                if (Math.abs(df) == 1 && dr == direction) {
                    return true;
                }
            } else if (piece.isKnight()) {
                if ((Math.abs(df) == 2 && Math.abs(dr) == 1) || (Math.abs(df) == 1 && Math.abs(dr) == 2)) {
                    return true;
                }
            } else if (piece.isBishop()) {
                if (Math.abs(df) == Math.abs(dr) && isPathClear(board, from, target)) {
                    return true;
                }
            } else if (piece.isRook()) {
                if ((df == 0 || dr == 0) && isPathClear(board, from, target)) {
                    return true;
                }
            } else if (piece.isQueen()) {
                if ((df == 0 || dr == 0 || Math.abs(df) == Math.abs(dr)) && isPathClear(board, from, target)) {
                    return true;
                }
            } else if (piece.isKing()) {
                if (Math.abs(df) <= 1 && Math.abs(dr) <= 1) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean hasAnyLegalMove(Board board, Color color, Move lastMove) {
        for (Map.Entry<Square, Piece> entry : board.pieces().entrySet()) {
            if (entry.getValue().color() != color) {
                continue;
            }
            Square from = entry.getKey();
            for (File file : File.values()) {
                for (Rank rank : Rank.values()) {
                    Square to = new Square(file, rank);
                    if (isValidMove(board, from, to, lastMove)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public boolean hasInsufficientMaterial(Board board) {
        List<Piece> minorOrMajor = new ArrayList<>();
        for (Piece piece : board.pieces().values()) {
            if (!piece.isKing()) {
                minorOrMajor.add(piece);
            }
        }
        if (minorOrMajor.isEmpty()) {
            return true;
        }
        if (minorOrMajor.size() == 1) {
            Piece only = minorOrMajor.get(0);
            return only.isBishop() || only.isKnight();
        }
        return false;
    }

    public boolean isPseudoLegalMove(Board board, Square from, Square to, Move lastMove) {
        if (from == null || to == null || from.equals(to)) {
            return false;
        }
        Piece moving = board.pieceAt(from);
        if (moving == null) {
            return false;
        }
        Piece target = board.pieceAt(to);
        if (target != null && (target.color() == moving.color() || target.isKing())) {
            return false;
        }

        int df = to.file().index() - from.file().index();
        int dr = to.rank().index() - from.rank().index();

        if (moving.isPawn()) {
            return isValidPawnMove(board, moving.color(), from, to, df, dr, target, lastMove);
        }
        if (moving.isRook()) {
            return (df == 0 || dr == 0) && isPathClear(board, from, to);
        }
        if (moving.isBishop()) {
            return Math.abs(df) == Math.abs(dr) && isPathClear(board, from, to);
        }
        if (moving.isQueen()) {
            return (df == 0 || dr == 0 || Math.abs(df) == Math.abs(dr)) && isPathClear(board, from, to);
        }
        if (moving.isKnight()) {
            return (Math.abs(df) == 2 && Math.abs(dr) == 1) || (Math.abs(df) == 1 && Math.abs(dr) == 2);
        }
        if (moving.isKing()) {
            if (Math.abs(df) <= 1 && Math.abs(dr) <= 1) {
                return true;
            }
            return isValidCastlingGeometry(board, moving.color(), from, df, dr);
        }
        return false;
    }

    private boolean isValidCastlingGeometry(Board board, Color color, Square from, int df, int dr) {
        if (dr != 0 || Math.abs(df) != 2 || from.file() != File.E) {
            return false;
        }
        Rank expectedRank = color == Color.White ? Rank.R1 : Rank.R8;
        if (from.rank() != expectedRank) {
            return false;
        }
        File rookFile = df == 2 ? File.H : File.A;
        Square rookSquare = new Square(rookFile, expectedRank);
        Piece rook = board.pieceAt(rookSquare);
        if (rook == null || !rook.isRook() || rook.color() != color) {
            return false;
        }
        return isPathClear(board, from, rookSquare);
    }

    private boolean isValidPawnMove(Board board, Color color, Square from, Square to, int df, int dr, Piece target, Move lastMove) {
        int direction = color == Color.White ? 1 : -1;
        Rank startRank = color == Color.White ? Rank.R2 : Rank.R7;

        if (df == 0 && target == null) {
            if (dr == direction) {
                return true;
            }
            if (dr == 2 * direction && from.rank() == startRank) {
                Square middle = new Square(from.file(), Rank.values()[from.rank().index() + direction]);
                return board.pieceAt(middle) == null;
            }
        }
        if (Math.abs(df) == 1 && dr == direction && target != null) {
            return true;
        }
        if (Math.abs(df) == 1 && dr == direction && target == null && lastMove != null) {
            Square lastFrom = Square.at(lastMove.from());
            Square lastTo = Square.at(lastMove.to());
            Piece lastPiece = Piece.valueOf(lastMove.piece());
            Rank enPassantRank = color == Color.White ? Rank.R5 : Rank.R4;
            return from.rank() == enPassantRank
                    && lastPiece.isPawn()
                    && lastPiece.color() != color
                    && Math.abs(lastTo.rank().index() - lastFrom.rank().index()) == 2
                    && lastTo.file() == to.file()
                    && lastTo.rank() == from.rank();
        }
        return false;
    }

    private boolean isPathClear(Board board, Square from, Square to) {
        int stepFile = Integer.compare(to.file().index(), from.file().index());
        int stepRank = Integer.compare(to.rank().index(), from.rank().index());

        int currentFile = from.file().index() + stepFile;
        int currentRank = from.rank().index() + stepRank;

        while (currentFile != to.file().index() || currentRank != to.rank().index()) {
            Square intermediate = new Square(File.values()[currentFile], Rank.values()[currentRank]);
            if (board.pieceAt(intermediate) != null) {
                return false;
            }
            currentFile += stepFile;
            currentRank += stepRank;
        }
        return true;
    }
}