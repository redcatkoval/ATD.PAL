import React from 'react';

export const QuickActions = ({ actions, onAction }) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.name}
          onClick={() => onAction(action.name)}
          className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-lg shadow-sm transition-colors"
        >
          {action.name}
        </button>
      ))}
    </div>
  );
}; 