import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import './Sidebar.css';

export default function Sidebar({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat }) {
  const { user, logout } = useAuth();

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="DevNauts" />
        <span>DEVNAUTS</span>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        New chat
      </button>

      <div className="sidebar-section-label">Recents</div>

      <div className="chat-list">
        {chats.length === 0 && <div className="chat-list-empty">No chats yet</div>}
        {chats.map((chat) => (
          <div
            key={chat._id}
            className={`chat-list-item ${chat._id === activeChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(chat._id)}
          >
            <span className="chat-list-item-title">{chat.title}</span>
            <button
              className="chat-list-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat._id);
              }}
              aria-label={`Delete ${chat.title}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initial}</div>
          <span className="sidebar-user-name">{user?.name}</span>
        </div>
        <button className="sidebar-logout" onClick={logout} aria-label="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
