package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;

public class MakeMoveUseCase {
    private final RoomRepository repository;

    public MakeMoveUseCase(RoomRepository repository) {
        this.repository = repository;
    }

    public ChessRoom execute(String roomId, String player, String from, String to) {
        ChessRoom room = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));
        ChessRoom updated = room.applyMove(player, from, to);
        repository.save(updated);
        return updated;
    }
}