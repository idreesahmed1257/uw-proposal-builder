import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AdminPage from './pages/AdminPage';
import { fetchChats, createChat, fetchChat, deleteChat, generateProposal } from './api/chats';
import { Routes, Route, useNavigate } from 'react-router-dom';

function MainApp() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [generationMeta, setGenerationMeta] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendError, setSendError] = useState('');
  const navigate = useNavigate();

  const loadChats = async () => {
    const data = await fetchChats();
    setChats(data);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const openChat = async (chatId) => {
    setActiveChatId(chatId);
    setGenerationMeta(null);
    setSendError('');
    const { messages } = await fetchChat(chatId);
    setMessages(messages);
    navigate('/');
  };

  const handleNewChat = () => {
    // Don't create the chat in the DB yet — wait until the user actually
    // sends a first message, so we don't litter empty "New Chat" entries.
    setActiveChatId(null);
    setMessages([]);
    setGenerationMeta(null);
    setSendError('');
    navigate('/');
  };

  const handleDeleteChat = async (chatId) => {
    await deleteChat(chatId);
    if (chatId === activeChatId) {
      setActiveChatId(null);
      setMessages([]);
      setGenerationMeta(null);
      setSendError('');
    }
    loadChats();
  };

  const handleSend = async (content) => {
    if (isGenerating) return;

    let chatId = activeChatId;
    setSendError('');
    setGenerationMeta(null);
    setIsGenerating(true);

    try {
      // Lazily create the chat on first message, titled from the message itself
      if (!chatId) {
        const title = content.length > 40 ? `${content.slice(0, 40)}…` : content;
        const chat = await createChat({ title });
        chatId = chat._id;
        setActiveChatId(chatId);
      }

      const response = await generateProposal(chatId, content);
      setGenerationMeta(response.meta || null);

      const { messages: refreshedMessages } = await fetchChat(chatId);
      setMessages(refreshedMessages);
      loadChats(); // resync sidebar order/titles
    } catch (error) {
      console.error('Failed to generate proposal', error);
      setSendError(error.response?.data?.message || 'Failed to generate proposal.');

      if (chatId) {
        const { messages: refreshedMessages } = await fetchChat(chatId);
        setMessages(refreshedMessages);
      }
    } finally {
      setIsGenerating(false);
    }
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
      <div style={{ flex: 1, height: '100vh', overflow: 'hidden' }}>
        <Routes>
          <Route
            path="/"
            element={
              <ChatWindow
                activeChat={activeChatId}
                messages={messages}
                onSend={handleSend}
                userName={user?.name}
                generationMeta={generationMeta}
                isGenerating={isGenerating}
                error={sendError}
              />
            }
          />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
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