const socket = io();
const chess = new Chess();

let boardElement = document.querySelector(".chessBoard");
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // we will get from server
let targetSquare = null;

let whiteplayer = null;
let blackplayer = null;

const getPieceUnicode = (piece) => {
  const pieceUnicode = {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙",
    K: "♚",
    Q: "♛",
    R: "♜",
    B: "♝",
    N: "♞",
    P: "♟︎",
  };
  return pieceUnicode[piece.type] || "";
};

socket.on("alert", (message) => {
  alert(message); // e.g., "finding opponent..."
});

const renderBoard = () => {
  boardElement.innerHTML = ""; // Clear the board to avoid duplicates

  const board = chess.board();

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );
      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        // Allow dragging only if the piece matches the player's role
        pieceElement.draggable = square.color === playerRole;

        // Desktop drag events
        pieceElement.addEventListener("dragstart", (e) => {
          if (playerRole !== square.color) return;
          draggedPiece = pieceElement;
          sourceSquare = { row: rowIndex, col: squareIndex };
          e.dataTransfer.setData("text/plain", "");
        });
        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        // Mobile touch events
        pieceElement.addEventListener("touchstart", (e) => {
          if (playerRole !== square.color) return;
          draggedPiece = pieceElement;
          sourceSquare = { row: rowIndex, col: squareIndex };
          // Prevent scrolling while dragging
          e.preventDefault();
        });
        pieceElement.addEventListener("touchend", (e) => {
          if (!draggedPiece) return;
          // Get touch coordinates from the first changed touch
          const touch = e.changedTouches[0];
          // Find the element at the touch position
          const targetElem = document.elementFromPoint(
            touch.clientX,
            touch.clientY
          );
          // Traverse up until we find the square element
          let squareElem = targetElem;
          while (squareElem && !squareElem.classList.contains("square")) {
            squareElem = squareElem.parentElement;
          }
          if (squareElem && squareElem.dataset.row && squareElem.dataset.col) {
            targetSquare = {
              row: parseInt(squareElem.dataset.row),
              col: parseInt(squareElem.dataset.col),
            };
            handleMove(sourceSquare, targetSquare);
          }
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);

        if (blackplayer) {
          pieceElement.classList.add("flipped");
        }
      }

      // Allow drop on squares (desktop)
      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        targetSquare = {
          row: parseInt(squareElement.dataset.row),
          col: parseInt(squareElement.dataset.col),
        };
        handleMove(sourceSquare, targetSquare);
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (blackplayer) {
    boardElement.classList.add("flipped");
  }
};

const handleMove = (source, target) => {
  // Make sure source and target exist before trying to move
  if (!source || !target) return;

  try {
    if (playerRole !== chess.turn()) return;
    const move = chess.move({
      from: `${String.fromCharCode(source.col + 97)}${8 - source.row}`,
      to: `${String.fromCharCode(target.col + 97)}${8 - target.row}`,
      promotion: "q",
    });
    if (move) {
      socket.emit("move", move);
    } else {
      console.error("Illegal move attempted from", source, "to", target);
    }
  } catch (error) {
    console.error("error in move", error);
  }
};

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
  if (role === "b") {
    blackplayer = true;
    alert("black player");
  } else if (role === "w") {
    whiteplayer = true;
    alert("white player");
  } else {
    alert("spectating");
  }
});

socket.on("spectatorRole", (role) => {
  playerRole = null;
  renderBoard();
  alert("spectating");
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
});

renderBoard();
