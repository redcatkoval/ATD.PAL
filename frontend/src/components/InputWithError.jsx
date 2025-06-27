import React from 'react';

const InputWithError = ({ 
  value, 
  onChange, 
  placeholder = "Enter your email address here", 
  error = null,
  type = "text"
}) => {
  return (
    <div className="self-stretch rounded-md inline-flex flex-col justify-start items-start gap-1">
      <div className={`self-stretch p-3 bg-white rounded-md outline outline-1 outline-offset-[-1px] ${error ? 'outline-errorBorder' : 'outline-inputBorder'} inline-flex justify-start items-center gap-1`}>
        <input 
          type={type}
          value={value}
          onChange={onChange}
          className="flex-1 text-zinc-900 text-base font-normal font-['Inter'] leading-normal outline-none placeholder:text-inputText"
          placeholder={placeholder}
        />
      </div>
      {error && (
        <div className="self-stretch inline-flex justify-start items-center gap-0.5 mt-1">
          <div className="flex justify-start items-center">
            <div className="w-4 h-4 relative">
              <svg width="16" height="16" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8,1.77c.18,0,.35.1.44.25l6.5,11.5c.09.15.09.34,0,.5-.09.15-.25.25-.43.25H1.5c-.18,0-.34-.09-.43-.25-.09-.15-.09-.34,0-.5L7.56,2.02c.09-.16.26-.25.44-.25ZM7.5,5.77v4h1v-4h-1ZM8,12.27c.41,0,.75-.34.75-.75s-.34-.75-.75-.75-.75.34-.75.75.34.75.75.75Z" fill="#F5412E" />
              </svg>
            </div>
          </div>
          <div className="flex-1 justify-start text-errorText text-[14px] font-normal font-['Inter'] leading-tight ml-0.5">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputWithError; 