package software.ulpgc.chess.infrastructure.persistence;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.ports.RoomRepository;
import software.ulpgc.chess.infrastructure.adapters.ChessGsonFactory;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class FileRoomRepository implements RoomRepository {
    private static final Type LIST_TYPE = TypeToken.getParameterized(List.class, ChessRoom.class).getType();
    private final Path storagePath;
    private final Gson gson;
    private final Map<String, ChessRoom> cache;

    public FileRoomRepository(Path storagePath) {
        this.storagePath = storagePath;
        this.gson = ChessGsonFactory.create();
        this.cache = new ConcurrentHashMap<>();
        loadFromDisk();
    }

    @Override
    public synchronized void save(ChessRoom room) {
        cache.put(room.roomId(), room);
        persistToDisk();
    }

    @Override
    public Optional<ChessRoom> findById(String roomId) {
        return Optional.ofNullable(cache.get(roomId));
    }

    @Override
    public Optional<ChessRoom> findByCode(String roomCode) {
        if (roomCode == null) {
            return Optional.empty();
        }
        String normalized = roomCode.trim().toUpperCase();
        return cache.values().stream()
                .filter(room -> room.roomCode().equalsIgnoreCase(normalized))
                .findFirst();
    }

    @Override
    public List<ChessRoom> findAll() {
        return cache.values().stream()
                .sorted(Comparator.comparing(ChessRoom::createdAt).reversed())
                .toList();
    }

    @Override
    public synchronized void deleteById(String roomId) {
        cache.remove(roomId);
        persistToDisk();
    }

    @Override
    public synchronized void deleteAll() {
        cache.clear();
        persistToDisk();
    }

    private void loadFromDisk() {
        if (!Files.exists(storagePath)) {
            return;
        }
        try {
            String json = Files.readString(storagePath);
            List<ChessRoom> rooms = gson.fromJson(json, LIST_TYPE);
            if (rooms != null) {
                rooms.forEach(room -> cache.put(room.roomId(), room));
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to load rooms from disk", e);
        }
    }

    private void persistToDisk() {
        try {
            if (storagePath.getParent() != null) {
                Files.createDirectories(storagePath.getParent());
            }
            Files.writeString(storagePath, gson.toJson(new ArrayList<>(cache.values())));
        } catch (IOException e) {
            throw new RuntimeException("Failed to save rooms to disk", e);
        }
    }
}