import React from 'react';

export const BookList = ({ books }) => {
  return (
    <ul className="list-disc list-outside pl-5 space-y-2">
      {books.map((book, index) => (
        <li key={index} className="text-gray-800">
          <p className="font-bold">{book.author}</p>
          <p>{book.title} | {book.language}</p>
          <a href={book.url} className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer">
            {book.url}
          </a>
        </li>
      ))}
    </ul>
  );
}; 