import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/MainLayout';
import { InputArea } from '../components/InputArea';
import AIMessage from '../components/AIMessage';
import UserMessage from '../components/UserMessage';
import { BooksLibraryIcon, BusinessCardsIcon, TeamGoalsIcon, GuidelinesIcon, LicensesIcon, DesignResourcesIcon } from '../components/Icons';

const ChatPage = ({ onLogout }) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const tools = [
    { name: 'Books Library', icon: BooksLibraryIcon },
    { name: 'Business Cards', icon: BusinessCardsIcon },
    { name: 'Team Goals', icon: TeamGoalsIcon },
    { name: 'Licenses', icon: LicensesIcon },
    { name: 'Design Resources', icon: DesignResourcesIcon },
    { name: 'Guidelines', icon: GuidelinesIcon },
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
    const userMessage = { id: Date.now(), sender: 'user', text };
    const typingMessageId = Date.now() + 1;
    const typingMessage = { id: typingMessageId, sender: 'ai', isTyping: true };

    setMessages(prev => [...prev, userMessage, typingMessage]);

    setTimeout(() => {
      const aiResponse = {
        id: typingMessageId,
        sender: 'ai',
        text: `Tool "${text}" selected. This feature is not yet implemented.`,
        isTyping: false
      };

      setMessages(prev => prev.map(msg => msg.id === typingMessageId ? aiResponse : msg));
    }, 1000); // Simulate network delay
  };

  return (
    <MainLayout onLogout={onLogout}>
      <div className="flex-grow overflow-y-auto py-4 flex flex-col-reverse">
        <div ref={messagesEndRef} />
        {[...messages].reverse().map((msg, index, reversedArray) => {
          const prevMessage = reversedArray[index - 1];
          const prevSender = prevMessage ? prevMessage.sender : null;
          const marginBottomClass =
            index === 0
              ? ''
              : msg.sender === prevSender
              ? 'mb-2' // 8px
              : 'mb-6'; // 24px

          return (
            <div key={msg.id} className={marginBottomClass}>
              {msg.sender === 'user' ? (
                <div className="flex justify-end">
                  <UserMessage text={msg.text} />
                </div>
              ) : (
                <AIMessage message={msg} onAction={handleSendMessage} />
              )}
            </div>
          );
        })}
      </div>
      <InputArea onSendMessage={handleSendMessage} />
    </MainLayout>
  );
};

export default ChatPage; 