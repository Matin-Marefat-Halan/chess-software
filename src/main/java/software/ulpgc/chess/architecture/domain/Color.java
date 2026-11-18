package software.ulpgc.chess.architecture.domain;

public enum Color {
    White,
    Black;

    public Color opposite() {
        return this == White ? Black : White;
    }
}