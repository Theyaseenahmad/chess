const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const server = http.createServer(app);

const socketIo = require("socket.io");
const io = socketIo(server);

const { Chess } = require("chess.js");

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
let waitingPlayers = [];

let games = {};

io.on("connection", (socket) => {

  socket.on("disconnect", () => {
    waitingPlayers = waitingPlayers.filter((s) => s.id !== socket.id);

    if (socket.gameRoom) {
      const room = socket.gameRoom;
      io.to(room).emit("gameReset", "A player disconnected. Game over.");
      delete games[room];
    }
  });

  if (waitingPlayers.length > 0) {
    const opponent = waitingPlayers.shift();

    const room = "game_" + opponent.id + "_" + socket.id;

    // Have both sockets join the room.
    socket.join(room);
    opponent.join(room);

    const chessInstance = new Chess();

    // Store the game state.
    games[room] = {
      room: room,
      chess: chessInstance,
      players: {
        white: opponent.id, 
        black: socket.id    
      }
    };

    opponent.role = "w";
    socket.role = "b";
    opponent.gameRoom = room;
    socket.gameRoom = room;

    // Notify each player of their role.
    opponent.emit("playerRole", "w");
    socket.emit("playerRole", "b");

    io.to(room).emit("boardState", chessInstance.fen());
  } else {
    waitingPlayers.push(socket);
    socket.emit("alert", "finding opponent...");
  }

  
  socket.on("move", (move) => {
    if (!socket.gameRoom) {
      return socket.emit("message", "You are not in a game.");
    }
    const room = socket.gameRoom;
    const game = games[room];
    if (!game) return;

    if (game.chess.turn() !== socket.role) {
      return socket.emit("notYourTurn", "It is not your turn.");
    }

    const result = game.chess.move(move);
    if (result) {
      io.to(room).emit("move", move);
      io.to(room).emit("boardState", game.chess.fen());
    } else {
      socket.emit("invalidMove", move);
    }
  });
});

app.get("/", (req, res) => {
  res.render("start", { title: "Start" });
});

app.get("/play", (req, res) => {
  res.render("index", { title: "Chess" });
});

server.listen(3000, () => {
  console.log("Listening on port 3000");
});
