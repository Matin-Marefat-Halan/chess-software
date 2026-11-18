package software.ulpgc.chess.architecture.domain;

public record Move(
        int moveNumber,
        String player,
        Color color,
        String from,
        String to,
        String piece,
        String timestamp
) {
}