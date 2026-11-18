package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.List;

public class ListRoomsUseCase {
    private final RoomRepository repository;

    public ListRoomsUseCase(RoomRepository repository) {
        this.repository = repository;
    }

    public List<ChessRoom> execute() {
        return repository.findAll();
    }
}