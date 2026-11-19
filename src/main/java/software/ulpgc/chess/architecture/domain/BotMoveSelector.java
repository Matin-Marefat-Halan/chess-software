package software.ulpgc.chess.architecture.domain;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class BotMoveSelector {
    private final MovementValidator validator = new MovementValidator();
    private final SecureRandom random = new SecureRandom();

    public record SelectedMove(Square from, Square to, String promotion, long thinkingMs) {}

    public Optional<SelectedMove> chooseMove(Board board, Color botColor, Move lastMove) {
        List<MoveCandidate> legalMoves = generateLegalMoves(board, botColor, lastMove);
        if (legalMoves.isEmpty()) {
            return Optional.empty();
        }

        int bestScore = Integer.MIN_VALUE;
        List<MoveCandidate> bestCandidates = new ArrayList<>();

        for (MoveCandidate candidate : legalMoves) {
            Board nextBoard = board.applyUnchecked(candidate.from, candidate.to, lastMove, candidate.promotion);
            Move simulatedMove = new Move(1, "Bot", botColor, candidate.from.notation(), candidate.to.notation(),
                    board.pieceAt(candidate.from).name(), "");
            int score = -minimax(nextBoard, 1, Integer.MIN_VALUE + 1, Integer.MAX_VALUE - 1, botColor.opposite(), simulatedMove);

            if (score > bestScore) {
                bestScore = score;
                bestCandidates.clear();
                bestCandidates.add(candidate);
            } else if (score == bestScore) {
                bestCandidates.add(candidate);
            }
        }

        MoveCandidate chosen = bestCandidates.get(random.nextInt(bestCandidates.size()));
        long thinkingMs = 1400L + random.nextInt(1800);
        return Optional.of(new SelectedMove(chosen.from, chosen.to, chosen.promotion, thinkingMs));
    }

    private int minimax(Board board, int depth, int alpha, int beta, Color sideToMove, Move lastMove) {
        List<MoveCandidate> moves = generateLegalMoves(board, sideToMove, lastMove);
        if (moves.isEmpty()) {
            if (validator.isKingInCheck(board, sideToMove)) {
                return -100000 - depth * 100;
            }
            return 0;
        }
        if (depth == 0) {
            return evaluateBoard(board, sideToMove);
        }

        int best = Integer.MIN_VALUE + 1;
        for (MoveCandidate candidate : moves) {
            Board nextBoard = board.applyUnchecked(candidate.from, candidate.to, lastMove, candidate.promotion);
            Move simulatedMove = new Move(1, "Sim", sideToMove, candidate.from.notation(), candidate.to.notation(),
                    board.pieceAt(candidate.from).name(), "");
            int score = -minimax(nextBoard, depth - 1, -beta, -alpha, sideToMove.opposite(), simulatedMove);
            best = Math.max(best, score);
            alpha = Math.max(alpha, score);
            if (alpha >= beta) {
                break;
            }
        }
        return best;
    }

    private List<MoveCandidate> generateLegalMoves(Board board, Color color, Move lastMove) {
        List<MoveCandidate> result = new ArrayList<>();
        for (Map.Entry<Square, Piece> entry : board.pieces().entrySet()) {
            Piece piece = entry.getValue();
            if (piece.color() != color) {
                continue;
            }
            Square from = entry.getKey();
            for (File file : File.values()) {
                for (Rank rank : Rank.values()) {
                    Square to = new Square(file, rank);
                    if (validator.isValidMove(board, from, to, lastMove)) {
                        boolean isPromotion = piece.isPawn() && (rank == Rank.R8 || rank == Rank.R1);
                        result.add(new MoveCandidate(from, to, isPromotion ? "Queen" : null));
                    }
                }
            }
        }
        return result;
    }

    private int evaluateBoard(Board board, Color perspective) {
        int score = 0;
        for (Map.Entry<Square, Piece> entry : board.pieces().entrySet()) {
            Square sq = entry.getKey();
            Piece piece = entry.getValue();
            int value = pieceBaseValue(piece) + positionalBonus(piece, sq);
            score += piece.color() == perspective ? value : -value;
        }
        return score;
    }

    private int pieceBaseValue(Piece piece) {
        if (piece.isPawn()) return 100;
        if (piece.isKnight()) return 320;
        if (piece.isBishop()) return 330;
        if (piece.isRook()) return 500;
        if (piece.isQueen()) return 900;
        return 20000;
    }

    private int positionalBonus(Piece piece, Square sq) {
        int fileDistFromCenter = Math.min(Math.abs(sq.file().index() - 3), Math.abs(sq.file().index() - 4));
        int rankDistFromCenter = Math.min(Math.abs(sq.rank().index() - 3), Math.abs(sq.rank().index() - 4));
        int centerBonus = (3 - fileDistFromCenter) + (3 - rankDistFromCenter);
        if (piece.isPawn()) {
            int advancement = piece.color() == Color.White ? sq.rank().index() : (7 - sq.rank().index());
            return advancement * 10 + (centerBonus * 3);
        }
        if (piece.isKnight() || piece.isBishop()) {
            return centerBonus * 8;
        }
        return 0;
    }

    private record MoveCandidate(Square from, Square to, String promotion) {}
}