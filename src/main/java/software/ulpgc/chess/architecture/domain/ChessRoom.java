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
        String lastMoveTimestamp,
        boolean inCheck,
        String endReason,
        String rematchRoomId,
        String rematchRequestedBy
) {
    public static final String BOT_PLAYER_NAME = "ChessBot";
    public static final String DRAW_RESULT = "DRAW";

    public ChessRoom {
        moves = moves == null ? List.of() : List.copyOf(moves);
    }

    public static ChessRoom create(String roomId, String roomCode, String whitePlayer) {
        return create(roomId, roomCode, whitePlayer, 0, "White");
    }

    public static ChessRoom create(String roomId, String roomCode, String creatorPlayer, int timeLimitSeconds) {
        return create(roomId, roomCode, creatorPlayer, timeLimitSeconds, "White");
    }

    public static ChessRoom create(String roomId, String roomCode, String creatorPlayer, int timeLimitSeconds, String preferredColor) {
        if (creatorPlayer == null || creatorPlayer.isBlank()) {
            throw new IllegalArgumentException("El nombre del jugador es obligatorio");
        }
        int safeLimit = Math.max(0, timeLimitSeconds);
        long initialMs = safeLimit * 1000L;
        String now = Instant.now().toString();
        boolean playAsBlack = "Black".equalsIgnoreCase(preferredColor);
        return new ChessRoom(
                roomId,
                roomCode,
                playAsBlack ? null : creatorPlayer.trim(),
                playAsBlack ? creatorPlayer.trim() : null,
                Color.White,
                RoomStatus.WAITING,
                null,
                Board.initial(),
                List.of(),
                now,
                safeLimit,
                initialMs,
                initialMs,
                now,
                false,
                null,
                null,
                null
        );
    }

    public static ChessRoom createVsBot(String roomId, String roomCode, String humanPlayer, int timeLimitSeconds, String preferredColor) {
        ChessRoom waiting = create(roomId, roomCode, humanPlayer, timeLimitSeconds, preferredColor);
        return waiting.join(BOT_PLAYER_NAME);
    }

    public Color botColor() {
        if (BOT_PLAYER_NAME.equalsIgnoreCase(whitePlayer)) {
            return Color.White;
        }
        if (BOT_PLAYER_NAME.equalsIgnoreCase(blackPlayer)) {
            return Color.Black;
        }
        return null;
    }

    public boolean isBotGame() {
        return botColor() != null;
    }

    public ChessRoom join(String player) {
        if (status != RoomStatus.WAITING) {
            throw new IllegalStateException("La sala ya no está disponible para unirse");
        }
        if (player == null || player.isBlank()) {
            throw new IllegalArgumentException("El nombre del rival es obligatorio");
        }
        String trimmed = player.trim();
        String newWhite = whitePlayer;
        String newBlack = blackPlayer;

        if (newWhite == null) {
            if (newBlack != null && newBlack.equalsIgnoreCase(trimmed)) {
                throw new IllegalArgumentException("El nombre del rival debe ser distinto al del creador");
            }
            newWhite = trimmed;
        } else if (newBlack == null) {
            if (newWhite.equalsIgnoreCase(trimmed)) {
                throw new IllegalArgumentException("El nombre del rival debe ser distinto al del creador");
            }
            newBlack = trimmed;
        } else {
            throw new IllegalStateException("La sala ya está completa");
        }

        return new ChessRoom(
                roomId,
                roomCode,
                newWhite,
                newBlack,
                currentTurn,
                RoomStatus.PLAYING,
                null,
                board,
                moves,
                createdAt,
                timeLimitSeconds,
                whiteTimeRemainingMs,
                blackTimeRemainingMs,
                Instant.now().toString(),
                false,
                null,
                rematchRoomId,
                rematchRequestedBy
        );
    }

    public ChessRoom withRematch(String nextRematchRoomId, String requestedBy) {
        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer,
                blackPlayer,
                currentTurn,
                status,
                winner,
                board,
                moves,
                createdAt,
                timeLimitSeconds,
                whiteTimeRemainingMs,
                blackTimeRemainingMs,
                lastMoveTimestamp,
                inCheck,
                endReason,
                nextRematchRoomId,
                requestedBy
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
                        timeLimitSeconds, 0, blackTimeRemainingMs, lastMoveTimestamp,
                        inCheck, "TIMEOUT", rematchRoomId, rematchRequestedBy
                );
            }
        } else {
            long remaining = Math.max(0, blackTimeRemainingMs - elapsed);
            if (remaining == 0) {
                return new ChessRoom(
                        roomId, roomCode, whitePlayer, blackPlayer, currentTurn,
                        RoomStatus.FINISHED, whitePlayer, board, moves, createdAt,
                        timeLimitSeconds, whiteTimeRemainingMs, 0, lastMoveTimestamp,
                        inCheck, "TIMEOUT", rematchRoomId, rematchRequestedBy
                );
            }
        }
        return this;
    }

    public ChessRoom applyMove(String player, String fromCoordinate, String toCoordinate) {
        return applyMove(player, fromCoordinate, toCoordinate, null, null);
    }

    public ChessRoom applyMove(String player, String fromCoordinate, String toCoordinate, String promotion) {
        return applyMove(player, fromCoordinate, toCoordinate, promotion, null);
    }

    public ChessRoom applyBotMove(String fromCoordinate, String toCoordinate, String promotion, long botThinkingMs) {
        return applyMove(BOT_PLAYER_NAME, fromCoordinate, toCoordinate, promotion, botThinkingMs);
    }

    private ChessRoom applyMove(String player, String fromCoordinate, String toCoordinate, String promotion, Long overrideElapsedMs) {
        ChessRoom evaluated = evaluateClock();
        if (evaluated.status() == RoomStatus.FINISHED) {
            return evaluated;
        }
        if (status != RoomStatus.PLAYING) {
            throw new IllegalStateException("La partida no está activa");
        }
        if (player == null || !isPlayersTurn(player.trim())) {
            throw new IllegalStateException("No es el turno de este jugador");
        }

        Square from = Square.at(fromCoordinate);
        Square to = Square.at(toCoordinate);
        Piece moving = board.pieceAt(from);

        if (moving == null || moving.color() != currentTurn) {
            throw new IllegalArgumentException("No hay una pieza válida de tu color en " + fromCoordinate);
        }

        if (moving.isKing() && Math.abs(to.file().index() - from.file().index()) == 2) {
            validateCastlingRights(from, to);
        }

        Move previousMove = moves.isEmpty() ? null : moves.get(moves.size() - 1);
        Board updatedBoard = board.move(from, to, previousMove, promotion);
        String now = Instant.now().toString();
        long updatedWhiteMs = whiteTimeRemainingMs;
        long updatedBlackMs = blackTimeRemainingMs;

        if (timeLimitSeconds > 0 && lastMoveTimestamp != null) {
            long elapsed = overrideElapsedMs != null
                    ? Math.max(0, overrideElapsedMs)
                    : Math.max(0, Duration.between(Instant.parse(lastMoveTimestamp), Instant.parse(now)).toMillis());
            if (currentTurn == Color.White) {
                updatedWhiteMs = Math.max(0, whiteTimeRemainingMs - elapsed);
            } else {
                updatedBlackMs = Math.max(0, blackTimeRemainingMs - elapsed);
            }
        }

        Piece resultingPiece = updatedBoard.pieceAt(to);
        List<Move> updatedMoves = new ArrayList<>(moves);
        Move recordedMove = new Move(
                moves.size() + 1,
                player.trim(),
                currentTurn,
                from.notation(),
                to.notation(),
                resultingPiece != null ? resultingPiece.name() : moving.name(),
                now
        );
        updatedMoves.add(recordedMove);

        Color nextTurn = currentTurn.opposite();
        MovementValidator validator = new MovementValidator();
        boolean nextInCheck = validator.isKingInCheck(updatedBoard, nextTurn);
        boolean nextHasLegalMoves = validator.hasAnyLegalMove(updatedBoard, nextTurn, recordedMove);

        RoomStatus nextStatus = RoomStatus.PLAYING;
        String nextWinner = null;
        String nextEndReason = null;

        if (!nextHasLegalMoves) {
            nextStatus = RoomStatus.FINISHED;
            if (nextInCheck) {
                nextWinner = currentTurn == Color.White ? whitePlayer : blackPlayer;
                nextEndReason = "CHECKMATE";
            } else {
                nextWinner = DRAW_RESULT;
                nextEndReason = "STALEMATE";
            }
        } else if (validator.hasInsufficientMaterial(updatedBoard)) {
            nextStatus = RoomStatus.FINISHED;
            nextWinner = DRAW_RESULT;
            nextEndReason = "INSUFFICIENT_MATERIAL";
        }

        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer,
                blackPlayer,
                nextTurn,
                nextStatus,
                nextWinner,
                updatedBoard,
                updatedMoves,
                createdAt,
                timeLimitSeconds,
                updatedWhiteMs,
                updatedBlackMs,
                now,
                nextInCheck,
                nextEndReason,
                rematchRoomId,
                rematchRequestedBy
        );
    }

    private void validateCastlingRights(Square kingFrom, Square kingTo) {
        boolean kingSide = kingTo.file() == File.G;
        Square rookFrom = new Square(kingSide ? File.H : File.A, kingFrom.rank());
        boolean kingMoved = moves.stream().anyMatch(m -> m.from().equalsIgnoreCase(kingFrom.notation()));
        boolean rookMoved = moves.stream().anyMatch(m -> m.from().equalsIgnoreCase(rookFrom.notation()));
        if (kingMoved || rookMoved) {
            throw new IllegalArgumentException("El enroque ya no está disponible");
        }
    }

    public ChessRoom resign(String player) {
        if (status != RoomStatus.PLAYING) {
            throw new IllegalStateException("Solo se pueden abandonar partidas activas");
        }
        String trimmed = player == null ? "" : player.trim();
        String gameWinner;
        if (whitePlayer != null && trimmed.equalsIgnoreCase(whitePlayer)) {
            gameWinner = blackPlayer;
        } else if (blackPlayer != null && trimmed.equalsIgnoreCase(blackPlayer)) {
            gameWinner = whitePlayer;
        } else {
            throw new IllegalArgumentException("El jugador no pertenece a esta sala");
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
                Instant.now().toString(),
                inCheck,
                "RESIGNATION",
                rematchRoomId,
                rematchRequestedBy
        );
    }

    public ChessRoom agreeDraw(String player) {
        if (status != RoomStatus.PLAYING) {
            throw new IllegalStateException("Solo se pueden acordar tablas en partidas activas");
        }
        String trimmed = player == null ? "" : player.trim();
        boolean isWhite = whitePlayer != null && trimmed.equalsIgnoreCase(whitePlayer);
        boolean isBlack = blackPlayer != null && trimmed.equalsIgnoreCase(blackPlayer);
        if (!isWhite && !isBlack) {
            throw new IllegalArgumentException("El jugador no pertenece a esta sala");
        }

        return new ChessRoom(
                roomId,
                roomCode,
                whitePlayer,
                blackPlayer,
                currentTurn,
                RoomStatus.FINISHED,
                DRAW_RESULT,
                board,
                moves,
                createdAt,
                timeLimitSeconds,
                whiteTimeRemainingMs,
                blackTimeRemainingMs,
                Instant.now().toString(),
                inCheck,
                "DRAW_AGREED",
                rematchRoomId,
                rematchRequestedBy
        );
    }

    private boolean isPlayersTurn(String player) {
        return currentTurn == Color.White
                ? whitePlayer != null && whitePlayer.equalsIgnoreCase(player)
                : blackPlayer != null && blackPlayer.equalsIgnoreCase(player);
    }
}