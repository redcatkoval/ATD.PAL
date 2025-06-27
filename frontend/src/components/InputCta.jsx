import React, { useState } from 'react';
import InputWithError from './InputWithError';

const InputCta = ({ 
  onSubmit, 
  buttonText = "CONTINUE", 
  placeholder = "Enter your email address"
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setValue(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Проверка на пустое значение
    if (!value.trim()) {
      setError('Email is required');
      return;
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Проверка домена autodoc.eu
    if (!value.endsWith('@autodoc.eu')) {
      setError('Only @autodoc.eu email addresses are allowed');
      return;
    }
    
    // Если все проверки пройдены
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="self-stretch flex flex-col gap-6">
      <InputWithError 
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        error={error}
        type="email"
      />
      
      <button 
        type="submit"
        className="self-stretch h-12 px-5 py-3 bg-ctaButton rounded-md text-center text-ctaText text-base font-bold font-['Montserrat'] leading-normal"
      >
        {buttonText}
      </button>
    </form>
  );
};

export default InputCta; 