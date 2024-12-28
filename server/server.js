const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const gameRoutes = require('./routes/gameRoutes');
const authRoutes = require('./routes/authRoutes');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

connectDB();

app.use(cors());
app.use(bodyParser.json());
app.use('/api/games', gameRoutes);
app.use('/api/auth', authRoutes);

const onlineUsers = {}; // Track online users

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGame', (username) => {
        onlineUsers[socket.id] = username;
        io.emit('updateUserList', Object.values(onlineUsers));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete onlineUsers[socket.id];
        io.emit('updateUserList', Object.values(onlineUsers));
    });

    // Other existing socket events...
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});