// src/components/VideoChat.js
import React, { useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

const VideoChat = () => {
  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();

  useEffect(() => {
    socket.on('callUser', (data) => {
      const peer = new Peer({ initiator: false, trickle: false });
      peer.on('signal', (signal) => {
        socket.emit('answerCall', { signal, to: data.from });
      });
      peer.on('stream', (stream) => {
        partnerVideo.current.srcObject = stream;
      });
      peer.signal(data.signal);
      peerRef.current = peer;
    });

    socket.on('callAccepted', (signal) => {
      peerRef.current.signal(signal);
    });

    return () => {
      socket.off('callUser');
      socket.off('callAccepted');
    };
  }, []);

  const callUser = (userId) => {
    const peer = new Peer({ initiator: true, trickle: false });
    peer.on('signal', (signal) => {
      socket.emit('callUser', { userId, signal });
    });
    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream;
    });
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userVideo.current.srcObject = stream;
        peer.addStream(stream);
      });
    peerRef.current = peer;
  };

  return (
    <div>
      <video ref={userVideo} autoPlay playsInline />
      <video ref={partnerVideo} autoPlay playsInline />
      <button onClick={() => callUser('partnerUserId')}>Call</button>
    </div>
  );
};

export default VideoChat;