import React from 'react';
import { FireIcon } from './Icons';

const StatusBadge = ({ status }) => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
  let statusClasses = '';

  switch (status) {
    case 'Complete':
      statusClasses = 'bg-green-200 text-green-800';
      break;
    case 'In Progress':
    case 'Waiting':
      statusClasses = 'bg-gray-200 text-gray-800';
      break;
    default:
      statusClasses = 'bg-gray-100 text-gray-600';
  }

  return <span className={`${baseClasses} ${statusClasses}`}>{status}</span>;
};

const PriorityIcons = ({ priority }) => {
  return (
    <div className="flex items-center">
      {[...Array(3)].map((_, i) => (
        <span key={i} className={`text-lg ${i < priority ? 'opacity-100' : 'opacity-30'}`}>🔥</span>
      ))}
    </div>
  );
};

const TermDisplay = ({ term }) => {
    if (!term) return null;
    let termColor = '';
    switch (term) {
        case 'Long-term':
            termColor = 'text-gray-700';
            break;
        case 'Short-term':
            termColor = 'text-green-500';
            break;
        case 'Pay Attention':
            termColor = 'text-red-500';
            break;
        default:
            termColor = 'text-gray-700';
    }
    return <span className={`font-semibold ${termColor}`}>{term}</span>
}

const BenefitDisplay = ({ benefit }) => {
    if (!benefit) return null;
    let benefitColor = '';
    switch (benefit) {
        case 'Benefit Strong':
            benefitColor = 'text-red-500';
            break;
        case 'Benefit Medium':
            benefitColor = 'text-yellow-500';
            break;
        case 'Benefit Low':
            benefitColor = 'text-blue-500';
            break;
        default:
            benefitColor = 'text-gray-500';
    }
    return <span className={`font-semibold ${benefitColor}`}>{benefit}</span>
}

const GoalDetails = ({ goal }) => {
  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <TermDisplay term={goal.term} />
          <span>|</span>
          <PriorityIcons priority={goal.priority} />
        </div>
        <StatusBadge status={goal.status} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{goal.title}</h3>
      {goal.description && <p className="text-gray-600 text-sm mb-3 whitespace-pre-wrap">{goal.description}</p>}
      <div className="flex items-center gap-4 text-gray-500 text-sm">
        {goal.due_date && <span>due_date: {goal.due_date}</span>}
        {goal.due_date && goal.benefit && <span>|</span>}
        <BenefitDisplay benefit={goal.benefit} />
      </div>
      {goal.author_email && <p className="text-gray-800 text-sm mt-1">{goal.author_email}</p>}
    </div>
  );
};

export default GoalDetails; 