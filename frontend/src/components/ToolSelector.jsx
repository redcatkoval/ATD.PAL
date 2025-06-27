import React from 'react';
import {
  BooksLibraryIcon,
  BusinessCardsIcon,
  TeamGoalsIcon,
  LicensesIcon,
  DesignResourcesIcon,
  GuidelinesIcon,
} from './Icons';

const iconMap = {
  'Books Library': BooksLibraryIcon,
  'Business Cards': BusinessCardsIcon,
  'Team Goals': TeamGoalsIcon,
  'Licenses': LicensesIcon,
  'Design Resources': DesignResourcesIcon,
  'Guidelines': GuidelinesIcon,
};

const ToolButton = ({ name, onAction }) => {
  const Icon = iconMap[name];
  return (
    <button
      onClick={() => onAction(name)}
      className="flex items-center justify-start gap-2 w-full sm:w-auto flex-1 bg-white hover:bg-gray-50 text-zinc-600 text-base font-normal py-3 px-4 rounded-lg border border-neutral-300 hover:border-neutral-400 transition-all"
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span className="font-inter">{name}</span>
    </button>
  );
};

export const ToolSelector = ({ tools, onAction }) => {
  if (!tools || tools.length === 0) {
    return null;
  }

  const rows = [];
  for (let i = 0; i < tools.length; i += 3) {
    rows.push(tools.slice(i, i + 3));
  }

  return (
    <div className="flex flex-col items-start gap-2 w-full max-w-xl">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex flex-col sm:flex-row gap-2 w-full">
          {row.map((tool) => (
            <ToolButton key={tool.name} name={tool.name} onAction={onAction} />
          ))}
        </div>
      ))}
    </div>
  );
}; 