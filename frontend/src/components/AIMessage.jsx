import React from 'react';
import LicenseList from './LicenseList';
import LicenseDetailsFull from './LicenseDetailsFull';
import GoalList from './GoalList';
import { QuickActions } from './QuickActions';
import { ToolSelector } from './ToolSelector';

const componentMap = {
  ToolSelector,
};

const AIMessage = ({ message, onAction }) => {
  const { text, component } = message;
  const Component = component ? componentMap[component.name] : null;

  const renderComponent = () => {
    if (!component) return null;

    const { name, props } = component;
    switch (name) {
      case 'QuickActions':
        return <QuickActions onAction={onAction} {...props} />;
      case 'ToolSelector':
        return <ToolSelector onAction={onAction} {...props} />;
      case 'GoalList':
        return <GoalList {...props} />;
      case 'LicenseList':
        return <LicenseList {...props} />;
      case 'LicenseDetailsFull':
        return <LicenseDetailsFull {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[564px] w-fit flex flex-col items-start gap-2">
      {text && (
        <p className="text-base font-normal font-inter text-gray-800">{text}</p>
      )}
      {renderComponent()}
    </div>
  );
};

export default AIMessage; 