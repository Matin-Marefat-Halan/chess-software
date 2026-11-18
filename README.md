# Chess Rooms — Sistema Distribuido de Salas de Ajedrez

Aplicación web cliente-servidor para gestionar salas privadas de ajedrez por turnos, diseñada bajo los principios de **Arquitectura Hexagonal (Puertos y Adaptadores)** tanto en el backend (Java 27 + Javalin) como en el frontend (HTML/CSS/JavaScript modular).

---

## 1. Requisitos y Dependencias

- **JDK:** Java 27
- **Gestor de dependencias:** Maven 3.9+
- **Librerías principales (`pom.xml`):**
    - `io.javalin:javalin:7.2.4` — Servidor HTTP embebido y enrutamiento de la API REST y archivos estáticos.
    - `com.google.code.gson:gson:2.15.0` — Serialización/deserialización JSON y persistencia en disco.
    - `org.slf4j:slf4j-simple:2.0.20` — Registro de eventos del servidor.
    - `org.junit.jupiter:junit-jupiter:5.11.4` — Pruebas unitarias y de integración.

---

## 2. Arquitectura del Sistema

```text
+-----------------------------------+           HTTP / JSON           +-----------------------------------------+
|       FRONTEND (Navegador)        | <-----------------------------> |        BACKEND (Java 27 + Javalin)      |
|                                   |     GET / POST / DELETE         |                                         |
|  UI (BoardRenderer)               |     /api/rooms/...              |  Adaptador Entrada (ChessServer)        |
|   └─> Casos de Uso UI             |                                 |   └─> Casos de Uso (UseCases)           |
|        └─> ChessServicePort       |                                 |        └─> Dominio (Board, ChessRoom)   |
|             ├─> HttpChessAdapter -+---------------------------------+        └─> RoomRepository (Puerto)      |
|             └─> MockChessAdapter  |                                 |             └─> FileRoomRepository      |
+-----------------------------------+                                 +-----------------------------------------+
                                                                                                 │
                                                                                                 ▼
                                                                                     [ Persistencia: data/rooms.json ]