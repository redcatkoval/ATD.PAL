import React from 'react';
import Logo from './Logo';

const Header = ({ onLogout }) => {
  const handleLogoutClick = () => {
    console.log("Header: Logout button clicked");
    console.log("Header: onLogout function exists:", !!onLogout);
    console.log("Header: onLogout function type:", typeof onLogout);
    
    // Принудительно удаляем флаг авторизации из localStorage
    localStorage.removeItem('isLoggedIn');
    console.log("Header: Removed isLoggedIn from localStorage");
    
    if (typeof onLogout === 'function') {
      console.log("Header: Calling onLogout function...");
      onLogout();
    } else {
      console.error("Header: onLogout is not a function or not provided");
      // Если функция не передана, попробуем перенаправить на страницу логина
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 border-b border-gray-200 bg-white">
      <div className="flex justify-center">
        <div className="w-full max-w-[912px] min-w-[320px] px-4 py-4 flex justify-between items-center">
          <Logo />
          
          <button 
            onClick={handleLogoutClick}
            className="w-[52px] h-10 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 