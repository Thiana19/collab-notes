import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PresenceBar from '../components/PresenceBar';

const SOCKET_URL = 'http://localhost:5000';

// Generate a consistent color per username
function getUserColor(username) {
  const colors = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Room() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lines, setLines] = useState(['']);
  const [roomName, setRoomName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  // { username: lineIndex } — which line each remote user is on
  const [lineFocus, setLineFocus] = useState({});

  // ['username1', 'username2'] — who is currently typing
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeouts = useRef({});

  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const lineRefs = useRef([]);

  // ── Socket setup ─────────────────────────────────
  useEffect(() => {
    api.get(`/rooms/${code}`)
      .then(res => setRoomName(res.data.room.name))
      .catch(() => navigate('/dashboard'));

    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join-room', {
        roomCode: code,
        username: user.username,
      });
    });

    socketRef.current.on('disconnect', () => setConnected(false));

    socketRef.current.on('note-init', (initialContent) => {
      setLines(initialContent ? initialContent.split('\n') : ['']);
    });

    socketRef.current.on('note-update', (newContent) => {
      isRemoteUpdate.current = true;
      setLines(newContent ? newContent.split('\n') : ['']);
    });

    socketRef.current.on('presence-update', (users) => {
      setOnlineUsers(users);
    });

    // Typing indicator
    socketRef.current.on('user-typing', ({ username }) => {
      setTypingUsers(prev => [...new Set([...prev, username])]);

      // Clear after 2 seconds of no typing
      if (typingTimeouts.current[username]) {
        clearTimeout(typingTimeouts.current[username]);
      }
      typingTimeouts.current[username] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== username));
      }, 2000);
    });

    // Line focus updates from other users
    socketRef.current.on('line-focus-update', ({ username, lineIndex }) => {
      setLineFocus(prev => ({ ...prev, [username]: lineIndex }));
    });

    socketRef.current.on('line-blur-update', ({ username }) => {
      setLineFocus(prev => {
        const next = { ...prev };
        delete next[username];
        return next;
      });
    });

    return () => {
      socketRef.current.disconnect();
      Object.values(typingTimeouts.current).forEach(clearTimeout);
    };
  }, [code, user.username]);

  // ── Emit helpers ─────────────────────────────────
  const emitChange = useCallback((newLines) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    const content = newLines.join('\n');
    socketRef.current.emit('note-change', { roomCode: code, content });
    socketRef.current.emit('typing', { roomCode: code, username: user.username });
  }, [code, user.username]);

  const emitLineFocus = useCallback((lineIndex) => {
    socketRef.current.emit('line-focus', {
      roomCode: code,
      username: user.username,
      lineIndex,
    });
  }, [code, user.username]);

  const emitLineBlur = useCallback(() => {
    socketRef.current.emit('line-blur', {
      roomCode: code,
      username: user.username,
    });
  }, [code, user.username]);

  // ── Line editing handlers ─────────────────────────
  const handleLineChange = (index, value) => {
    const newLines = [...lines];
    newLines[index] = value;
    setLines(newLines);
    emitChange(newLines);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newLines = [...lines];
      newLines.splice(index + 1, 0, '');
      setLines(newLines);
      emitChange(newLines);
      // Focus next line after render
      setTimeout(() => {
        lineRefs.current[index + 1]?.focus();
        emitLineFocus(index + 1);
      }, 0);
    } else if (e.key === 'Backspace' && lines[index] === '' && lines.length > 1) {
      e.preventDefault();
      const newLines = [...lines];
      newLines.splice(index, 1);
      setLines(newLines);
      emitChange(newLines);
      setTimeout(() => {
        lineRefs.current[index - 1]?.focus();
        emitLineFocus(index - 1);
      }, 0);
    }
  };

  // ── Who is on which line (for highlight) ─────────
  const getUsersOnLine = (lineIndex) => {
    return Object.entries(lineFocus)
      .filter(([, li]) => li === lineIndex)
      .map(([username]) => username);
  };

  // ── Copy room code ────────────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalChars = lines.join('\n').length;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">

      {/* Room Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">{roomName || 'Loading...'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">{code}</span>
            <button onClick={copyCode} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
              {copied ? '✅ Copied!' : '📋 Copy code'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <PresenceBar users={onlineUsers} />
          <div className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
            {connected ? '● Live' : '○ Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Typing Indicator */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-1.5 h-8 flex items-center">
        {typingUsers.length > 0 && (
          <p className="text-xs text-gray-400 italic animate-pulse">
            ✍️ {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </p>
        )}
      </div>

      {/* Line-by-line Editor */}
      <div className="flex-1 overflow-y-auto bg-gray-950 font-mono text-sm">
        {lines.map((line, index) => {
          const usersOnLine = getUsersOnLine(index);
          const isHighlighted = usersOnLine.length > 0;
          const highlightColor = isHighlighted ? getUserColor(usersOnLine[0]) : null;

          return (
            <div
              key={index}
              className="flex items-center group relative"
              style={isHighlighted ? {
                backgroundColor: highlightColor + '15',
                borderLeft: `3px solid ${highlightColor}`,
              } : { borderLeft: '3px solid transparent' }}
            >
              {/* Line number */}
              <span className="w-12 text-right pr-4 text-gray-600 text-xs select-none flex-shrink-0 py-0.5">
                {index + 1}
              </span>

              {/* User avatar on this line */}
              {isHighlighted && (
                <div className="absolute right-3 flex items-center gap-1 z-10">
                  {usersOnLine.map(username => (
                    <span
                      key={username}
                      className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: getUserColor(username) }}
                    >
                      {username}
                    </span>
                  ))}
                </div>
              )}

              {/* Line input */}
              <input
                ref={el => lineRefs.current[index] = el}
                type="text"
                value={line}
                onChange={e => handleLineChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onFocus={() => emitLineFocus(index)}
                onBlur={emitLineBlur}
                className="flex-1 bg-transparent text-gray-100 py-0.5 pr-20 focus:outline-none caret-indigo-400"
                spellCheck={false}
                placeholder={index === 0 ? 'Start typing... changes sync in real time 🚀' : ''}
              />
            </div>
          );
        })}

        {/* Click empty area to add new line */}
        <div
          className="h-48 cursor-text"
          onClick={() => {
            lineRefs.current[lines.length - 1]?.focus();
          }}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>{totalChars} characters · {lines.length} lines</span>
        <span>Auto-saved to PostgreSQL ✓</span>
      </div>
    </div>
  );
}