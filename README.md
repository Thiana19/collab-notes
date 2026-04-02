# 📝 CollabNotes

A real-time collaborative notes application where multiple users can join rooms and edit notes simultaneously. Built with a modern full-stack architecture featuring WebSocket communication, JWT authentication, and persistent storage.

![CollabNotes](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-336791?style=flat&logo=postgresql)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat&logo=socket.io)

---

## 📸 Screenshots

### Login
![Login](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Room Editor
![Room](screenshots/room.png)

### Real-time Collaboration
![Collaboration](screenshots/collaboration.png)

---

## ✨ Features

- **Real-time collaboration** — Multiple users can edit the same note simultaneously with changes syncing instantly via WebSockets
- **Room system** — Create rooms with unique 6-character codes and share them with collaborators
- **Live presence** — See who is currently in the room with online indicators
- **Typing indicators** — Know when someone is actively typing with an animated "is typing..." indicator
- **Line highlighting** — Each user gets a unique color; their current line is highlighted so you always know who is editing where
- **JWT Authentication** — Secure register/login system with token-based auth
- **Persistent storage** — Notes are auto-saved to PostgreSQL on every keystroke
- **Line-by-line editor** — Clean editor with line numbers, Enter to create new lines, Backspace to remove empty lines

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| Socket.io Client | Real-time communication |
| Axios | HTTP requests |
| React Router v7 | Client-side routing |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Socket.io | WebSocket server |
| PostgreSQL | Database |
| pg (node-postgres) | Database client |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth tokens |
| dotenv | Environment config |

---

## 📁 Project Structure

```
collab-notes/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Login page
│   │   │   ├── Register.jsx    # Register page
│   │   │   ├── Dashboard.jsx   # Create/join rooms
│   │   │   └── Room.jsx        # Main collaborative editor
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top navigation bar
│   │   │   └── PresenceBar.jsx # Online users display
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global auth state
│   │   ├── api.js              # Axios instance with auth interceptor
│   │   ├── App.jsx             # Router + protected routes
│   │   └── main.jsx            # App entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
└── server/                     # Node.js backend
    ├── routes/
    │   ├── auth.js             # /api/auth/register, /api/auth/login
    │   └── rooms.js            # /api/rooms (create/get)
    ├── middleware/
    │   └── auth.js             # JWT verification middleware
    ├── db.js                   # PostgreSQL connection pool
    ├── schema.sql              # Database schema
    ├── index.js                # Express + Socket.io server
    └── .env.example            # Environment variable template
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v20+
- PostgreSQL 13+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Thiana19/collab-notes.git
cd collab-notes
```

### 2. Set up the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE collabnotesdb;
\q

# Run the schema
psql -U postgres -d collabnotesdb -f server/schema.sql
```

### 3. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/collabnotesdb
JWT_SECRET=your_secret_here
CLIENT_URL=http://localhost:5173
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Install dependencies & run the server

```bash
# In /server
npm install
node index.js
# Server runs on http://localhost:5000
```

### 5. Run the client

```bash
# In /client
npm install
node node_modules/vite/bin/vite.js
# Client runs on http://localhost:5173
```

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Create a new account | No |
| POST | `/api/auth/login` | Login and receive JWT | No |

**Register body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (both):**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### Rooms

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/rooms` | Create a new room | Yes |
| GET | `/api/rooms/:code` | Get room info + note | Yes |

**Create room body:**
```json
{ "name": "My Room" }
```

**Response:**
```json
{
  "id": 1,
  "name": "My Room",
  "code": "AB3X9K",
  "owner_id": 1,
  "created_at": "2026-04-01T..."
}
```

---

## 🔁 Socket.io Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-room` | Client → Server | `{ roomCode, username }` | Join a room |
| `note-init` | Server → Client | `content (string)` | Initial note content on join |
| `note-change` | Client → Server | `{ roomCode, content }` | User edited the note |
| `note-update` | Server → Client | `content (string)` | Broadcast edit to other users |
| `presence-update` | Server → Client | `[username, ...]` | Updated list of online users |
| `typing` | Client → Server | `{ roomCode, username }` | User is typing |
| `user-typing` | Server → Client | `{ username }` | Broadcast typing indicator |
| `line-focus` | Client → Server | `{ roomCode, username, lineIndex }` | User focused a line |
| `line-focus-update` | Server → Client | `{ username, lineIndex }` | Broadcast line focus |
| `line-blur` | Client → Server | `{ roomCode, username }` | User left a line |
| `line-blur-update` | Server → Client | `{ username }` | Broadcast line blur |

---

## 🗄 Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📄 License

Made by THIANA
