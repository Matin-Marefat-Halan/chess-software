package software.ulpgc.chess;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.domain.Color;
import software.ulpgc.chess.architecture.domain.RoomStatus;
import software.ulpgc.chess.architecture.ports.RoomRepository;
import software.ulpgc.chess.architecture.usecases.*;
import software.ulpgc.chess.infrastructure.persistence.FileRoomRepository;

import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class RoomUseCasesAndPersistenceTest {
    @Test
    void should_run_full_game_lifecycle_using_in_memory_test_double() {
        RoomRepository testDoubleRepository = new InMemoryRoomRepository();
        CreateRoomUseCase createRoom = new CreateRoomUseCase(testDoubleRepository, () -> "ABC123");
        JoinRoomUseCase joinRoom = new JoinRoomUseCase(testDoubleRepository);
        MakeMoveUseCase makeMove = new MakeMoveUseCase(testDoubleRepository);
        ResignGameUseCase resignGame = new ResignGameUseCase(testDoubleRepository);

        ChessRoom created = createRoom.execute("Matin");
        assertEquals("ABC123", created.roomCode());
        assertEquals(RoomStatus.WAITING, created.status());

        ChessRoom joined = joinRoom.execute("ABC123", "Carlos");
        assertEquals(RoomStatus.PLAYING, joined.status());
        assertEquals("Carlos", joined.blackPlayer());

        ChessRoom afterFirstMove = makeMove.execute(created.roomId(), "Matin", "e2", "e4");
        assertEquals(Color.Black, afterFirstMove.currentTurn());
        assertEquals(1, afterFirstMove.moves().size());

        assertThrows(IllegalStateException.class,
                () -> makeMove.execute(created.roomId(), "Matin", "d2", "d4"));

        ChessRoom finished = resignGame.execute(created.roomId(), "Carlos");
        assertEquals(RoomStatus.FINISHED, finished.status());
        assertEquals("Matin", finished.winner());
    }

    @Test
    void should_throw_not_found_for_unknown_room() {
        RoomRepository testDoubleRepository = new InMemoryRoomRepository();
        GetRoomUseCase getRoom = new GetRoomUseCase(testDoubleRepository);

        assertThrows(NoSuchElementException.class, () -> getRoom.byId("non-existent-id"));
        assertThrows(NoSuchElementException.class, () -> getRoom.byCode("ZZZZZZ"));
    }

    @Test
    void should_preserve_rooms_and_moves_after_repository_restart(@TempDir Path tempDir) {
        Path storageFile = tempDir.resolve("rooms-test.json");
        RoomRepository initialRepository = new FileRoomRepository(storageFile);

        CreateRoomUseCase createRoom = new CreateRoomUseCase(initialRepository, () -> "PERS01");
        JoinRoomUseCase joinRoom = new JoinRoomUseCase(initialRepository);
        MakeMoveUseCase makeMove = new MakeMoveUseCase(initialRepository);

        ChessRoom room = createRoom.execute("Ana");
        joinRoom.execute("PERS01", "Luis");
        makeMove.execute(room.roomId(), "Ana", "e2", "e4");
        makeMove.execute(room.roomId(), "Luis", "e7", "e5");

        RoomRepository restartedRepository = new FileRoomRepository(storageFile);
        ChessRoom recovered = restartedRepository.findByCode("PERS01").orElseThrow();

        assertEquals(room.roomId(), recovered.roomId());
        assertEquals(2, recovered.moves().size());
        assertEquals("e2", recovered.moves().get(0).from());
        assertEquals("e5", recovered.moves().get(1).to());
    }

    private static class InMemoryRoomRepository implements RoomRepository {
        private final Map<String, ChessRoom> store = new HashMap<>();

        @Override
        public void save(ChessRoom room) {
            store.put(room.roomId(), room);
        }

        @Override
        public Optional<ChessRoom> findById(String roomId) {
            return Optional.ofNullable(store.get(roomId));
        }

        @Override
        public Optional<ChessRoom> findByCode(String roomCode) {
            return store.values().stream()
                    .filter(room -> room.roomCode().equalsIgnoreCase(roomCode))
                    .findFirst();
        }

        @Override
        public List<ChessRoom> findAll() {
            return new ArrayList<>(store.values());
        }

        @Override
        public void deleteById(String roomId) {
            store.remove(roomId);
        }

        @Override
        public void deleteAll() {
            store.clear();
        }
    }
}