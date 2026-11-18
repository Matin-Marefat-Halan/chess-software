package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;

public class GetRoomUseCase {
    private final RoomRepository repository;

    public GetRoomUseCase(RoomRepository repository) {
        this.repository = repository;
    }

    public ChessRoom byId(String roomId) {
        return repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));
    }

    public ChessRoom byCode(String roomCode) {
        return repository.findByCode(roomCode)
                .orElseThrow(() -> new NoSuchElementException("Room not found with code: " + roomCode));
    }
}