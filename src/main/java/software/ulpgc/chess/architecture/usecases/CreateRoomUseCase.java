package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.BotMoveSelector;
import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.domain.Color;
import software.ulpgc.chess.architecture.ports.RoomCodeGenerator;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.security.SecureRandom;
import java.util.Optional;
import java.util.UUID;

public class CreateRoomUseCase {
    private final RoomRepository repository;
    private final RoomCodeGenerator codeGenerator;
    private final BotMoveSelector botMoveSelector;
    private final SecureRandom random;

    public CreateRoomUseCase(RoomRepository repository, RoomCodeGenerator codeGenerator) {
        this.repository = repository;
        this.codeGenerator = codeGenerator;
        this.botMoveSelector = new BotMoveSelector();
        this.random = new SecureRandom();
    }

    public ChessRoom execute(String player) {
        return execute(player, 0, false, "White");
    }

    public ChessRoom execute(String player, int timeLimitSeconds) {
        return execute(player, timeLimitSeconds, false, "White");
    }

    public ChessRoom execute(String player, int timeLimitSeconds, boolean vsBot) {
        return execute(player, timeLimitSeconds, vsBot, "White");
    }

    public ChessRoom execute(String player, int timeLimitSeconds, boolean vsBot, String preferredColor) {
        String roomId = UUID.randomUUID().toString();
        String roomCode = generateUniqueCode();
        String resolvedColor = resolveColor(preferredColor);

        ChessRoom room = vsBot
                ? ChessRoom.createVsBot(roomId, roomCode, player, timeLimitSeconds, resolvedColor)
                : ChessRoom.create(roomId, roomCode, player, timeLimitSeconds, resolvedColor);

        if (vsBot && room.botColor() == Color.White) {
            Optional<BotMoveSelector.SelectedMove> opening = botMoveSelector.chooseMove(room.board(), Color.White, null);
            if (opening.isPresent()) {
                room = room.applyBotMove(
                        opening.get().from().notation(),
                        opening.get().to().notation(),
                        opening.get().promotion(),
                        opening.get().thinkingMs()
                );
            }
        }

        repository.save(room);
        return room;
    }

    private String resolveColor(String preferredColor) {
        if ("Random".equalsIgnoreCase(preferredColor)) {
            return random.nextBoolean() ? "White" : "Black";
        }
        if ("Black".equalsIgnoreCase(preferredColor)) {
            return "Black";
        }
        return "White";
    }

    private String generateUniqueCode() {
        String code = codeGenerator.generate();
        while (repository.findByCode(code).isPresent()) {
            code = codeGenerator.generate();
        }
        return code;
    }
}