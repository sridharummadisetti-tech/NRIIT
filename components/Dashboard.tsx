

import React, { useState } from 'react';
import { User, Role, StudentData, ParsedAttendanceRecord, SectionTimeTable, Notice } from '../types';
import StudentView, { StudentViewType } from './StudentView';
import StaffView from './StaffView';
import Chatbot from './Chatbot';
import { SuperAdminView } from './SuperAdminView';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  users: User[];
  studentData: StudentData[];
  timetables: SectionTimeTable[];
  notices: Notice[];
  periodTimes: string[];
  departments: string[];
  theme: 'light' | 'dark' | 'system';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark' | 'system'>>;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
  onUpdateStudentData: (data: StudentData) => void;
  onUpdateMultipleStudentData: (data: StudentData[]) => void;
  onAddStudent: (user: User, data: StudentData) => void;
  onAddStaff: (user: User) => void;
  onAddMultipleStudents: (newUsers: User[], newStudentDataItems: StudentData[]) => void;
  onUpdateMultipleAttendance: (updates: ParsedAttendanceRecord[]) => void;
  onUpdatePassword: (userId: number, currentPass: string, newPass: string) => 'SUCCESS' | 'INCORRECT_PASSWORD';
  onUpdateTimetable: (timetable: SectionTimeTable) => void;
  onUpdatePeriodTimes: (newTimes: string[]) => void;
  onAddNotice: (newNotice: Omit<Notice, 'id'>) => void;
  onDeleteNotice: (noticeId: number) => void;
  onAddDepartment: (newDepartment: string) => void;
  onUpdateDepartment: (oldName: string, newName: string) => void;
  onDeleteDepartment: (departmentName: string) => void;
  onBiometricSetup: (user: User) => Promise<boolean>;
}

// --- ICONS (moved from StudentView) ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>;
const AcademicCapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.48l8.705-4.247a1 1 0 00-.211-1.84l-7-3zM10 11.586l-7-3.419V14a1 1 0 001 1h12a1 1 0 001-1V8.167l-7 3.419z" /></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>;
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" /></svg>;


const Dashboard: React.FC<DashboardProps> = (props) => {
  const { 
      user, onLogout, users, studentData, timetables, notices, periodTimes, departments, theme, setTheme, 
      onUpdateUser, onDeleteUser, onUpdateStudentData, onUpdateMultipleStudentData, onAddStudent, onAddStaff, onAddMultipleStudents, 
      onUpdateMultipleAttendance, onUpdatePassword, onUpdateTimetable, onUpdatePeriodTimes, onAddNotice, 
      onDeleteNotice, onAddDepartment, onUpdateDepartment, onDeleteDepartment, onBiometricSetup
  } = props;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeStudentView, setActiveStudentView] = useState<StudentViewType>('overview');

  const studentNavigationItems: { id: StudentViewType, label: string, icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { id: 'todays_attendance', label: "Today's Schedule", icon: <CalendarIcon /> },
    { id: 'attendance_history', label: 'Attendance', icon: <ChartBarIcon /> },
    { id: 'academics', label: 'Academics', icon: <AcademicCapIcon /> },
    { id: 'fees', label: 'Fees', icon: <CreditCardIcon /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarIcon /> },
    { id: 'notices', label: 'Notice Board', icon: <BellIcon /> },
    { id: 'profile_settings', label: 'Profile & Settings', icon: <UserCircleIcon /> },
  ];

  const getStudentDataForUser = (userId: number): StudentData | undefined => {
    return studentData.find(sd => sd.userId === userId);
  };

  const studentDataForUser = getStudentDataForUser(user.id);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };
  
  const renderView = () => {
    switch (user.role) {
      case Role.STUDENT:
        return <StudentView 
            user={user} 
            studentData={studentDataForUser} 
            timetables={timetables} 
            notices={notices}
            periodTimes={periodTimes}
            onUpdatePassword={onUpdatePassword}
            onUpdateUser={onUpdateUser}
            activeView={activeStudentView}
            setActiveView={setActiveStudentView}
            onBiometricSetup={onBiometricSetup}
        />;
      case Role.STAFF:
        return <StaffView 
            currentUser={user}
            users={users}
            allStudentData={studentData}
            timetables={timetables}
            notices={notices}
            periodTimes={periodTimes}
            onUpdateUser={onUpdateUser}
            onUpdateStudentData={onUpdateStudentData}
            onUpdateMultipleStudentData={onUpdateMultipleStudentData}
            onAddStudent={onAddStudent}
            onAddMultipleStudents={onAddMultipleStudents}
            onUpdateMultipleAttendance={onUpdateMultipleAttendance}
            onUpdateTimetable={onUpdateTimetable}
            onUpdatePeriodTimes={onUpdatePeriodTimes}
            onAddNotice={onAddNotice}
            onDeleteNotice={onDeleteNotice}
            onBiometricSetup={onBiometricSetup}
        />;
      case Role.SUPER_ADMIN:
        return <SuperAdminView
            currentUser={user}
            users={users}
            departments={departments}
            onAddStaff={onAddStaff}
            onUpdateUser={onUpdateUser}
            onDeleteUser={onDeleteUser}
            onAddDepartment={onAddDepartment}
            onUpdateDepartment={onUpdateDepartment}
            onDeleteDepartment={onDeleteDepartment}
            studentData={studentData}
            onAddStudent={onAddStudent}
            onUpdateStudentData={onUpdateStudentData}
            onAddMultipleStudents={onAddMultipleStudents}
            periodTimes={periodTimes}
            onBiometricSetup={onBiometricSetup}
        />;
      default:
        return <div>Invalid user role.</div>;
    }
  };

  return (
    <div className="relative min-h-screen">
       {/* Sidebar for Student */}
      {user.role === Role.STUDENT && (
        <>
          <div 
              className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsSidebarOpen(false)}
          />
          <aside 
              className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
             <div className="p-4 pt-20 h-full overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 px-3">Student Panel</h2>
              <nav>
                <ul className="space-y-1">
                  {studentNavigationItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveStudentView(item.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                          activeStudentView === item.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        </>
      )}

      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
           <div className="flex items-center">
            {user.role === Role.STUDENT && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Toggle menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome, {user.name}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
             <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              aria-label="Toggle theme"
            >
              {isDark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        {renderView()}
      </main>
      {user.role === Role.STUDENT && <Chatbot user={user} studentData={studentDataForUser} />}
    </div>
  );
};

export default Dashboard;
