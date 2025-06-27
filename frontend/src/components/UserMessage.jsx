import React from 'react';

const UserMessage = ({ text }) => {
  return (
    <div className="max-w-[564px] bg-[#F9FAFB] rounded-2xl p-4">
      <p className="text-base font-normal font-inter text-gray-800">{text}</p>
    </div>
  );
};

export default UserMessage; 