package software.ulpgc.chess.architecture.domain;

import java.util.List;

public record GameReview(
        String roomId,
        double whiteAccuracy,
        double blackAccuracy,
        PlayerSummary whiteSummary,
        PlayerSummary blackSummary,
        List<MoveReview> moves
) {
    public record PlayerSummary(
            int excellent,
            int good,
            int inaccuracy,
            int mistake,
            int blunder
    ) {}

    public record MoveReview(
            int moveNumber,
            String player,
            Color color,
            String from,
            String to,
            String piece,
            String classification,
            String badge,
            String bestMove,
            int centipawnLoss
    ) {}
}