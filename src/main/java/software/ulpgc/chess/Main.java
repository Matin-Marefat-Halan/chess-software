package software.ulpgc.chess;

import software.ulpgc.chess.architecture.ports.RoomCodeGenerator;
import software.ulpgc.chess.architecture.ports.RoomRepository;
import software.ulpgc.chess.architecture.usecases.*;
import software.ulpgc.chess.infrastructure.adapters.RandomRoomCodeGenerator;
import software.ulpgc.chess.infrastructure.persistence.FileRoomRepository;
import software.ulpgc.chess.infrastructure.server.ChessServer;

import java.nio.file.Path;

public class Main {
    private static final int DEFAULT_PORT = 8080;
    private static final String DEFAULT_DATA_PATH = "data/rooms.json";

    public static void main(String[] args) {
        int port = resolvePort();
        Path storagePath = Path.of(System.getenv().getOrDefault("DATA_PATH", DEFAULT_DATA_PATH));

        RoomRepository repository = new FileRoomRepository(storagePath);
        RoomCodeGenerator codeGenerator = new RandomRoomCodeGenerator();

        ChessServer server = new ChessServer(
                port,
                new CreateRoomUseCase(repository, codeGenerator),
                new JoinRoomUseCase(repository),
                new MakeMoveUseCase(repository),
                new ResignGameUseCase(repository),
                new GetRoomUseCase(repository),
                new ListRoomsUseCase(repository),
                new DeleteRoomsUseCase(repository)
        );

        server.start();
    }

    private static int resolvePort() {
        String envPort = System.getenv("PORT");
        if (envPort == null || envPort.isBlank()) {
            return DEFAULT_PORT;
        }
        return Integer.parseInt(envPort.trim());
    }
}