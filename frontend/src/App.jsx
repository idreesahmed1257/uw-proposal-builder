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
    if (isGenerating || !content?.trim()) return;

    let chatId = activeChatId;
    setSendError('');
    setGenerationMeta(null);
    setIsGenerating(true);

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    const userMessage = {
      _id: tempUserId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholder = {
      _id: tempAssistantId,
      role: 'assistant',
      isPlaceholder: true,
      createdAt: new Date().toISOString(),
    };

    // Immediately show user message + assistant thinking placeholder
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

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

      // Replace placeholder with actual assistant response
      if (response && response.message) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempAssistantId ? response.message : msg))
        );
      }

      // Sync with database to get canonical IDs
      const { messages: refreshedMessages } = await fetchChat(chatId);
      setMessages(refreshedMessages);
      loadChats(); // resync sidebar order/titles
    } catch (error) {
      console.error('Failed to generate proposal', error);
      const errorText = 'Sorry, something went wrong. Please try again.';
      setSendError(error.response?.data?.message || errorText);

      // Replace placeholder with error state assistant message
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempAssistantId
            ? {
                _id: tempAssistantId,
                role: 'assistant',
                content: errorText,
                isError: true,
              }
            : msg
        )
      );

      if (chatId) {
        try {
          const { messages: refreshedMessages } = await fetchChat(chatId);
          if (refreshedMessages && refreshedMessages.length > 0) {
            setMessages(refreshedMessages);
          }
        } catch (e) {
          // Keep local optimistic state with error bubble if fetch fails
        }
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