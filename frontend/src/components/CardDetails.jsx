import React from 'react';
import { FilePdfIcon } from './Icons';

export const CardDetails = ({ card }) => {
  return (
    <>
      <p className="text-gray-800 mb-2">{card.text}</p>
      <div className="space-y-1">
        {card.files.map((file, index) => (
          <a
            key={index}
            href={file.url}
            className="flex items-center text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FilePdfIcon className="mr-2 flex-shrink-0" />
            <span className="break-all">{file.name}</span>
          </a>
        ))}
      </div>
    </>
  );
}; 