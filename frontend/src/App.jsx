import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { fetchChats, createChat, fetchChat, deleteChat, sendMessage } from './api/chats';

function MainApp() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const loadChats = async () => {
    const data = await fetchChats();
    setChats(data);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const openChat = async (chatId) => {
    setActiveChatId(chatId);
    const { messages } = await fetchChat(chatId);
    setMessages(messages);
  };

  const handleNewChat = () => {
    // Don't create the chat in the DB yet — wait until the user actually
    // sends a first message, so we don't litter empty "New Chat" entries.
    setActiveChatId(null);
    setMessages([]);
  };

  const handleDeleteChat = async (chatId) => {
    await deleteChat(chatId);
    if (chatId === activeChatId) {
      setActiveChatId(null);
      setMessages([]);
    }
    loadChats();
  };

  const handleSend = async (content) => {
    let chatId = activeChatId;

    // Lazily create the chat on first message, titled from the message itself
    if (!chatId) {
      const title = content.length > 40 ? `${content.slice(0, 40)}…` : content;
      const chat = await createChat({ title });
      chatId = chat._id;
      setActiveChatId(chatId);
    }

    const message = await sendMessage(chatId, { role: 'user', content });
    setMessages((prev) => [...prev, message]);
    loadChats(); // resync sidebar order/titles

    // NOTE: assistant reply wiring happens once the generation endpoint
    // (RAG retrieval + LLM call) is built — this just persists the user's
    // message for now.
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={openChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      <ChatWindow
        activeChat={activeChatId}
        messages={messages}
        onSend={handleSend}
        userName={user?.name}
      />
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <AuthPage />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}