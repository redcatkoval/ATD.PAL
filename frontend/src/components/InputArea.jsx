import React, { useState, useRef, useEffect } from 'react';
import { SendMessageIcon, BooksLibraryIcon, BusinessCardsIcon, TeamGoalsIcon, GuidelinesIcon, LicensesIcon, DesignResourcesIcon } from './Icons';

export const InputArea = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeButton, setActiveButton] = useState(null);
  const dropdownRef = useRef(null);

  const tools = [
    { id: 'books', name: 'Books Library', icon: BooksLibraryIcon },
    { id: 'cards', name: 'Business Cards', icon: BusinessCardsIcon },
    { id: 'goals', name: 'Team Goals', icon: TeamGoalsIcon },
    { id: 'guidelines', name: 'Guidelines', icon: GuidelinesIcon },
    { id: 'licenses', name: 'Licenses', icon: LicensesIcon },
    { id: 'resources', name: 'Design Resources', icon: DesignResourcesIcon },
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        if (activeButton === 'tools') {
          setActiveButton(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, activeButton]);

  const getButtonStyle = (buttonName) => {
    return activeButton === buttonName
      ? "bg-[#FFF7F2] border-[2px] border-[#F85A00] text-[#F85A00]"
      : "bg-gray-50 border-[2px] border-transparent";
  };

  const handleSend = () => {
    if (message.trim()) {
      setActiveButton('send');
      onSendMessage(message);
      setMessage('');
      setTimeout(() => setActiveButton(null), 300);
    }
  };

  const handleToolsClick = () => {
    const nextState = activeButton === 'tools' ? null : 'tools';
    setActiveButton(nextState);
    setShowDropdown(nextState === 'tools');
  };

  const handleToolSelect = (tool) => {
    setActiveButton(`tool-${tool.id}`);
    onSendMessage(tool.name);
    
    setTimeout(() => {
      setShowDropdown(false);
      setActiveButton(null);
    }, 300);
  };

  return (
    <div className="rounded-[32px] bg-white border border-gray-200">
      <div className="px-[18px] pt-[16px] pb-[16px]">
        <textarea 
          className="w-full h-[72px] resize-none focus:outline-none text-base font-normal font-inter placeholder:text-gray-400" 
          placeholder="Type your message here"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="mt-[12px] flex justify-between items-center">
          <div className="relative" ref={dropdownRef}>
            <button 
              className={`px-4 py-3 rounded-2xl flex items-center justify-center ${getButtonStyle('tools')}`}
              onClick={handleToolsClick}
            >
              <span className={`font-inter ${activeButton === 'tools' ? "text-[#F85A00]" : ""}`}>Tools</span>
            </button>
            {showDropdown && (
              <div className="absolute bottom-full mb-2 left-0 w-[240px] bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-10">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div 
                      key={tool.id}
                      className={`px-4 py-3 rounded-lg cursor-pointer flex items-center border-2 ${
                        activeButton === `tool-${tool.id}`
                          ? 'bg-[#FFF7F2] border-transparent text-[#F85A00]'
                          : 'border-transparent'
                      }`}
                      onClick={() => handleToolSelect(tool)}
                    >
                      <Icon className="mr-[4px]" color={activeButton === `tool-${tool.id}` ? '#F85A00' : undefined} />
                      <span className="font-inter">{tool.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button 
            className={`px-4 py-3 rounded-2xl flex items-center justify-center ${getButtonStyle('send')}`}
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
          >
            <SendMessageIcon color={activeButton === 'send' ? "#F85A00" : undefined} />
          </button>
        </div>
      </div>
    </div>
  );
}; 