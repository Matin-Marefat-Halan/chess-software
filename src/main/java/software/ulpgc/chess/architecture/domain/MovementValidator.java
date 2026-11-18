package software.ulpgc.chess.architecture.domain;

public class MovementValidator {
    public boolean isValidMove(Board board, Square from, Square to) {
        return isValidMove(board, from, to, null);
    }

    public boolean isValidMove(Board board, Square from, Square to, Move lastMove) {
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
            return isValidCastling(board, moving.color(), from, df, dr);
        }
        return false;
    }

    private boolean isValidCastling(Board board, Color color, Square from, int df, int dr) {
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