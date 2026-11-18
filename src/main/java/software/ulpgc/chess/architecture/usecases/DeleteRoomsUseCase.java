package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.ports.RoomRepository;

public class DeleteRoomsUseCase {
    private final RoomRepository repository;

    public DeleteRoomsUseCase(RoomRepository repository) {
        this.repository = repository;
    }

    public void deleteById(String roomId) {
        repository.deleteById(roomId);
    }

    public void deleteAll() {
        repository.deleteAll();
    }
}