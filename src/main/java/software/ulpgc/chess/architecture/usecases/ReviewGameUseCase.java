package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.ChessRoom;
import software.ulpgc.chess.architecture.domain.GameReview;
import software.ulpgc.chess.architecture.domain.GameReviewAnalyzer;
import software.ulpgc.chess.architecture.domain.RoomStatus;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;

public class ReviewGameUseCase {
    private final RoomRepository repository;
    private final GameReviewAnalyzer analyzer;

    public ReviewGameUseCase(RoomRepository repository) {
        this.repository = repository;
        this.analyzer = new GameReviewAnalyzer();
    }

    public GameReview execute(String roomId) {
        ChessRoom room = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Sala no encontrada: " + roomId));
        if (room.status() != RoomStatus.FINISHED) {
            throw new IllegalStateException("La revisión solo está disponible cuando termina la partida");
        }
        return analyzer.analyze(room);
    }
}