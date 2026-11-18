package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomCodeGenerator;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.UUID;

public class CreateRoomUseCase {
    private final RoomRepository repository;
    private final RoomCodeGenerator codeGenerator;

    public CreateRoomUseCase(RoomRepository repository, RoomCodeGenerator codeGenerator) {
        this.repository = repository;
        this.codeGenerator = codeGenerator;
    }

    public ChessRoom execute(String whitePlayer) {
        return execute(whitePlayer, 0);
    }

    public ChessRoom execute(String whitePlayer, int timeLimitSeconds) {
        String roomId = UUID.randomUUID().toString();
        String roomCode = generateUniqueCode();
        ChessRoom room = ChessRoom.create(roomId, roomCode, whitePlayer, timeLimitSeconds);
        repository.save(room);
        return room;
    }

    private String generateUniqueCode() {
        String code = codeGenerator.generate();
        while (repository.findByCode(code).isPresent()) {
            code = codeGenerator.generate();
        }
        return code;
    }
}