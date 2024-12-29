// src/components/Chessboard.js
import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

const ChessboardComponent = ({ gameId }) => {
  const [position, setPosition] = useState('start');

  useEffect(() => {
    socket.emit('joinGame', gameId);

    socket.on('move', (moveData) => {
      setPosition(moveData.position);
    });

    return () => {
      socket.off('move');
    };
  }, [gameId]);

  const makeMove = (move) => {
    const newPosition = move; // You should implement move logic
    setPosition(newPosition);
    socket.emit('move', { gameId, position: newPosition });
  };

  return (
    <Chessboard position={position} onDrop={makeMove} />
  );
};

export default ChessboardComponent;