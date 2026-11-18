package software.ulpgc.chess.infrastructure.adapters;

import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import software.ulpgc.chess.architecture.domain.Board;
import software.ulpgc.chess.architecture.domain.Piece;
import software.ulpgc.chess.architecture.domain.Square;

import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;

public class ChessGsonFactory {
    public static Gson create() {
        return new GsonBuilder()
                .registerTypeAdapter(Board.class, new BoardAdapter())
                .setPrettyPrinting()
                .create();
    }

    private static class BoardAdapter implements JsonSerializer<Board>, JsonDeserializer<Board> {
        private static final Type MAP_TYPE = new TypeToken>() {}.getType();

        @Override
        public JsonElement serialize(Board board, Type typeOfSrc, JsonSerializationContext context) {
            Map<String, String> simpleMap = new HashMap<>();
            board.pieces().forEach((square, piece) -> simpleMap.put(square.notation(), piece.name()));
            return context.serialize(simpleMap, MAP_TYPE);
        }

        @Override
        public Board deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) throws JsonParseException {
            Map<String, String> simpleMap = context.deserialize(json, MAP_TYPE);
            Map<Square, Piece> pieces = new HashMap<>();
            if (simpleMap != null) {
                simpleMap.forEach((coord, pieceName) -> pieces.put(Square.at(coord), Piece.valueOf(pieceName)));
            }
            return new Board(pieces);
        }
    }
}