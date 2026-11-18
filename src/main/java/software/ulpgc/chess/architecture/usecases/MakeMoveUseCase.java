package software.ulpgc.chess.architecture.usecases;

import software.ulpgc.chess.architecture.domain.*;
import software.ulpgc.chess.architecture.ports.RoomRepository;

import java.util.NoSuchElementException;
import java.util.Optional;

public class MakeMoveUseCase {
    private final RoomRepository repository;
    private final BotMoveSelector botMoveSelector;

    public MakeMoveUseCase(RoomRepository repository) {
        this.repository = repository;
        this.botMoveSelector = new BotMoveSelector();
    }

    public ChessRoom execute(String roomId, String player, String from, String to) {
        ChessRoom room = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));
        ChessRoom updated = room.applyMove(player, from, to);

        if (updated.status() == RoomStatus.PLAYING
                && updated.isBotGame()
                && updated.currentTurn() == Color.Black) {
            Move lastMove = updated.moves().get(updated.moves().size() - 1);
            Optional<BotMoveSelector.SelectedMove> botMove = botMoveSelector.chooseMove(updated.board(), Color.Black, lastMove);
            if (botMove.isPresent()) {
                updated = updated.applyMove(
                        ChessRoom.BOT_PLAYER_NAME,
                        botMove.get().from().notation(),
                        botMove.get().to().notation()
                );
            }
        }

        repository.save(updated);
        return updated;
    }
}