import React from 'react';

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, children, actions }) => {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-lg card-interactive">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h3>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className="px-4 py-5 sm:p-6 relative">{children}</div>
    </div>
  );
};

export default InfoCard;