import React from 'react';

const Divider = ({ text = "or" }) => {
  return (
    <div className="self-stretch inline-flex justify-center items-center gap-2">
      <div className="flex-1 h-px relative">
        <div className="w-full h-px left-0 top-0 absolute bg-dividerLine"></div>
      </div>
      <div className="justify-center text-dividerText text-sm font-normal font-['Inter'] leading-tight">
        {text}
      </div>
      <div className="flex-1 h-px relative">
        <div className="w-full h-px left-0 top-0 absolute bg-dividerLine"></div>
      </div>
    </div>
  );
};

export default Divider; 