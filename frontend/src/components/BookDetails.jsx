import React from 'react';

export const BookDetails = ({ book }) => {
  return (
    <>
      <p className="font-bold">{book.author}</p>
      <p>{book.title} | {book.language}</p>
      <a href={book.url} className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer">
        {book.url}
      </a>
    </>
  );
}; 