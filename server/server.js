const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 4000;

// Store game state for each room
const games = {};

app.get('/', (req, res) => {
    res.send('Chess Server Running');
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a game
    socket.on('joinGame', (room) => {
        socket.join(room);
        
        // Create a new game if it doesn't exist
        if (!games[room]) {
            games[room] = new Chess();
        }

        // Send the current state of the game to the player who just joined
        socket.emit('gameState', games[room].fen());
        
        // Notify all players in the room
        socket.to(room).emit('playerJoined', socket.id);
    });

    // Handle moves
    socket.on('move', (data) => {
        const { room, from, to } = data;
        const game = games[room];

        const move = game.move({
            from: String.fromCharCode(97 + (from % 8)) + (8 - Math.floor(from / 8)),
            to: String.fromCharCode(97 + (to % 8)) + (8 - Math.floor(to / 8)),
        });

        if (move) {
            io.to(room).emit('move', { from, to }); // Broadcast move to other players
            io.to(room).emit('gameState', game.fen()); // Update game state for all players

            // Check game status
            if (game.in_checkmate()) {
                io.to(room).emit('gameOver', 'Checkmate!');
            } else if (game.in_check()) {
                io.to(room).emit('check', 'Check!');
            }
        } else {
            socket.emit('invalidMove', 'Invalid move!');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});