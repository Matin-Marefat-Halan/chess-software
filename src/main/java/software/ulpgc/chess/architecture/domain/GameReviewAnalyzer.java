package software.ulpgc.chess.architecture.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class GameReviewAnalyzer {
    private final BotMoveSelector selector = new BotMoveSelector();

    public GameReview analyze(ChessRoom room) {
        Board board = Board.initial();
        Move previousMove = null;
        List<GameReview.MoveReview> moveReviews = new ArrayList<>();

        int wExcellent = 0, wGood = 0, wInaccuracy = 0, wMistake = 0, wBlunder = 0;
        int bExcellent = 0, bGood = 0, bInaccuracy = 0, bMistake = 0, bBlunder = 0;
        double wScoreSum = 0.0;
        double bScoreSum = 0.0;
        int wCount = 0;
        int bCount = 0;

        for (Move move : room.moves()) {
            Square from = Square.at(move.from());
            Square to = Square.at(move.to());
            Color side = move.color();
            String promotion = extractPromotion(board.pieceAt(from), move.piece(), to);

            Optional<BotMoveSelector.EvaluatedMove> bestOpt = selector.findBestMove(board, side, previousMove);
            int playedScore = selector.evaluateSpecificMove(board, side, from, to, promotion, previousMove);
            int bestScore = bestOpt.map(BotMoveSelector.EvaluatedMove::score).orElse(playedScore);
            String bestNotation = bestOpt
                    .map(b -> b.from().notation() + " → " + b.to().notation())
                    .orElse(from.notation() + " → " + to.notation());

            boolean isSameBestMove = bestOpt
                    .map(b -> b.from().equals(from) && b.to().equals(to))
                    .orElse(true);

            int loss = (isSameBestMove || playedScore >= 90000) ? 0 : Math.max(0, bestScore - playedScore);
            ClassificationResult result = classifyLoss(loss);

            if (side == Color.White) {
                wCount++;
                wScoreSum += result.accuracy;
                switch (result.code) {
                    case "EXCELLENT" -> wExcellent++;
                    case "GOOD" -> wGood++;
                    case "INACCURACY" -> wInaccuracy++;
                    case "MISTAKE" -> wMistake++;
                    case "BLUNDER" -> wBlunder++;
                }
            } else {
                bCount++;
                bScoreSum += result.accuracy;
                switch (result.code) {
                    case "EXCELLENT" -> bExcellent++;
                    case "GOOD" -> bGood++;
                    case "INACCURACY" -> bInaccuracy++;
                    case "MISTAKE" -> bMistake++;
                    case "BLUNDER" -> bBlunder++;
                }
            }

            moveReviews.add(new GameReview.MoveReview(
                    move.moveNumber(),
                    move.player(),
                    side,
                    move.from(),
                    move.to(),
                    move.piece(),
                    result.code,
                    result.badge,
                    bestNotation,
                    loss
            ));

            board = board.applyUnchecked(from, to, previousMove, promotion);
            previousMove = move;
        }

        double whiteAccuracy = wCount == 0 ? 100.0 : Math.round((wScoreSum / wCount) * 10.0) / 10.0;
        double blackAccuracy = bCount == 0 ? 100.0 : Math.round((bScoreSum / bCount) * 10.0) / 10.0;

        return new GameReview(
                room.roomId(),
                whiteAccuracy,
                blackAccuracy,
                new GameReview.PlayerSummary(wExcellent, wGood, wInaccuracy, wMistake, wBlunder),
                new GameReview.PlayerSummary(bExcellent, bGood, bInaccuracy, bMistake, bBlunder),
                moveReviews
        );
    }

    private String extractPromotion(Piece before, String resultingPieceName, Square destination) {
        if (before == null || !before.isPawn()) {
            return null;
        }
        if (destination.rank() != Rank.R8 && destination.rank() != Rank.R1) {
            return null;
        }
        if (resultingPieceName != null && resultingPieceName.length() > 5) {
            return resultingPieceName.substring(5);
        }
        return "Queen";
    }

    private ClassificationResult classifyLoss(int loss) {
        if (loss <= 25) {
            return new ClassificationResult("EXCELLENT", "!", 100.0);
        }
        if (loss <= 75) {
            return new ClassificationResult("GOOD", "✓", 90.0);
        }
        if (loss <= 160) {
            return new ClassificationResult("INACCURACY", "?!", 65.0);
        }
        if (loss <= 320) {
            return new ClassificationResult("MISTAKE", "?", 35.0);
        }
        return new ClassificationResult("BLUNDER", "??", 5.0);
    }

    private record ClassificationResult(String code, String badge, double accuracy) {}
}