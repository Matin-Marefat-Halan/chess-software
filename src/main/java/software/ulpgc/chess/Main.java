package software.ulpgc.chess;

import software.ulpgc.chess.architecture.ports.RoomCodeGenerator;
import software.ulpgc.chess.architecture.ports.RoomRepository;
import software.ulpgc.chess.architecture.usecases.*;
import software.ulpgc.chess.infrastructure.adapters.RandomRoomCodeGenerator;
import software.ulpgc.chess.infrastructure.persistence.FileRoomRepository;
import software.ulpgc.chess.infrastructure.server.ChessServer;

import java.nio.file.Path;

public class Main {
    public static void main(String[] args) {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        String dataPath = System.getenv().getOrDefault("DATA_PATH", "data/rooms.json");

        RoomRepository repository = new FileRoomRepository(Path.of(dataPath));
        RoomCodeGenerator codeGenerator = new RandomRoomCodeGenerator();
        CreateRoomUseCase createRoomUseCase = new CreateRoomUseCase(repository, codeGenerator);

        ChessServer server = new ChessServer(
                port,
                createRoomUseCase,
                new JoinRoomUseCase(repository),
                new MakeMoveUseCase(repository),
                new ResignGameUseCase(repository),
                new DrawGameUseCase(repository),
                new RequestRematchUseCase(repository, createRoomUseCase),
                new ReviewGameUseCase(repository),
                new GetRoomUseCase(repository),
                new ListRoomsUseCase(repository),
                new DeleteRoomsUseCase(repository)
        );
        server.start();
    }
}