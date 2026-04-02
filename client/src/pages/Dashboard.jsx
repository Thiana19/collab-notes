import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!roomName.trim()) return setError('Enter a room name');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/rooms', { name: roomName });
      navigate(`/room/${res.data.code}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return setError('Enter a room code');
    setError('');
    try {
      // Verify room exists before navigating
      await api.get(`/rooms/${joinCode.trim()}`);
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      setError('Room not found. Check the code and try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Hey, {user?.username} 👋</h1>
      <p className="text-gray-400 mb-10">Create a room or join one with a code.</p>

      {error && (
        <p className="text-red-400 text-sm mb-6 bg-red-900/20 p-3 rounded-lg">{error}</p>
      )}

      <div className="grid gap-6">
        {/* Create Room */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">✨ Create a Room</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Room name..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRoom()}
            />
            <button
              onClick={createRoom}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition"
            >
              {loading ? '...' : 'Create'}
            </button>
          </div>
        </div>

        {/* Join Room */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">🔗 Join a Room</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter room code..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition uppercase tracking-widest"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              maxLength={6}
            />
            <button
              onClick={joinRoom}
              className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-lg font-semibold transition"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}