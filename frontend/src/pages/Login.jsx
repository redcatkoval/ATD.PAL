import React from 'react';
import Logo from '../components/Logo';
import LogoSymbol from '../components/LogoSymbol';
import TextBlock from '../components/TextBlock';
import InputCta from '../components/InputCta';
import Divider from '../components/Divider';
import GoogleCta from '../components/GoogleCta';
import { Link } from 'react-router-dom';

const Login = ({ onLogin }) => {

  const handleSubmit = async (email) => {
    // For now, we'll simulate a login and call onLogin with a dummy token
    // In a real app, you would fetch from '/api/login'
    console.log('Login email:', email);
    if (email) { // Basic check
        onLogin('dummy-token');
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
    // Simulate google login
    onLogin('dummy-google-token');
  };

  return (
    <div className="w-full h-screen bg-white flex flex-col justify-center items-center p-3">
      <div className="w-full max-w-md flex flex-col justify-start items-center gap-6">
        <Logo variant="auth" />
        <div className="mb-[24px]">
          <LogoSymbol />
        </div>
        <TextBlock 
          title="Welcome back!" 
          paragraph="We're happy to see you again. Please log in to continue." 
        />
        <div className="self-stretch flex flex-col gap-6 w-full">
          <InputCta 
            onSubmit={handleSubmit} 
            buttonText="CONTINUE" 
            placeholder="p.koval@autodoc.eu"
          />
          <Divider />
          <GoogleCta onClick={handleGoogleLogin} />
          <div className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-orange-600 hover:text-orange-500">
                Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 