import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import './ChessBoard.css'; // Import CSS for styling

const socket = io('http://localhost:4000');

const pieceSymbols = {
    w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
    b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

const ChessBoard = () => {
    const [board, setBoard] = useState(Array(64).fill(null));
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [isWhiteTurn, setIsWhiteTurn] = useState(true);
    const room = 'room1';

    // Create a stable chess instance
    const chess = useMemo(() => new Chess(), []);

    // Track selected square
    const [selectedSquare, setSelectedSquare] = useState(null);

    // Render the chess board
    const renderBoard = useCallback(() => {
        const newBoard = Array(64).fill(null);
        chess.board().forEach((row, rowIndex) => {
            row.forEach((piece, colIndex) => {
                if (piece) {
                    const pieceSymbol = pieceSymbols[piece.color][piece.type];
                    newBoard[rowIndex * 8 + colIndex] = pieceSymbol;
                }
            });
        });
        return newBoard;
    }, [chess]);

    const checkGameStatus = useCallback(() => {
        if (chess.game_over()) {
            setGameOver(true);
            setMessage('Game Over!');
        } else if (chess.in_checkmate()) {
            setGameOver(true);
            setMessage('Checkmate!');
        } else if (chess.in_check()) {
            setMessage('Check!');
        } else {
            setMessage('');
        }
    }, [chess]);

    useEffect(() => {
        const initialBoard = renderBoard();
        setBoard(initialBoard);

        socket.emit('joinGame', room);

        const handleGameState = (fen) => {
            chess.load(fen);
            setBoard(renderBoard());
        };

        const handleMove = (data) => {
            const newBoard = [...board];
            newBoard[data.to] = newBoard[data.from];
            newBoard[data.from] = null;
            setBoard(newBoard);
            setIsWhiteTurn((prev) => !prev);
            checkGameStatus();
        };

        socket.on('gameState', handleGameState);
        socket.on('move', handleMove);
        socket.on('check', (msg) => setMessage(msg));
        socket.on('gameOver', (msg) => {
            setGameOver(true);
            setMessage(msg);
        });
        socket.on('invalidMove', (msg) => setMessage(msg));

        return () => {
            socket.off('gameState', handleGameState);
            socket.off('move', handleMove);
            socket.off('check');
            socket.off('gameOver');
            socket.off('invalidMove');
        };
    }, [renderBoard, room, checkGameStatus]); // Correct dependencies

    const getLegalMoves = (index) => {
        const piecePosition = String.fromCharCode(97 + (index % 8)) + (8 - Math.floor(index / 8));
        const moves = chess.moves({ square: piecePosition, verbose: true });
        return moves.map(move => move.to);
    };

    const handleDragStart = (index) => {
        const selectedPiece = board[index];
        if (selectedPiece) {
            if ((isWhiteTurn && selectedPiece === selectedPiece.toUpperCase()) || 
                (!isWhiteTurn && selectedPiece === selectedPiece.toLowerCase())) {
                setSelectedSquare(index);
            } else {
                setMessage('It is not your turn');
            }
        }
    };

    const handleDrop = (index) => {
        if (selectedSquare !== null) {
            const legalMoves = getLegalMoves(selectedSquare);
            const moveTo = String.fromCharCode(97 + (index % 8)) + (8 - Math.floor(index / 8));

            if (legalMoves.includes(moveTo)) {
                handleMove(selectedSquare, index);
            } else {
                setMessage('Move not allowed');
            }
            setSelectedSquare(null);
        }
    };

    const handleMove = (from, to) => {
        const move = chess.move({
            from: String.fromCharCode(97 + (from % 8)) + (8 - Math.floor(from / 8)),
            to: String.fromCharCode(97 + (to % 8)) + (8 - Math.floor(to / 8)),
        });

        if (move) {
            const newBoard = [...board];
            newBoard[to] = newBoard[from];
            newBoard[from] = null;
            setBoard(newBoard);
            socket.emit('move', { room, from, to });
            checkGameStatus();
        } else {
            setMessage('Invalid move!');
        }
    };

    return (
        <div>
            
            {gameOver && <h2>{message}</h2>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 50px)', margin: '20px auto' }}>
                {board.map((piece, index) => (
                    <div
                        key={index}
                        draggable={!gameOver && (selectedSquare === null || selectedSquare === index)}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => e.preventDefault()} // Prevent default to allow drop
                        onDrop={() => handleDrop(index)}
                        className={`square ${((Math.floor(index / 8) + index) % 2 === 0) ? 'white' : 'gray'}`}
                    >
                        {piece}
                    </div>
                ))}
            </div>
            <p>{message}</p>
        </div>
    );
};

export default ChessBoard;