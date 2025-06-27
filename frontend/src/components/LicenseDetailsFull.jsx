import React, { useState } from 'react';
import { CopyIcon } from './Icons';

export const LicenseDetailsFull = ({ license }) => {
  const [copied, setCopied] = useState(false);

  if (!license) return null;

  const handleCopy = () => {
    const textToCopy = `Login: ${license.login}\nPassword: ${license.password}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-gray-800">{license.service_name}</h3>
        <button
          onClick={handleCopy}
          className="p-1 rounded-md"
          title={copied ? 'Copied!' : 'Copy login & password'}
        >
          <CopyIcon className="w-5 h-5" color={copied ? '#F85A00' : '#42494D'} />
        </button>
      </div>

      {license.login && (
        <div>
          <span className="text-gray-600">Login: </span>
          <span className="text-blue-600">{license.login}</span>
        </div>
      )}
      {license.password && (
        <div>
          <span className="text-gray-600">Password: </span>
          <span className="text-gray-800">{license.password}</span>
        </div>
      )}
    </div>
  );
};

export default LicenseDetailsFull; 