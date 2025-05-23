const http = require('http');
const socketIo = require('socket.io');
const config = require('config');
const app = require('./app');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('New client connected');

  // Join a debate room
  socket.on('joinDebate', (debateId) => {
    socket.join(`debate-${debateId}`);
    console.log(`Client joined debate: ${debateId}`);
  });

  // Leave a debate room
  socket.on('leaveDebate', (debateId) => {
    socket.leave(`debate-${debateId}`);
    console.log(`Client left debate: ${debateId}`);
  });

  // Handle speech-to-text updates
  socket.on('speechUpdate', (data) => {
    // Broadcast to all clients in the debate room except sender
    socket.to(`debate-${data.debateId}`).emit('speechUpdate', {
      userId: data.userId,
      position: data.position,
      text: data.text,
      isFinal: data.isFinal
    });
  });

  // Handle timer updates
  socket.on('timerUpdate', (data) => {
    // Broadcast to all clients in the debate room
    io.to(`debate-${data.debateId}`).emit('timerUpdate', {
      timeRemaining: data.timeRemaining,
      currentSpeaker: data.currentSpeaker
    });
  });

  // Handle speaker change
  socket.on('speakerChange', (data) => {
    // Broadcast to all clients in the debate room
    io.to(`debate-${data.debateId}`).emit('speakerChange', {
      currentSpeaker: data.currentSpeaker
    });
  });

  // Handle debate status change
  socket.on('debateStatusChange', (data) => {
    // Broadcast to all clients in the debate room
    io.to(`debate-${data.debateId}`).emit('debateStatusChange', {
      status: data.status
    });
  });

  // Handle judge scoring
  socket.on('judgeScore', (data) => {
    // Broadcast to moderator and admin clients in the debate room
    socket.to(`debate-${data.debateId}`).emit('judgeScore', {
      judgeId: data.judgeId,
      participantId: data.participantId,
      scores: data.scores
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Get port from config
const PORT = process.env.PORT || config.get('port');

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));