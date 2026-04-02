const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
const server = http.createServer(app); // wrap express in http server for socket.io

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─────────────────────────────────────────────
// Socket.io Real-Time Logic
// ─────────────────────────────────────────────

// This map tracks who is in each room
// Structure: { roomCode: Set(username) }
const roomPresence = {};

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── Join Room ──────────────────────────────
  // Client emits this when they open a room
  socket.on('join-room', async ({ roomCode, username }) => {
    const code = roomCode.toUpperCase();

    // Leave any previous room (in case of navigation)
    const prevRoom = socket.currentRoom;
    if (prevRoom) {
      socket.leave(prevRoom);
      if (roomPresence[prevRoom]) {
        roomPresence[prevRoom].delete(socket.username);
        io.to(prevRoom).emit('presence-update', [...roomPresence[prevRoom]]);
      }
    }

    // Join the new room
    socket.join(code);
    socket.currentRoom = code;
    socket.username = username;

    // Add user to presence map
    if (!roomPresence[code]) roomPresence[code] = new Set();
    roomPresence[code].add(username);

    // Tell everyone in room who's here
    io.to(code).emit('presence-update', [...roomPresence[code]]);

    // Send the latest note content to the user who just joined
    try {
      const roomResult = await pool.query('SELECT id FROM rooms WHERE code = $1', [code]);
      if (roomResult.rows.length > 0) {
        const noteResult = await pool.query(
          'SELECT content FROM notes WHERE room_id = $1',
          [roomResult.rows[0].id]
        );
        if (noteResult.rows.length > 0) {
          socket.emit('note-init', noteResult.rows[0].content);
        }
      }
    } catch (err) {
      console.error('Error fetching note on join:', err);
    }

    console.log(`👤 ${username} joined room ${code}`);
  });

  // ── Note Change ────────────────────────────
  // Client emits this on every keystroke
  socket.on('note-change', async ({ roomCode, content }) => {
    const code = roomCode.toUpperCase();

    // Broadcast to everyone ELSE in the room (not the sender)
    socket.to(code).emit('note-update', content);

    // Debounced DB save happens here — save every change to postgres
    try {
      const roomResult = await pool.query('SELECT id FROM rooms WHERE code = $1', [code]);
      if (roomResult.rows.length > 0) {
        await pool.query(
          'UPDATE notes SET content = $1, updated_at = NOW() WHERE room_id = $2',
          [content, roomResult.rows[0].id]
        );
      }
    } catch (err) {
      console.error('Error saving note:', err);
    }
  });

  // ── Typing Indicator ──────────────────────
  socket.on('typing', ({ roomCode, username }) => {
    socket.to(roomCode.toUpperCase()).emit('user-typing', { username });
  });

  // ── Line Focus ────────────────────────────
  socket.on('line-focus', ({ roomCode, username, lineIndex }) => {
    socket.to(roomCode.toUpperCase()).emit('line-focus-update', { username, lineIndex });
  });

  socket.on('line-blur', ({ roomCode, username }) => {
    socket.to(roomCode.toUpperCase()).emit('line-blur-update', { username });
  });

  // ── Disconnect ─────────────────────────────
  socket.on('disconnect', () => {
    const room = socket.currentRoom;
    const username = socket.username;

    if (room && username && roomPresence[room]) {
      roomPresence[room].delete(username);

      // Clean up empty rooms from memory
      if (roomPresence[room].size === 0) {
        delete roomPresence[room];
      } else {
        io.to(room).emit('presence-update', [...roomPresence[room]]);
      }
    }

    console.log(`❌ Socket disconnected: ${socket.id} (${username || 'unknown'})`);
  });
});

// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));