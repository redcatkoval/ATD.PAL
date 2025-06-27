import React from 'react';
import { LicenseDetails } from './LicenseDetails';

export const LicenseList = ({ licenses, onLicenseSelect }) => {
  // Mock data for demonstration purposes
  const mockLicenses = [
    {
      id: 1,
      service_name: 'OpenAI API',
      description: 'API for accessing GPT models.'
    },
    {
      id: 2,
      service_name: 'Google Cloud Platform',
      description: 'Suite of cloud computing services.'
    },
    {
      id: 3,
      service_name: 'Figma',
      description: 'Collaborative interface design tool.'
    }
  ];

  const displayLicenses = licenses && licenses.length > 0 ? licenses : mockLicenses;

  return (
    <div className="space-y-1">
      {displayLicenses.map((license) => (
        <button 
          key={license.id} 
          onClick={() => onLicenseSelect && onLicenseSelect(license)}
          className="text-left w-full p-2 rounded-md hover:bg-gray-100"
        >
          <LicenseDetails license={license} />
        </button>
      ))}
    </div>
  );
};

export default LicenseList; 