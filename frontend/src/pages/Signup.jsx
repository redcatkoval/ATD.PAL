import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import LogoSymbol from '../components/LogoSymbol';
import TextBlock from '../components/TextBlock';
import InputCta from '../components/InputCta';
import Divider from '../components/Divider';
import GoogleCta from '../components/GoogleCta';

const Signup = ({ onSignup }) => {

  const handleSubmit = (email) => {
    console.log('Signup email:', email);
    // Simulate signup and call onSignup with a dummy token
    if (email) {
      onSignup('dummy-signup-token');
    }
  };

  const handleGoogleSignup = () => {
    console.log('Google signup clicked');
    // Simulate google signup
    onSignup('dummy-google-token');
  };

  return (
    <div className="w-full h-screen bg-white flex flex-col justify-center items-center p-3">
      <div className="w-full max-w-md flex flex-col justify-start items-center gap-6">
        <div className="mb-[24px]">
          <LogoSymbol />
        </div>
        <TextBlock 
          title="Hello, I'm your assistant!" 
          paragraph="Focus on what matters! I am your information hub that will handle the routine and provide the data you need for your work." 
        />
        <div className="self-stretch flex flex-col gap-6 w-full">
          <InputCta 
            onSubmit={handleSubmit} 
            buttonText="CREATE ACCOUNT" 
            placeholder="Enter your email address"
          />
          <Divider />
          <GoogleCta onClick={handleGoogleSignup} />
          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup; 