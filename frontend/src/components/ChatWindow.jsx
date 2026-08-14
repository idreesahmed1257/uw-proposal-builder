import { useState, useEffect, useRef } from 'react';
import Composer from './Composer';
import logo from '../assets/logo.png';
import './ChatWindow.css';

function ThinkingIndicator() {
  const [textIndex, setTextIndex] = useState(0);
  const statusTexts = ['Thinking...', 'Reviewing resources...', 'Generating response...'];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % statusTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [statusTexts.length]);

  return (
    <div className="thinking-container">
      <div className="typing-dots">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="thinking-text">{statusTexts[textIndex]}</span>
    </div>
  );
}

export default function ChatWindow({ activeChat, messages, onSend, userName, generationMeta, isGenerating, error }) {
  const listRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const prevMessagesLength = useRef(messages.length);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = listRef.current;
    // User is considered scrolled up if they are more than 100px away from the bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isUserScrolledUp.current = distanceFromBottom > 100;
  };

  useEffect(() => {
    if (!listRef.current) return;

    const currentLength = messages.length;
    const lastMsg = messages[currentLength - 1];

    // If a new user message was appended, force auto-scroll to bottom
    if (currentLength > prevMessagesLength.current && lastMsg?.role === 'user') {
      isUserScrolledUp.current = false;
    }

    // Auto-scroll if the user hasn't manually scrolled up
    if (!isUserScrolledUp.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }

    prevMessagesLength.current = currentLength;
  }, [messages, isGenerating]);

  const firstName = userName?.split(' ')[0];

  // No messages in chat: show centered greeting + composer
  if (messages.length === 0) {
    return (
      <div className="chat-window">
        <div className="chat-empty">
          <div className="chat-empty-logo-wrap">
            <img src={logo} alt="DevNauts Logo" className="chat-empty-logo" />
          </div>
          <h2>{firstName ? `What are we building, ${firstName}?` : 'What are we building today?'}</h2>
          <div className="chat-empty-composer">
            <Composer onSend={onSend} placeholder="Paste a client brief to start a proposal…" disabled={isGenerating} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="message-list" ref={listRef} onScroll={handleScroll}>
        <div className="message-list-inner">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`message-row ${msg.role} ${msg.isPlaceholder ? 'message-row-pending' : ''}`}
            >
              {msg.role === 'assistant' && <div className="message-avatar">D</div>}
              <div className={`message-bubble ${msg.isError ? 'message-bubble-error' : ''}`}>
                {msg.isPlaceholder ? <ThinkingIndicator /> : msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="composer-wrap">
        <div className="composer-wrap-inner">
          {error && <div className="chat-error-banner">{error}</div>}

          {generationMeta?.lowConfidencePortfolio && (
            <div className="chat-confidence-note">
              No direct portfolio match — experience framed as transferable.
            </div>
          )}

          <Composer onSend={onSend} placeholder="Message DevNauts…" disabled={isGenerating} />
          <div className="composer-hint">DevNauts proposal builder — internal tool, drafts may need review.</div>
        </div>
      </div>
    </div>
  );
}

