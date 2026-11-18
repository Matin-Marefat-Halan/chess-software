package software.ulpgc.chess.architecture.domain;

public record Square(File file, Rank rank) {
    public static Square at(String coordinate) {
        if (coordinate == null || coordinate.length() != 2) {
            throw new IllegalArgumentException("Invalid square coordinate: " + coordinate);
        }
        File file = File.fromChar(coordinate.charAt(0));
        Rank rank = Rank.fromChar(coordinate.charAt(1));
        return new Square(file, rank);
    }

    public String notation() {
        return "" + file.symbol() + rank.value();
    }
}