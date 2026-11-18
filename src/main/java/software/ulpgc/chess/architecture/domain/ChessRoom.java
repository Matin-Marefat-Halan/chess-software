package software.ulpgc.chess.architecture.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public record ChessRoom(
        String roomId,
        String roomCode,
        String whitePlayer,
        String blackPlayer,
        Color currentTurn,
        RoomStatus status,
        String winner,
        Board board,
        List<Move> moves,
        String createdAt
) {
    public ChessRoom {
        moves = List.copyOf(moves);
    }

    public static ChessRoom create(String roomId, String roomCode, String whitePlayer) {
        if (whitePlayer == null || whitePlayer.isBlank()) {
            throw new IllegalArgumentException("White player name is required");
        }
        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer.trim(),
                null,
                Color.White,
                RoomStatus.WAITING,
                null,
                Board.initial(),
                List.of(),
                Instant.now().toString()
        );
    }

    public ChessRoom join(String player) {
        if (status != RoomStatus.WAITING) {
            throw new IllegalStateException("Room is not available to join");
        }
        if (player == null || player.isBlank()) {
            throw new IllegalArgumentException("Black player name is required");
        }
        if (whitePlayer.equalsIgnoreCase(player.trim())) {
            throw new IllegalArgumentException("Player name must be different from host");
        }
        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer,
                player.trim(),
                currentTurn,
                RoomStatus.PLAYING,
                null,
                board,
                moves,
                createdAt
        );
    }

    public ChessRoom applyMove(String player, String fromCoordinate, String toCoordinate) {
        if (status != RoomStatus.PLAYING) {
            throw new IllegalStateException("Game is not currently active");
        }
        if (player == null || !isPlayersTurn(player.trim())) {
            throw new IllegalStateException("It is not this player's turn");
        }

        Square from = Square.at(fromCoordinate);
        Square to = Square.at(toCoordinate);
        Piece moving = board.pieceAt(from);

        if (moving == null || moving.color() != currentTurn) {
            throw new IllegalArgumentException("No valid piece of your color at " + fromCoordinate);
        }

        Board updatedBoard = board.move(from, to);
        List<Move> updatedMoves = new ArrayList<>(moves);
        updatedMoves.add(new Move(
                moves.size() + 1,
                player.trim(),
                currentTurn,
                from.notation(),
                to.notation(),
                moving.name(),
                Instant.now().toString()
        ));

        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer,
                blackPlayer,
                currentTurn.opposite(),
                RoomStatus.PLAYING,
                null,
                updatedBoard,
                updatedMoves,
                createdAt
        );
    }

    public ChessRoom resign(String player) {
        if (status != RoomStatus.PLAYING) {
            throw new IllegalStateException("Only active games can be resigned");
        }
        String trimmed = player == null ? "" : player.trim();
        String gameWinner;
        if (trimmed.equalsIgnoreCase(whitePlayer)) {
            gameWinner = blackPlayer;
        } else if (trimmed.equalsIgnoreCase(blackPlayer)) {
            gameWinner = whitePlayer;
        } else {
            throw new IllegalArgumentException("Player does not belong to this room");
        }

        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer,
                blackPlayer,
                currentTurn,
                RoomStatus.FINISHED,
                gameWinner,
                board,
                moves,
                createdAt
        );
    }

    private boolean isPlayersTurn(String player) {
        return currentTurn == Color.White
                ? whitePlayer.equalsIgnoreCase(player)
                : blackPlayer != null && blackPlayer.equalsIgnoreCase(player);
    }
}