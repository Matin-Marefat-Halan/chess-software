# ♞ Chess Rooms — Ajedrez Online Multijugador e IA

Aplicación web full-stack de ajedrez desarrollada en **Java 21** y **JavaScript moderno (ES6 Modules)** siguiendo los principios de **Arquitectura Hexagonal (Ports & Adapters)**. Permite disputar partidas multijugador en tiempo real mediante salas privadas o enlaces de invitación, entrenar contra una inteligencia artificial propia (**ChessBot**) y analizar cada encuentro al finalizar mediante un sistema de revisión de jugadas.

🌐 **Despliegue en producción:** [https://chess-software.onrender.com](https://chess-software.onrender.com)

---

## ✨ Características principales

- **Reglas FIDE completas:** Validación estricta en backend y frontend de movimientos legales, piezas clavadas, jaque, jaque mate, tablas por ahogado, tablas por material insuficiente, enroque corto y largo, captura al paso (*en passant*) y coronación de peón con selector visual (`♕ ♖ ♗ ♘`).
- **Modos de juego:**
  - **Multijugador online:** Creación de salas con código único de 6 caracteres, enlace directo de invitación (`?room=CODIGO`) y modo espectador.
  - **Entrenamiento contra IA (`ChessBot`):** Motor propio basado en búsqueda **Minimax con poda Alfa-Beta**, ordenación de capturas y evaluación posicional.
- **Configuración de partida:** Elección de bando (**Blancas**, **Negras** o **Aleatorio**) y control de tiempo (**Sin límite**, **3 min**, **5 min** o **10 min**).
- **Revisión de partida (*Game Review*):** Análisis post-partida que calcula el porcentaje de precisión de cada jugador (`0% - 100%`), clasifica cada movimiento (**Excelente `!`**, **Buena `✓`**, **Imprecisión `?!`**, **Error `?`**, **Grave `??`**) y muestra cuál era la mejor jugada en caso de imprecisión o error.
- **Revancha sincronizada:** Solicitud de revancha en tiempo real con notificación instantánea al rival e inversión automática de colores.
- **Interfaz y experiencia de usuario:**
  - Tablero 8x8 rígido con indicador de casillas válidas, último movimiento y alerta visual de jaque.
  - Marcador de piezas capturadas agrupadas por tipo (`♟×3`, `♞`, etc.) y ventaja material neta (`+5`).
  - Historial interactivo con modo repetición (*replay*) jugada a jugada, rotación de tablero y efectos de sonido generados mediante **Web Audio API**.
  - Selector de adaptador en vivo en el frontend para alternar entre **HTTP Backend (Javalin API)** y **Mock Local (Doble de prueba)**.

---

## 🏛️ Arquitectura del proyecto

El sistema separa completamente la lógica de negocio del framework web, la persistencia y la interfaz de usuario:

```text
chess-software/
├── pom.xml
├── Dockerfile
├── src/
│   ├── main/
│   │   ├── java/software/ulpgc/chess/
│   │   │   ├── Main.java                                # Composición e inyección de dependencias
│   │   │   ├── architecture/
│   │   │   │   ├── domain/                              # Entidades, reglas FIDE, IA y analizador
│   │   │   │   │   ├── Board.java
│   │   │   │   │   ├── BotMoveSelector.java
│   │   │   │   │   ├── ChessRoom.java
│   │   │   │   │   ├── Color.java
│   │   │   │   │   ├── File.java
│   │   │   │   │   ├── GameReview.java
│   │   │   │   │   ├── GameReviewAnalyzer.java
│   │   │   │   │   ├── Move.java
│   │   │   │   │   ├── MovementValidator.java
│   │   │   │   │   ├── Piece.java
│   │   │   │   │   ├── PieceType.java
│   │   │   │   │   ├── Rank.java
│   │   │   │   │   ├── RoomStatus.java
│   │   │   │   │   └── Square.java
│   │   │   │   ├── ports/                               # Interfaces de salida (Repositorio y códigos)
│   │   │   │   │   ├── RoomCodeGenerator.java
│   │   │   │   │   └── RoomRepository.java
│   │   │   │   └── usecases/                            # Casos de uso de la aplicación
│   │   │   │       ├── CreateRoomUseCase.java
│   │   │   │       ├── DeleteRoomsUseCase.java
│   │   │   │       ├── DrawGameUseCase.java
│   │   │   │       ├── GetRoomUseCase.java
│   │   │   │       ├── JoinRoomUseCase.java
│   │   │   │       ├── ListRoomsUseCase.java
│   │   │   │       ├── MakeMoveUseCase.java
│   │   │   │       ├── RequestRematchUseCase.java
│   │   │   │       ├── ResignGameUseCase.java
│   │   │   │       └── ReviewGameUseCase.java
│   │   │   └── infrastructure/
│   │   │       ├── adapters/                            # Serialización JSON y generación de códigos
│   │   │       ├── persistence/                         # Persistencia en fichero JSON (FileRoomRepository)
│   │   │       └── server/                              # Servidor HTTP y endpoints REST (ChessServer)
│   │   └── resources/public/                            # Cliente web (HTML5, CSS3, JS ES6)
│   │       ├── index.html
│   │       ├── css/styles.css
│   │       └── js/
│   │           ├── main.js
│   │           ├── config.js
│   │           ├── domain/ChessModels.js
│   │           ├── ports/ChessServicePort.js
│   │           ├── adapters/
│   │           │   ├── HttpChessAdapter.js
│   │           │   └── MockChessAdapter.js
│   │           ├── usecases/RoomInteractionUseCases.js
│   │           └── ui/
│   │               ├── BoardRenderer.js
│   │               └── SoundEffects.js
│   └── test/java/software/ulpgc/chess/                  # Suite de pruebas unitarias e integración (JUnit 5)
│       ├── ChessEngineTest.java
│       └── RoomUseCasesAndPersistenceTest.java
```

---

## 🔌 API REST

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/rooms` | Lista todas las salas activas y el histórico de partidas. |
| `POST` | `/api/rooms` | Crea una nueva sala (`player`, `timeLimitSeconds`, `vsBot`, `color`). |
| `POST` | `/api/rooms/join` | Une a un segundo jugador mediante código de sala (`roomCode`, `player`). |
| `GET` | `/api/rooms/{roomId}` | Obtiene el estado actualizado de una sala por su identificador. |
| `GET` | `/api/rooms/code/{roomCode}` | Busca una sala por su código público de 6 caracteres. |
| `POST` | `/api/rooms/{roomId}/moves` | Ejecuta un movimiento (`player`, `from`, `to`, `promotion`). |
| `POST` | `/api/rooms/{roomId}/resign` | Registra el abandono de un jugador y finaliza la partida. |
| `POST` | `/api/rooms/{roomId}/draw` | Finaliza la partida en tablas de mutuo acuerdo. |
| `POST` | `/api/rooms/{roomId}/rematch` | Crea o acepta una sala de revancha con los colores invertidos. |
| `GET` | `/api/rooms/{roomId}/review` | Analiza una partida finalizada y devuelve precisión y calidad de jugadas. |
| `DELETE` | `/api/rooms/{roomId}` | Elimina una sala específica. |
| `DELETE` | `/api/rooms` | Borra el historial completo de salas. |

---

## 🚀 Ejecución local y pruebas

### Requisitos previos
- **Java 21** o superior.
- **Apache Maven 3.9+**.

### Ejecutar los tests
```bash
mvn test
```

### Arrancar el servidor localmente
```bash
mvn compile exec:java -Dexec.mainClass="software.ulpgc.chess.Main"
```
Una vez iniciado, abre `http://localhost:8080` en tu navegador.

---

## 🐳 Despliegue (Docker / Render)

El repositorio incluye un `Dockerfile` multi-etapa que compila el proyecto con Maven y ejecuta la aplicación sobre **Eclipse Temurin JRE 21**. Admite las siguientes variables de entorno:

- `PORT`: Puerto HTTP de escucha (por defecto `8080`).
- `DATA_PATH`: Ruta del archivo JSON donde se persisten las salas (por defecto `data/rooms.json`).