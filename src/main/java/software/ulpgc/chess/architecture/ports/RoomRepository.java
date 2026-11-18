package software.ulpgc.chess.architecture.ports;

import software.ulpgc.chess.architecture.domain.ChessRoom;

import java.util.List;
import java.util.Optional;

public interface RoomRepository {
    void save(ChessRoom room);
    Optional<ChessRoom> findById(String roomId);
    Optional<ChessRoom> findByCode(String roomCode);
    List<ChessRoom> findAll();
    void deleteById(String roomId);
    void deleteAll();
}