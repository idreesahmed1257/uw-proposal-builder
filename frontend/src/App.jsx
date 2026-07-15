import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

function AppContent() {
  const { user, logout } = useAuth();

  // Once chat UI is built, this is where we'll branch: no user -> AuthPage,
  // user present -> the main chat layout (sidebar + chat window).
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div style={{ padding: 40, color: 'var(--text)' }}>
      <p>Logged in as {user.name} ({user.email})</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
