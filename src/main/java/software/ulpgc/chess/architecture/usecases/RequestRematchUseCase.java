package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.domain.RoomStatus;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;

public class RequestRematchUseCase {
    private final RoomRepository repository;
    private final CreateRoomUseCase createRoomUseCase;

    public RequestRematchUseCase(RoomRepository repository, CreateRoomUseCase createRoomUseCase) {
        this.repository = repository;
        this.createRoomUseCase = createRoomUseCase;
    }

    public ChessRoom execute(String roomId, String player) {
        if (player == null || player.isBlank()) {
            throw new IllegalArgumentException("Debes identificarte para pedir revancha");
        }
        String trimmed = player.trim();
        ChessRoom oldRoom = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Sala no encontrada: " + roomId));

        if (oldRoom.status() != RoomStatus.FINISHED) {
            throw new IllegalStateException("La partida debe haber finalizado para pedir revancha");
        }

        boolean wasWhite = oldRoom.whitePlayer() != null && oldRoom.whitePlayer().equalsIgnoreCase(trimmed);
        boolean wasBlack = oldRoom.blackPlayer() != null && oldRoom.blackPlayer().equalsIgnoreCase(trimmed);
        if (!wasWhite && !wasBlack) {
            throw new IllegalArgumentException("Solo los jugadores de esta sala pueden pedir revancha");
        }

        if (oldRoom.rematchRoomId() != null) {
            ChessRoom rematchRoom = repository.findById(oldRoom.rematchRoomId())
                    .orElseThrow(() -> new NoSuchElementException("La sala de revancha ya no existe"));
            if (rematchRoom.status() == RoomStatus.WAITING) {
                ChessRoom joined = rematchRoom.join(trimmed);
                repository.save(joined);
                return joined;
            }
            return rematchRoom;
        }

        String nextColor = wasWhite ? "Black" : "White";
        boolean vsBot = oldRoom.isBotGame();
        ChessRoom rematchRoom = createRoomUseCase.execute(trimmed, oldRoom.timeLimitSeconds(), vsBot, nextColor);
        ChessRoom updatedOld = oldRoom.withRematch(rematchRoom.roomId(), trimmed);
        repository.save(updatedOld);
        return rematchRoom;
    }
}