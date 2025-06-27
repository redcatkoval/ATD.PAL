import React, { useState } from 'react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt with:', { email, password });
    // Here you would typically handle authentication
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-96 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-zinc-900 text-sm font-medium font-['Inter']">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
          placeholder="Enter your email"
          required
        />
      </div>
      
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-zinc-900 text-sm font-medium font-['Inter']">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
          placeholder="Enter your password"
          required
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center">
          <input
            id="remember"
            type="checkbox"
            className="w-4 h-4 text-orange-600 border-zinc-300 rounded focus:ring-orange-600"
          />
          <label htmlFor="remember" className="ml-2 text-sm text-zinc-700 font-['Inter']">
            Remember me
          </label>
        </div>
        <a href="#" className="text-sm text-orange-600 hover:text-orange-700 font-['Inter']">
          Forgot password?
        </a>
      </div>
      
      <button
        type="submit"
        className="mt-4 w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium font-['Inter']"
      >
        Sign in
      </button>
      
      <p className="text-center text-sm text-zinc-700 mt-4 font-['Inter']">
        Don't have an account?{' '}
        <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
          Sign up
        </a>
      </p>
    </form>
  );
};

export default LoginForm; 