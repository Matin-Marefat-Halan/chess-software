package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;

public class JoinRoomUseCase {
    private final RoomRepository repository;

    public JoinRoomUseCase(RoomRepository repository) {
        this.repository = repository;
    }

    public ChessRoom execute(String roomCode, String blackPlayer) {
        ChessRoom room = repository.findByCode(roomCode)
                .orElseThrow(() -> new NoSuchElementException("Room not found with code: " + roomCode));
        ChessRoom updated = room.join(blackPlayer);
        repository.save(updated);
        return updated;
    }
}