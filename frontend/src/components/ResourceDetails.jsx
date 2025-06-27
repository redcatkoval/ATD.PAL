import React from 'react';

export const ResourceDetails = ({ resource }) => {
  return (
    <>
      <p className="text-gray-800">
        <span className="font-bold">{resource.title}:</span> {resource.description}
      </p>
      <a href={resource.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {resource.url}
      </a>
    </>
  );
}; 