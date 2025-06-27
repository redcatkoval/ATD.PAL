import React from 'react';

const TextBlock = ({ title, paragraph }) => {
  return (
    <div className="self-stretch flex flex-col justify-start items-center gap-3">
      <h1 className="self-stretch text-center text-textColor text-3xl font-bold font-['Montserrat'] leading-10">
        {title}
      </h1>
      <p className="self-stretch text-center text-textColor text-base font-normal font-['Inter'] leading-normal">
        {paragraph}
      </p>
    </div>
  );
};

export default TextBlock; 