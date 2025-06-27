import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/MainLayout';
import { InputArea } from '../components/InputArea';
import AIMessage from '../components/AIMessage';
import UserMessage from '../components/UserMessage';

const ChatPage = ({ onLogout }) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const tools = [
    { name: 'Books Library' },
    { name: 'Business Cards' },
    { name: 'Team Goals' },
    { name: 'Licenses' },
    { name: 'Design Resources' },
    { name: 'Guidelines' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: 'ai',
          text: "Hello! 👋 I'm ATD.PAL, your new digital assistant. Nice to meet you! I'm here to help you with work tasks and answer your questions. You can type to me or just click the microphone icon and speak.",
          component: null
        },
        {
          id: 2,
          sender: 'ai',
          text: "Here are my main functions:",
          component: {
            name: 'ToolSelector',
            props: { tools }
          }
        }
      ]);
    }
  }, [messages.length]);

  const handleSendMessage = (text) => {
    const newMessage = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMessage]);

    // Dummy AI response for now
    const aiResponse = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Tool "${text}" selected. This feature is not yet implemented.`
    };
    
    setMessages(prev => [...prev, aiResponse]);
  };

  return (
    <MainLayout onLogout={onLogout}>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map(msg =>
          msg.sender === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <UserMessage text={msg.text} />
            </div>
          ) : (
            <AIMessage key={msg.id} message={msg} onAction={handleSendMessage} />
          )
        )}
        <div ref={messagesEndRef} />
      </div>
      <InputArea onSendMessage={handleSendMessage} />
    </MainLayout>
  );
};

export default ChatPage; 