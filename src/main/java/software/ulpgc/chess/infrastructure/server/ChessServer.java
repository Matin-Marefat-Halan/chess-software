package software.ulpgc.chess.infrastructure.server;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import io.javalin.Javalin;
import io.javalin.config.JavalinConfig;
import io.javalin.http.Context;
import software.ulpgc.chess.architecture.usecases.*;
import software.ulpgc.chess.infrastructure.adapters.ChessGsonFactory;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Supplier;

public class ChessServer {
    private final int port;
    private final CreateRoomUseCase createRoomUseCase;
    private final JoinRoomUseCase joinRoomUseCase;
    private final MakeMoveUseCase makeMoveUseCase;
    private final ResignGameUseCase resignGameUseCase;
    private final GetRoomUseCase getRoomUseCase;
    private final ListRoomsUseCase listRoomsUseCase;
    private final DeleteRoomsUseCase deleteRoomsUseCase;
    private final Gson gson;
    private Javalin app;

    public ChessServer(
            int port,
            CreateRoomUseCase createRoomUseCase,
            JoinRoomUseCase joinRoomUseCase,
            MakeMoveUseCase makeMoveUseCase,
            ResignGameUseCase resignGameUseCase,
            GetRoomUseCase getRoomUseCase,
            ListRoomsUseCase listRoomsUseCase,
            DeleteRoomsUseCase deleteRoomsUseCase
    ) {
        this.port = port;
        this.createRoomUseCase = createRoomUseCase;
        this.joinRoomUseCase = joinRoomUseCase;
        this.makeMoveUseCase = makeMoveUseCase;
        this.resignGameUseCase = resignGameUseCase;
        this.getRoomUseCase = getRoomUseCase;
        this.listRoomsUseCase = listRoomsUseCase;
        this.deleteRoomsUseCase = deleteRoomsUseCase;
        this.gson = ChessGsonFactory.create();
    }

    public void start() {
        this.app = Javalin.create(this::configure).start(port);
    }

    public void stop() {
        if (this.app != null) {
            this.app.stop();
        }
    }

    private void configure(JavalinConfig config) {
        config.staticFiles.add("/public");
        config.routes.before(this::applyCorsHeaders);
        config.routes.options("/*", ctx -> ctx.status(204));
        config.routes.get("/api/rooms", this::listRooms);
        config.routes.post("/api/rooms", this::createRoom);
        config.routes.delete("/api/rooms", this::deleteAllRooms);
        config.routes.post("/api/rooms/join", this::joinRoom);
        config.routes.get("/api/rooms/{roomId}", this::getRoomById);
        config.routes.delete("/api/rooms/{roomId}", this::deleteRoomById);
        config.routes.get("/api/rooms/code/{roomCode}", this::getRoomByCode);
        config.routes.post("/api/rooms/{roomId}/moves", this::makeMove);
        config.routes.post("/api/rooms/{roomId}/resign", this::resignGame);
    }

    private void applyCorsHeaders(Context ctx) {
        ctx.header("Access-Control-Allow-Origin", "*");
        ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        ctx.header("Access-Control-Allow-Headers", "Content-Type");
    }

    private void listRooms(Context ctx) {
        executeJson(ctx, 200, listRoomsUseCase::execute);
    }

    private void createRoom(Context ctx) {
        executeJson(ctx, 201, () -> {
            CreateRoomRequest request = parseBody(ctx, CreateRoomRequest.class);
            int limit = request.timeLimitSeconds() != null ? request.timeLimitSeconds() : 0;
            return createRoomUseCase.execute(request.player(), limit);
        });
    }

    private void deleteAllRooms(Context ctx) {
        executeJson(ctx, 200, () -> {
            deleteRoomsUseCase.deleteAll();
            return Map.of("deleted", true);
        });
    }

    private void deleteRoomById(Context ctx) {
        executeJson(ctx, 200, () -> {
            deleteRoomsUseCase.deleteById(ctx.pathParam("roomId"));
            return Map.of("deleted", true);
        });
    }

    private void joinRoom(Context ctx) {
        executeJson(ctx, 200, () -> {
            JoinRoomRequest request = parseBody(ctx, JoinRoomRequest.class);
            return joinRoomUseCase.execute(request.roomCode(), request.player());
        });
    }

    private void getRoomById(Context ctx) {
        executeJson(ctx, 200, () -> getRoomUseCase.byId(ctx.pathParam("roomId")));
    }

    private void getRoomByCode(Context ctx) {
        executeJson(ctx, 200, () -> getRoomUseCase.byCode(ctx.pathParam("roomCode")));
    }

    private void makeMove(Context ctx) {
        executeJson(ctx, 200, () -> {
            MoveRequest request = parseBody(ctx, MoveRequest.class);
            return makeMoveUseCase.execute(ctx.pathParam("roomId"), request.player(), request.from(), request.to());
        });
    }

    private void resignGame(Context ctx) {
        executeJson(ctx, 200, () -> {
            ResignRequest request = parseBody(ctx, ResignRequest.class);
            return resignGameUseCase.execute(ctx.pathParam("roomId"), request.player());
        });
    }

    private <T> T parseBody(Context ctx, Class<T> type) {
        T body = gson.fromJson(ctx.body(), type);
        if (body == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        return body;
    }

    private void executeJson(Context ctx, int successStatus, Supplier<Object> action) {
        ctx.contentType("application/json");
        try {
            Object result = action.get();
            ctx.status(successStatus).result(gson.toJson(result));
        } catch (IllegalArgumentException | JsonSyntaxException e) {
            ctx.status(400).result(gson.toJson(Map.of("error", e.getMessage())));
        } catch (NoSuchElementException e) {
            ctx.status(404).result(gson.toJson(Map.of("error", e.getMessage())));
        } catch (IllegalStateException e) {
            ctx.status(409).result(gson.toJson(Map.of("error", e.getMessage())));
        }
    }

    private record CreateRoomRequest(String player, Integer timeLimitSeconds) {}
    private record JoinRoomRequest(String roomCode, String player) {}
    private record MoveRequest(String player, String from, String to) {}
    private record ResignRequest(String player) {}
}