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
        return execute(roomId, player, from, to, null);
    }

    public ChessRoom execute(String roomId, String player, String from, String to, String promotion) {
        ChessRoom room = repository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));
        ChessRoom updated = room.applyMove(player, from, to, promotion);

        Color botColor = updated.botColor();
        if (updated.status() == RoomStatus.PLAYING
                && botColor != null
                && updated.currentTurn() == botColor) {
            Move lastMove = updated.moves().get(updated.moves().size() - 1);
            Optional<BotMoveSelector.SelectedMove> botMove = botMoveSelector.chooseMove(updated.board(), botColor, lastMove);
            if (botMove.isPresent()) {
                updated = updated.applyBotMove(
                        botMove.get().from().notation(),
                        botMove.get().to().notation(),
                        botMove.get().promotion(),
                        botMove.get().thinkingMs()
                );
            }
        }

        repository.save(updated);
        return updated;
    }
}