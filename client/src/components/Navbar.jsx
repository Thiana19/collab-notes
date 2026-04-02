import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <Link to="/dashboard" className="text-xl font-bold text-indigo-400 tracking-tight">
        📝 CollabNotes
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">👤 {user.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}