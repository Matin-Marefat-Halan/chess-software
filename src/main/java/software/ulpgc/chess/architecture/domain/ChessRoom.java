package software.ulpgc.chess.architecture.domain;

import java.time.Duration;
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
        String createdAt,
        int timeLimitSeconds,
        long whiteTimeRemainingMs,
        long blackTimeRemainingMs,
        String lastMoveTimestamp
) {
    public static final String BOT_PLAYER_NAME = "ChessBot";

    public ChessRoom {
        moves = List.copyOf(moves);
    }

    public static ChessRoom create(String roomId, String roomCode, String whitePlayer) {
        return create(roomId, roomCode, whitePlayer, 0);
    }

    public static ChessRoom create(String roomId, String roomCode, String whitePlayer, int timeLimitSeconds) {
        if (whitePlayer == null || whitePlayer.isBlank()) {
            throw new IllegalArgumentException("White player name is required");
        }
        int safeLimit = Math.max(0, timeLimitSeconds);
        long initialMs = safeLimit * 1000L;
        String now = Instant.now().toString();
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
                now,
                safeLimit,
                initialMs,
                initialMs,
                now
        );
    }

    public static ChessRoom createVsBot(String roomId, String roomCode, String whitePlayer, int timeLimitSeconds) {
        ChessRoom waiting = create(roomId, roomCode, whitePlayer, timeLimitSeconds);
        return waiting.join(BOT_PLAYER_NAME);
    }

    public boolean isBotGame() {
        return BOT_PLAYER_NAME.equalsIgnoreCase(blackPlayer);
    }

    public ChessRoom join(String player) {
        if (status != RoomStatus.WAITING) {
            throw new IllegalStateException("Room is not available to join");
        }
        if (player == null || player.isBlank()) {
            throw new IllegalArgumentException("Black player name is required");
        }
        if (whitePlayer.equalsIgnoreCase(player.trim())) {
            throw new IllegalArgumentException("El nombre del rival debe ser distinto al del creador");
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
                createdAt,
                timeLimitSeconds,
                whiteTimeRemainingMs,
                blackTimeRemainingMs,
                Instant.now().toString()
        );
    }

    public ChessRoom evaluateClock() {
        if (status != RoomStatus.PLAYING || timeLimitSeconds <= 0 || lastMoveTimestamp == null) {
            return this;
        }
        long elapsed = Math.max(0, Duration.between(Instant.parse(lastMoveTimestamp), Instant.now()).toMillis());
        if (currentTurn == Color.White) {
            long remaining = Math.max(0, whiteTimeRemainingMs - elapsed);
            if (remaining == 0) {
                return new ChessRoom(
                        roomId, roomCode, whitePlayer, blackPlayer, currentTurn,
                        RoomStatus.FINISHED, blackPlayer, board, moves, createdAt,
                        timeLimitSeconds, 0, blackTimeRemainingMs, lastMoveTimestamp
                );
            }
        } else {
            long remaining = Math.max(0, blackTimeRemainingMs - elapsed);
            if (remaining == 0) {
                return new ChessRoom(
                        roomId, roomCode, whitePlayer, blackPlayer, currentTurn,
                        RoomStatus.FINISHED, whitePlayer, board, moves, createdAt,
                        timeLimitSeconds, whiteTimeRemainingMs, 0, lastMoveTimestamp
                );
            }
        }
        return this;
    }

    public ChessRoom applyMove(String player, String fromCoordinate, String toCoordinate) {
        ChessRoom evaluated = evaluateClock();
        if (evaluated.status() == RoomStatus.FINISHED) {
            return evaluated;
        }
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

        if (moving.isKing() && Math.abs(to.file().index() - from.file().index()) == 2) {
            validateCastlingRights(from, to);
        }

        Move previousMove = moves.isEmpty() ? null : moves.get(moves.size() - 1);
        Board updatedBoard = board.move(from, to, previousMove);
        String now = Instant.now().toString();
        long updatedWhiteMs = whiteTimeRemainingMs;
        long updatedBlackMs = blackTimeRemainingMs;

        if (timeLimitSeconds > 0 && lastMoveTimestamp != null) {
            long elapsed = Math.max(0, Duration.between(Instant.parse(lastMoveTimestamp), Instant.parse(now)).toMillis());
            if (currentTurn == Color.White) {
                updatedWhiteMs = Math.max(0, whiteTimeRemainingMs - elapsed);
            } else {
                updatedBlackMs = Math.max(0, blackTimeRemainingMs - elapsed);
            }
        }

        List<Move> updatedMoves = new ArrayList<>(moves);
        updatedMoves.add(new Move(
                moves.size() + 1,
                player.trim(),
                currentTurn,
                from.notation(),
                to.notation(),
                moving.name(),
                now
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
                createdAt,
                timeLimitSeconds,
                updatedWhiteMs,
                updatedBlackMs,
                now
        );
    }

    private void validateCastlingRights(Square kingFrom, Square kingTo) {
        boolean kingSide = kingTo.file() == File.G;
        Square rookFrom = new Square(kingSide ? File.H : File.A, kingFrom.rank());
        boolean kingMoved = moves.stream().anyMatch(m -> m.from().equalsIgnoreCase(kingFrom.notation()));
        boolean rookMoved = moves.stream().anyMatch(m -> m.from().equalsIgnoreCase(rookFrom.notation()));
        if (kingMoved || rookMoved) {
            throw new IllegalArgumentException("Castling is no longer available");
        }
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
                createdAt,
                timeLimitSeconds,
                whiteTimeRemainingMs,
                blackTimeRemainingMs,
                Instant.now().toString()
        );
    }

    private boolean isPlayersTurn(String player) {
        return currentTurn == Color.White
                ? whitePlayer.equalsIgnoreCase(player)
                : blackPlayer != null && blackPlayer.equalsIgnoreCase(player);
    }
}