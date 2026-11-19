package software.ulpgc.chess;

import org.junit.jupiter.api.Test;
import software.ulpgc.chess.architecture.domain.*;

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
    void should_reject_illegal_moves_and_moves_leaving_king_in_check() {
        Board initial = Board.initial();
        assertThrows(IllegalArgumentException.class, () -> initial.move(Square.at("e2"), Square.at("e5")));
        assertThrows(IllegalArgumentException.class, () -> initial.move(Square.at("a1"), Square.at("a3")));

        Board pinnedBoard = new Board(Map.of(
                Square.at("e1"), Piece.WhiteKing,
                Square.at("e2"), Piece.WhiteRook,
                Square.at("e8"), Piece.BlackRook,
                Square.at("a8"), Piece.BlackKing
        ));
        assertThrows(IllegalArgumentException.class, () -> pinnedBoard.move(Square.at("e2"), Square.at("d2")));
    }

    @Test
    void should_detect_checkmate_and_stalemate() {
        ChessRoom room = ChessRoom.create("r1", "MATE01", "Matin").join("Rival");
        room = room.applyMove("Matin", "f2", "f3");
        room = room.applyMove("Rival", "e7", "e5");
        room = room.applyMove("Matin", "g2", "g4");
        room = room.applyMove("Rival", "d8", "h4");

        assertEquals(RoomStatus.FINISHED, room.status());
        assertEquals("Rival", room.winner());
        assertEquals("CHECKMATE", room.endReason());
        assertTrue(room.inCheck());
    }

    @Test
    void should_promote_pawn_to_chosen_piece() {
        Board custom = new Board(Map.of(
                Square.at("e1"), Piece.WhiteKing,
                Square.at("e8"), Piece.BlackKing,
                Square.at("a7"), Piece.WhitePawn
        ));

        Board promoted = custom.move(Square.at("a7"), Square.at("a8"), null, "Knight");
        assertEquals(Piece.WhiteKnight, promoted.pieceAt("a8"));
    }
}