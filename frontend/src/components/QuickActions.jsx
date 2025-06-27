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
          className="btn-primary"
        >
          {action.name}
        </button>
      ))}
    </div>
  );
}; 