import React from 'react';

export const LicenseDetails = ({ license }) => {
  return (
    <>
      <p className="font-bold">{license.service_name}</p>
      <p>{license.description}</p>
    </>
  );
}; 