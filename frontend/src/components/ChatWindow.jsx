import { useEffect, useRef } from 'react';
import Composer from './Composer';
import logo from '../assets/logo.png';
import './ChatWindow.css';

export default function ChatWindow({ activeChat, messages, onSend, userName, generationMeta, isGenerating, error }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const firstName = userName?.split(' ')[0];

  // No chat selected yet, or a chat with no messages: show centered greeting + composer
  if (!activeChat || messages.length === 0) {
    return (
      <div className="chat-window">
        <div className="chat-empty">
          <img src={logo} alt="" />
          <h2>{firstName ? `What are we building, ${firstName}?` : 'What are we building today?'}</h2>
          <div className="chat-empty-composer">
            <Composer onSend={onSend} placeholder="Paste a client brief to start a proposal…" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="message-list" ref={listRef}>
        <div className="message-list-inner">
          {messages.map((msg) => (
            <div key={msg._id} className={`message-row ${msg.role}`}>
              {msg.role === 'assistant' && <div className="message-avatar">D</div>}
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}

          {isGenerating && (
            <div className="message-row assistant message-row-pending">
              <div className="message-avatar">D</div>
              <div className="message-bubble message-bubble-pending">Drafting proposal…</div>
            </div>
          )}
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
