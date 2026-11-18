package software.ulpgc.chess.architecture.domain;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class BotMoveSelector {
    private final MovementValidator validator = new MovementValidator();
    private final SecureRandom random = new SecureRandom();

    public record SelectedMove(Square from, Square to) {}

    public Optional<SelectedMove> chooseMove(Board board, Color botColor, Move lastMove) {
        List<SelectedMove> captures = new ArrayList<>();
        List<SelectedMove> regularMoves = new ArrayList<>();

        for (Map.Entry<Square, Piece> entry : board.pieces().entrySet()) {
            Square from = entry.getKey();
            Piece piece = entry.getValue();
            if (piece.color() != botColor) {
                continue;
            }
            for (File file : File.values()) {
                for (Rank rank : Rank.values()) {
                    Square to = new Square(file, rank);
                    if (validator.isValidMove(board, from, to, lastMove)) {
                        SelectedMove candidate = new SelectedMove(from, to);
                        if (board.pieceAt(to) != null) {
                            captures.add(candidate);
                        } else {
                            regularMoves.add(candidate);
                        }
                    }
                }
            }
        }

        List<SelectedMove> pool = !captures.isEmpty() ? captures : regularMoves;
        if (pool.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(pool.get(random.nextInt(pool.size())));
    }
}