package software.ulpgc.chess.architecture.domain;

public enum Rank {
    R1(1),
    R2(2),
    R3(3),
    R4(4),
    R5(5),
    R6(6),
    R7(7),
    R8(8);

    private final int value;

    Rank(int value) {
        this.value = value;
    }

    public int value() {
        return value;
    }

    public int index() {
        return ordinal();
    }

    public static Rank fromChar(char c) {
        int val = Character.getNumericValue(c);
        for (Rank rank : values()) {
            if (rank.value == val) {
                return rank;
            }
        }
        throw new IllegalArgumentException("Invalid rank: " + c);
    }
}