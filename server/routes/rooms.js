const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Generate a random 6-char room code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/rooms — create a room
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Room name is required' });

  try {
    let code;
    let exists = true;

    // Keep generating until we get a unique code
    while (exists) {
      code = generateCode();
      const check = await pool.query('SELECT id FROM rooms WHERE code = $1', [code]);
      exists = check.rows.length > 0;
    }

    // Create the room
    const roomResult = await pool.query(
      'INSERT INTO rooms (name, code, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.user.userId]
    );
    const room = roomResult.rows[0];

    // Create an empty note for the room
    await pool.query(
      'INSERT INTO notes (room_id, content) VALUES ($1, $2)',
      [room.id, '']
    );

    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms/:code — get room + its note
router.get('/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  try {
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE code = $1',
      [code.toUpperCase()]
    );
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = roomResult.rows[0];

    const noteResult = await pool.query(
      'SELECT * FROM notes WHERE room_id = $1',
      [room.id]
    );

    res.json({ room, note: noteResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;