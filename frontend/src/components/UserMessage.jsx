import React from 'react';

const UserMessage = ({ text }) => {
  return (
    <div className="bg-orange-500 text-white p-3 rounded-lg max-w-lg">
      {text}
    </div>
  );
};

export default UserMessage; 