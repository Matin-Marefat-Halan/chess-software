package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;

public class DrawGameUseCase {
    private final RoomRepository repository;

    public DrawGameUseCase(RoomRepository repository) {
        this.repository = repository;
    }

    public ChessRoom execute(String roomId, String player) {
        ChessRoom room = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));
        ChessRoom updated = room.agreeDraw(player);
        repository.save(updated);
        return updated;
    }
}