package software.ulpgc.chess;

import org.junit.jupiter.api.Test;
import software.ulpgc.chess.architecture.domain.Board;
import software.ulpgc.chess.architecture.domain.Piece;
import software.ulpgc.chess.architecture.domain.Square;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ChessEngineTest {
    @Test
    void should_place_32_pieces_on_initial_board() {
        Board board = Board.initial();
        assertEquals(32, board.pieces().size());
        assertEquals(Piece.WhiteKing, board.pieceAt("e1"));
        assertEquals(Piece.BlackKing, board.pieceAt("e8"));
    }

    @Test
    void should_move_piece_immutably_when_move_is_valid() {
        Board initial = Board.initial();
        Board next = initial.move(Square.at("e2"), Square.at("e4"));

        assertEquals(Piece.WhitePawn, initial.pieceAt("e2"));
        assertNull(initial.pieceAt("e4"));
        assertNull(next.pieceAt("e2"));
        assertEquals(Piece.WhitePawn, next.pieceAt("e4"));
    }

    @Test
    void should_reject_illegal_moves_and_blocked_paths() {
        Board initial = Board.initial();

        assertThrows(IllegalArgumentException.class, () -> initial.move(Square.at("e2"), Square.at("e5")));
        assertThrows(IllegalArgumentException.class, () -> initial.move(Square.at("a1"), Square.at("a3")));
        assertThrows(IllegalArgumentException.class, () -> initial.move(Square.at("e1"), Square.at("e2")));
    }

    @Test
    void should_promote_pawn_automatically_on_last_rank() {
        Board custom = new Board(Map.of(
                Square.at("e1"), Piece.WhiteKing,
                Square.at("e8"), Piece.BlackKing,
                Square.at("a7"), Piece.WhitePawn
        ));

        Board promoted = custom.move(Square.at("a7"), Square.at("a8"));
        assertEquals(Piece.WhiteQueen, promoted.pieceAt("a8"));
    }
}