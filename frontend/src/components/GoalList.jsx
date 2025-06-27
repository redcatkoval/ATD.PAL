import React from 'react';
import GoalDetails from './GoalDetails';

const mockGoals = [
  {
    id: 1,
    term: 'Long-term',
    priority: 3,
    status: 'In Progress',
    title: 'Оптимизировать процесс дизайн-ревью',
    description: 'Сократить время на согласование дизайн-решений. Интервью с ключевыми пользователями для выявления болевых точек',
    due_date: '2025-10-30',
    benefit: 'Benefit Low',
    author_email: 'i.fedotov@autodoc.eu',
  },
  {
    id: 2,
    term: 'Short-term',
    priority: 1,
    status: 'Complete',
    title: 'Оптимизировать процесс дизайн-ревью',
    description: '',
    due_date: '2025-10-30',
    benefit: 'Benefit Medium',
    author_email: 'l.shlopak@autodoc.eu',
  },
  {
    id: 3,
    term: 'Long-term',
    priority: 3,
    status: 'Waiting',
    title: 'Обновить дизайн-систему',
    description: 'Нужно привести инструкции к типографически правильному варианту, соблюдая все правила типографики по отступам, заголовкам и подзаголовкам. Настроить правильный шаблон в InDesign. +++ Переделать инструкции в соответствии с правилами акссессабилити https://jira.autodoc.de/browse/BP-1569',
    due_date: null,
    benefit: null,
    author_email: 'a.veryovkina@autodoc.eu',
  },
  {
    id: 4,
    term: 'Pay Attention',
    priority: 2,
    status: 'In Progress',
    title: 'Типографически правильные инструкции + Creating accessible instruction',
    description: 'Сократить время на согласование дизайн-решений. Интервью с ключевыми пользователями для выявления болевых точек',
    due_date: '2025-10-30',
    benefit: 'Benefit Strong',
    author_email: 'a.veryovkina@autodoc.eu',
  },
];

const GoalList = ({ goals }) => {
  const goalList = goals || mockGoals;
  if (!goalList || goalList.length === 0) {
    return <p>No goals found.</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
      {goalList.map((goal) => (
        <div key={goal.id} className="p-4">
          <GoalDetails goal={goal} />
        </div>
      ))}
    </div>
  );
};

export default GoalList; 