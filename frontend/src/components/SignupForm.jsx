import React, { useState } from 'react';
import InputWithError from './InputWithError';

const SignupForm = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);

  const validateEmail = (email) => {
    // Проверяем, что email заканчивается на autodoc.eu
    if (!email.toLowerCase().endsWith('autodoc.eu')) {
      return "Please, check your email. Autodoc employees only";
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    
    setEmailError(null);
    if (onSubmit) {
      onSubmit({ email });
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="self-stretch flex flex-col gap-6">
      <InputWithError
        type="email"
        value={email}
        onChange={handleEmailChange}
        placeholder="Enter your email address here"
        error={emailError}
      />
      
      <button 
        type="submit"
        className="self-stretch h-12 px-5 py-3 bg-ctaButton rounded-md inline-flex justify-center items-center gap-2"
      >
        <span className="text-center text-ctaText text-base font-bold font-['Montserrat'] leading-normal">
          SIGN UP
        </span>
      </button>
    </form>
  );
};

export default SignupForm; 