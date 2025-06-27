import React, { useState } from 'react';
import { LogoutIcon } from './Icons';
import Logo from './Logo';

const MainLayout = ({ children, onLogout }) => {
  const [activeButton, setActiveButton] = useState(null);

  const getButtonStyle = (buttonName) => {
    return activeButton === buttonName 
      ? "bg-[#FFF7F2] border-[2px] border-[#F85A00] text-[#F85A00]" 
      : "bg-gray-50 border-[2px] border-transparent";
  };

  const handleLogout = () => {
    setActiveButton('logout');
    setTimeout(() => {
      setActiveButton(null);
      if (onLogout) onLogout();
    }, 300);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Шапка */}
      <header className="sticky top-0 border-b border-gray-200 bg-white z-10">
        <div className="flex justify-center">
          <div className="w-full max-w-[912px] min-w-[320px] px-3 py-3 flex justify-between items-center">
            {/* Логотип */}
            <Logo />
            
            {/* Кнопка выхода */}
            <button 
              onClick={handleLogout}
              className={`px-4 py-3 rounded-2xl flex items-center justify-center ${getButtonStyle('logout')}`}
            >
              <LogoutIcon color={activeButton === 'logout' ? "#F85A00" : undefined} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Основная часть */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-[912px] min-w-[320px] px-3 flex flex-col">
          {children}
        </div>
      </main>
      
      {/* Футер */}
      <footer className="flex justify-center bg-white">
        <div className="w-full max-w-[912px] min-w-[320px] py-3">
          {/* Powered by текст */}
          <div className="footer text-center text-xs text-gray-400">
            Powered by AUTODOC
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout; 