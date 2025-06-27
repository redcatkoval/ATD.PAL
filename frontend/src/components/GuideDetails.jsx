import React from 'react';

const parseStep = (step) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = step.split(urlRegex);
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a key={index} href={part} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    {part}
                </a>
            );
        }
        return part;
    });
};

export const GuideDetails = ({ guide }) => {
  return (
    <ol className="list-decimal list-outside pl-5 space-y-2">
      {guide.steps.map((step, index) => (
        <li key={index} className="text-gray-800 pl-2">
          {parseStep(step)}
        </li>
      ))}
    </ol>
  );
}; 