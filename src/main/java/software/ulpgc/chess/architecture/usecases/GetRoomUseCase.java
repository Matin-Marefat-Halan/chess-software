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
        ChessRoom room = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));
        return syncClock(room);
    }

    public ChessRoom byCode(String roomCode) {
        ChessRoom room = repository.findByCode(roomCode)
                .orElseThrow(() -> new NoSuchElementException("Room not found with code: " + roomCode));
        return syncClock(room);
    }

    private ChessRoom syncClock(ChessRoom room) {
        ChessRoom evaluated = room.evaluateClock();
        if (!evaluated.equals(room)) {
            repository.save(evaluated);
        }
        return evaluated;
    }
}