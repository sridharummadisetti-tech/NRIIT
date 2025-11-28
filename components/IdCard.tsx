import React from 'react';
import { User, StudentData } from '../types';

interface IdCardProps {
  user: User;
  studentData: StudentData;
  onClose: () => void;
}

const getStudentYear = (studentData: StudentData | undefined): number => {
    if (!studentData) return 1;
    if (studentData.year4_1 || studentData.year4_2) return 4;
    if (studentData.year3_1 || studentData.year3_2) return 3;
    if (studentData.year2_1 || studentData.year2_2) return 2;
    return 1;
};

const IdCard: React.FC<IdCardProps> = ({ user, studentData, onClose }) => {
    const currentYear = getStudentYear(studentData);
    const yearSuffix = currentYear === 1 ? 'st' : currentYear === 2 ? 'nd' : currentYear === 3 ? 'rd' : 'th';
    const yearText = `${currentYear}${yearSuffix} Year`;
  
    const departmentColors = {
        'ECE': 'from-blue-500 to-indigo-600',
        'EVT': 'from-green-500 to-emerald-600',
    };
    const headerBg = departmentColors[user.department as keyof typeof departmentColors] || 'from-gray-500 to-gray-600';


  return (
    <div className="relative w-full max-w-sm font-sans anim-modal-content">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-r ${headerBg} p-4 text-white text-center`}>
          <h1 className="text-xl font-bold tracking-wider">NRI INSTITUTE OF TECHNOLOGY</h1>
          <p className="text-xs opacity-80">Student Identity Card</p>
        </div>
        
        <div className="p-6 relative">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <div className="w-32 h-32 rounded-full bg-white dark:bg-gray-700 p-1.5 shadow-lg">
                    {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-20 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user.rollNumber}</p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</span>
                    <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{user.department}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Year</span>
                    <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{yearText}</span>
                </div>
                 <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</span>
                    <span className="text-base font-semibold text-gray-800 dark:text-gray-100 text-right break-words">{user.email || 'N/A'}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</span>
                    <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{user.phone || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 text-center text-xs text-gray-400 dark:text-gray-500">
            This card is the property of NRIIT and must be carried at all times.
        </div>
      </div>
       <button onClick={onClose} className="absolute -top-4 -right-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-full w-10 h-10 flex items-center justify-center shadow-lg btn-interactive">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default IdCard;