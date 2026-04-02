export default function PresenceBar({ users }) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {users.map((username, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {username}
          </div>
        ))}
      </div>
    );
  }