import React, { useState } from 'react';

const ToolButton = ({ name, icon: Icon, onAction, isActive }) => {
  return (
    <button
      onClick={() => onAction(name)}
      className={`px-4 py-3 rounded-2xl inline-flex justify-start items-center gap-2 font-normal font-['Inter'] leading-normal outline outline-2 -outline-offset-2 transition-colors ${
        isActive
          ? 'bg-[#FFF7F2] text-[#F85A00] outline-[#F85A00]'
          : 'text-zinc-600 outline-inputBorder'
      }`}
    >
      <Icon className="w-5 h-5" color={isActive ? '#F85A00' : '#636363'} />
      <span>{name}</span>
    </button>
  );
};

export const ToolSelector = ({ tools, onAction }) => {
  const [activeButton, setActiveButton] = useState(null);

  if (!tools || tools.length === 0) {
    return null;
  }

  const handleAction = (name) => {
    setActiveButton(name);
    onAction(name);
    setTimeout(() => setActiveButton(null), 300);
  };

  return (
    <div className="flex flex-wrap gap-2 w-full max-w-xl">
      {tools.map((tool) => (
        <ToolButton
          key={tool.name}
          name={tool.name}
          icon={tool.icon}
          onAction={handleAction}
          isActive={activeButton === tool.name}
        />
      ))}
    </div>
  );
}; 