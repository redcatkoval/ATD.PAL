import React from 'react';

export const GuideList = ({ guides, onGuideSelect }) => {
  return (
    <ul className="list-disc list-outside pl-5 space-y-2">
      {guides.map((guide, index) => (
        <li key={index} className="text-gray-800">
          <button 
            className="hover:text-blue-600 text-left align-top"
            onClick={() => onGuideSelect && onGuideSelect(guide)}
          >
            {guide}
          </button>
        </li>
      ))}
    </ul>
  );
}; 