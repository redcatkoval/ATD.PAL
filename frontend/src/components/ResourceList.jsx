import React from 'react';

export const ResourceList = ({ resources }) => {
  return (
    <ul className="list-disc list-outside pl-5 space-y-2">
      {resources.map((resource, index) => (
        <li key={index} className="text-gray-800">
          <span className="font-bold">{resource.title}:</span> {resource.description}
          <a href={resource.url} className="text-blue-600 hover:underline block" target="_blank" rel="noopener noreferrer">
            {resource.url}
          </a>
        </li>
      ))}
    </ul>
  );
}; 