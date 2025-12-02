
import React, { useState, useEffect, useRef } from 'react';
import { StudentData, User, YearMarks, MarkItem, AttendanceRecord, ImportantUpdate, MidTermMarks, MidTermSubject, FeeInstallment, YearlyFee, SectionTimeTable, DailySchedule, Notice, DailyAttendanceStatus, WeeklyTimeTable, CourseMaterial, GeoLocation } from '../types';
import { GRADE_POINTS } from '../constants';
import InfoCard from './InfoCard';
import IdCard from './IdCard';

export type StudentViewType = 'overview' | 'todays_attendance' | 'attendance_history' | 'academics' | 'fees' | 'timetable' | 'notices' | 'profile_settings' | 'materials' | 'live_location';

const MERGED_CELL = '::MERGED::';

// --- HELPER FUNCTIONS ---

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const getStudentYear = (studentData: StudentData | undefined): number => {
    if (!studentData) return 1;
    if (studentData.year4_1 || studentData.year4_2) return 4;
    if (studentData.year3_1 || studentData.year3_2) return 3;
    if (studentData.year2_1 || studentData.year2_2) return 2;
    return 1;
};

const getLatestYearKey = (studentData: StudentData | undefined): string | null => {
    if (!studentData) return 'year1_1';
    const yearKeys: (keyof StudentData)[] = ['year4_2', 'year4_1', 'year3_2', 'year3_1', 'year2_2', 'year2_1', 'year1_2', 'year1_1', 'mid_2', 'mid_1'];
    return yearKeys.find(key => studentData[key]) || 'year1_1';
};

const calculateOverallAttendance = (records: AttendanceRecord[]): number => {
    if (!records || records.length === 0) return 0;
    const totalPresent = records.reduce((acc, r) => acc + r.present, 0);
    const totalWorkingDays = records.reduce((acc, r) => acc + r.total, 0);
    return totalWorkingDays === 0 ? 0 : Math.round((totalPresent / totalWorkingDays) * 100);
};

const calculateSGPA = (marks: YearMarks): string => {
  const allItems = [...marks.subjects, ...marks.labs];
  const totalPoints = allItems.reduce((acc, item) => acc + (GRADE_POINTS[item.grade] ?? 0) * item.credits, 0);
  const totalCredits = allItems.reduce((acc, item) => acc + item.credits, 0);
  return totalCredits === 0 ? 'N/A' : (totalPoints / totalCredits).toFixed(2);
};

// --- REUSABLE UI COMPONENTS ---

const ChangePasswordModal: React.FC<{
  onClose: () => void;
  onSubmit: (currentPass: string, newPass: string) => 'SUCCESS' | 'INCORRECT_PASSWORD';
}> = ({ onClose, onSubmit }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = () => {
        setError('');
        setSuccess('');
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        const result = onSubmit(currentPassword, newPassword);
        if (result === 'SUCCESS') {
            setSuccess('Password updated successfully!');
            setTimeout(onClose, 1500);
        } else {
            setError('The current password you entered is incorrect.');
        }
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md anim-modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-center">Change Password</h2>
                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                {success && <p className="text-green-500 text-sm text-center mb-4">{success}</p>}
                <div className="space-y-4">
                    <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Update</button>
                </div>
            </div>
        </div>
    );
};

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onClick: () => void }> = ({ title, children, isOpen, onClick }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button className="w-full flex justify-between items-center text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none btn-interactive" onClick={onClick}>
        <span className="font-medium text-gray-800 dark:text-white">{title}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && <div className="p-4 bg-white dark:bg-gray-800 anim-accordion-content">{children}</div>}
    </div>
);

// --- VIEW COMPONENTS ---

const StudentProfileOverview: React.FC<{ user: User; studentData: StudentData; onIdCardClick: () => void; onSettingsClick: () => void; notices: Notice[] }> = ({ user, studentData, onIdCardClick, onSettingsClick, notices }) => {
    const overallAttendance = calculateOverallAttendance(studentData.monthlyAttendance);
    const totalFees = (Object.values(studentData.fees) as YearlyFee[]).reduce((sum, year) => sum + year.installment1.total + year.installment2.total, 0);
    const totalPaid = (Object.values(studentData.fees) as YearlyFee[]).reduce((sum, year) => sum + year.installment1.paid + year.installment2.paid, 0);
    const feesDue = totalFees - totalPaid;

    const latestYearKey = getLatestYearKey(studentData);
    const latestMarks = latestYearKey && (latestYearKey.startsWith('year') ? studentData[latestYearKey as keyof StudentData] as YearMarks : null);
    const latestSGPA = latestMarks ? calculateSGPA(latestMarks) : 'N/A';
    
    const recentNotices = notices
      .filter(n => n.department === user.department || n.department === 'ALL')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return (
        <div className="space-y-6">
            <InfoCard title="Student Overview">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                         {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.name} className="w-24 h-24 rounded-full object-cover shadow-md" />
                         ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            </div>
                         )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{user.rollNumber}</p>
                        <p className="text-gray-500 dark:text-gray-400">{user.department} - {getStudentYear(studentData)} Year</p>
                        <div className="mt-4 flex gap-4">
                           <button onClick={onIdCardClick} className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 btn-interactive">View ID Card</button>
                           <button onClick={onSettingsClick} className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 btn-interactive">Profile Settings</button>
                        </div>
                    </div>
                </div>
            </InfoCard>

            <InfoCard title="At a Glance">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                    <div><p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{overallAttendance}%</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Overall Attendance</p></div>
                    <div><p className="text-3xl font-bold text-green-600 dark:text-green-400">{latestSGPA}</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Latest SGPA</p></div>
                    <div><p className="text-3xl font-bold text-red-500 dark:text-red-400">₹{feesDue.toLocaleString()}</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Fees Due</p></div>
                </div>
            </InfoCard>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studentData.importantUpdates.length > 0 && (
                    <InfoCard title="Important Updates">
                        <ul className="space-y-3">
                            {studentData.importantUpdates.map((update, index) => (
                                <li key={index} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400">
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">{new Date(update.date).toLocaleDateString()}</p>
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{update.text}</p>
                                </li>
                            ))}
                        </ul>
                    </InfoCard>
                )}

                <InfoCard title="Recent Notices">
                     {recentNotices.length > 0 ? (
                        <ul className="space-y-3">
                            {recentNotices.map((notice) => (
                                <li key={notice.id} className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 border-l-4 border-indigo-400">
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300">{new Date(notice.date).toLocaleDateString()} - by {notice.authorName}</p>
                                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{notice.title}</p>
                                </li>
                            ))}
                        </ul>
                     ) : (
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No recent notices for your department.</p>
                     )}
                </InfoCard>
            </div>
        </div>
    );
};

const TodaysAttendanceContent: React.FC<{ user: User; studentData: StudentData; timetables: SectionTimeTable[]; periodTimes: string[]; }> = ({ user, studentData, timetables, periodTimes }) => {
  const today = new Date();
  const dayIndex = today.getDay();
  const days: (keyof WeeklyTimeTable)[] = ['saturday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = days[dayIndex];
  const dateKey = today.toISOString().split('T')[0];

  const studentTimetable = timetables.find(tt => tt.department === user.department && tt.year === getStudentYear(studentData) && tt.section === user.section);
  const dailySchedule = studentTimetable?.timetable[currentDayName];
  const dailyAttendanceRecord = studentData?.dailyAttendance?.[dateKey];

  if (!dailySchedule || dailySchedule.every(period => !period)) {
    return <InfoCard title="Today's Schedule"><p className="text-center text-gray-500 dark:text-gray-400 py-4">No classes scheduled for today.</p></InfoCard>;
  }

  const getStatusChip = (status: DailyAttendanceStatus) => {
    switch(status) {
      case 'Present': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Present</span>;
      case 'Absent': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Absent</span>;
      default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">Not Marked</span>;
    }
  };

  const renderScheduleRows = () => {
    const rows: React.ReactElement[] = [];
    for (let i = 0; i < dailySchedule.length; i++) {
        const subject = dailySchedule[i];
        if (!subject) continue;
        if (subject === MERGED_CELL) continue;

        let span = 1;
        while (i + span < dailySchedule.length && dailySchedule[i + span] === MERGED_CELL) {
            span++;
        }
        
        // Approximate time: Start of first period to end of last period
        // Format: "09:30 - 10:20" => split by ' - '
        // periodTimes[i] is "HH:MM - HH:MM"
        const startTimeStr = periodTimes[i]?.split(' - ')[0] || `P${i+1}`;
        const endTimeStr = periodTimes[i + span - 1]?.split(' - ')[1] || `P${i+span}`;
        const timeLabel = span > 1 ? `${startTimeStr} - ${endTimeStr}` : periodTimes[i];

        const status = dailyAttendanceRecord ? dailyAttendanceRecord[i] : 'Not Marked';

        rows.push(
            <tr key={i} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <th scope="row" className="py-2 px-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{timeLabel}</th>
                <td className="py-2 px-4">{subject}</td>
                <td className="py-2 px-4">{getStatusChip(status)}</td>
            </tr>
        );
    }
    return rows;
  };

  return (
    <InfoCard title={`Today's Schedule (${today.toLocaleDateString('en-US', { weekday: 'long' })})`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400 timetable-animate">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="py-2 px-4">Time</th>
              <th scope="col" className="py-2 px-4">Subject</th>
              <th scope="col" className="py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {renderScheduleRows()}
          </tbody>
        </table>
      </div>
    </InfoCard>
  );
};

const AttendanceHistoryContent: React.FC<{ studentData: StudentData }> = ({ studentData }) => {
    const overallAttendance = calculateOverallAttendance(studentData.monthlyAttendance);
    return (
        <InfoCard title="Attendance History">
            <p className="text-xl mb-4 font-semibold">{overallAttendance}% Overall</p>
            <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                        <tr>
                            <th scope="col" className="py-2 px-4">Month & Year</th>
                            <th scope="col" className="py-2 px-4">Present</th>
                            <th scope="col" className="py-2 px-4">Total Days</th>
                            <th scope="col" className="py-2 px-4">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentData.monthlyAttendance.length > 0 ? (
                            studentData.monthlyAttendance.map((record, index) => {
                                const percentage = record.total > 0 ? Math.round((record.present / record.total) * 100) : 0;
                                return (
                                    <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <th scope="row" className="py-2 px-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{record.month} {record.year}</th>
                                        <td className="py-2 px-4">{record.present}</td>
                                        <td className="py-2 px-4">{record.total}</td>
                                        <td className="py-2 px-4 font-semibold">{percentage}%</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">No attendance records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </InfoCard>
    );
};

// Fix: Implement local components to return JSX instead of void.
const GradeDisplay: React.FC<{ item: MarkItem }> = ({ item }) => <div>{item.name}: {item.grade}</div>;
const MarksView: React.FC<{ marks: YearMarks }> = ({ marks }) => <div>{marks.subjects.map((s,i)=><GradeDisplay key={i} item={s}/>)}</div>;
const MidTermMarksView: React.FC<{ marks: MidTermMarks }> = ({ marks }) => <div>{marks.subjects.map((s,i)=><p key={i}>{s.name}: {s.score}/{s.maxScore}</p>)}</div>;

const AcademicRecordsContent: React.FC<{ studentData: StudentData }> = ({ studentData }) => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(() => getLatestYearKey(studentData));
    const academicPeriods = { mid_1: "Mid-Term 1", mid_2: "Mid-Term 2", year1_1: "YEAR(1-1)", year1_2: "YEAR(1-2)", year2_1: "YEAR(2-1)", year2_2: "YEAR(2-2)", year3_1: "YEAR(3-1)", year3_2: "YEAR(3-2)", year4_1: "YEAR(4-1)", year4_2: "YEAR(4-2)" };

    return (
        <InfoCard title="Academic Records">
            <div className="space-y-4">
                 {(Object.keys(academicPeriods) as (keyof typeof academicPeriods)[]).map((key) => {
                    const data = studentData[key];
                    if (!data || (Array.isArray((data as any).subjects) && (data as any).subjects.length === 0)) return null;
                    return (
                      <AccordionItem key={key} title={academicPeriods[key]} isOpen={openAccordion === key} onClick={() => setOpenAccordion(openAccordion === key ? null : key)}>
                        {key.startsWith('mid') ? <MidTermMarksView marks={data as MidTermMarks} /> : <MarksView marks={data as YearMarks} />}
                      </AccordionItem>
                    );
                })}
            </div>
        </InfoCard>
    );
};

const TimetableView: React.FC<{ user: User, timetables: SectionTimeTable[], studentData: StudentData, periodTimes: string[] }> = ({ user, timetables, studentData, periodTimes }) => {
    const studentTimetable = timetables.find(tt => tt.department === user.department && tt.year === getStudentYear(studentData) && tt.section === user.section);
    const schedule = studentTimetable?.timetable;
    const days: (keyof WeeklyTimeTable)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    if (!schedule) {
        return <InfoCard title="Weekly Timetable"><p className="text-center text-gray-500">Your timetable is not available yet.</p></InfoCard>;
    }
    
    const renderTableBody = () => {
        return days.map(day => {
            const cells: React.ReactElement[] = [];
            const daySchedule = schedule[day];
            
            for (let i = 0; i < daySchedule.length; i++) {
                const subject = daySchedule[i];
                if (subject === MERGED_CELL) continue;
                
                let colSpan = 1;
                while (i + colSpan < daySchedule.length && daySchedule[i + colSpan] === MERGED_CELL) {
                    colSpan++;
                }

                cells.push(
                    <td key={i} colSpan={colSpan} className="p-2 border border-gray-200 dark:border-gray-700 text-center align-middle">
                        {subject || '-'}
                    </td>
                );
            }

            return (
                <tr key={day}>
                    <th className="capitalize p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">{day}</th>
                    {cells}
                </tr>
            );
        });
    };

    return (
        <InfoCard title="Weekly Timetable">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-center border-collapse border border-gray-200 dark:border-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-2 border border-gray-200 dark:border-gray-700">Day</th>
                            {periodTimes.map((time, index) => <th key={index} className="p-2 border border-gray-200 dark:border-gray-700">P{index+1}<br/>({time})</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {renderTableBody()}
                    </tbody>
                </table>
            </div>
        </InfoCard>
    );
};

const LiveLocationView: React.FC<{ 
    user: User, 
    onUpdateLocation: (userId: number, location: GeoLocation) => void,
    studentData: StudentData
}> = ({ user, onUpdateLocation, studentData }) => {
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState('');
    const [lastPosition, setLastPosition] = useState<{lat: number, lng: number} | null>(null);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        // Initialize sharing state from existing student data if available
        if (studentData.location?.isSharing) {
            setIsSharing(true);
            setLastPosition({ lat: studentData.location.lat, lng: studentData.location.lng });
        }
    }, []);

    useEffect(() => {
        if (isSharing) {
            if (!navigator.geolocation) {
                setError('Geolocation is not supported by your browser');
                return;
            }

            const success = (position: GeolocationPosition) => {
                const newLocation: GeoLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    lastUpdated: new Date().toISOString(),
                    isSharing: true
                };
                setLastPosition({ lat: newLocation.lat, lng: newLocation.lng });
                onUpdateLocation(user.id, newLocation);
                setError('');
            };

            const error = () => {
                setError('Unable to retrieve your location. Please check permissions.');
                setIsSharing(false);
            };

            watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        } else {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            // If we turn off sharing, send an update to server that isSharing is false
            if (studentData.location?.isSharing) {
                 onUpdateLocation(user.id, { 
                     lat: 0, 
                     lng: 0, 
                     lastUpdated: new Date().toISOString(), 
                     isSharing: false 
                 });
            }
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [isSharing, user.id]);

    return (
        <InfoCard title="Live Location Sharing">
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isSharing ? 'bg-green-100 dark:bg-green-900/30 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 transition-colors duration-300 ${isSharing ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {isSharing && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20 animate-ping"></span>
                    )}
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isSharing ? 'You are Sharing your Location' : 'Location Sharing is Off'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                        {isSharing 
                            ? 'Staff members can currently see your live location on the campus map.' 
                            : 'Enable this to allow staff to view your current location on campus for safety or attendance purposes.'}
                    </p>
                </div>

                {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded">{error}</p>}

                <button
                    onClick={() => setIsSharing(!isSharing)}
                    className={`px-8 py-3 rounded-full font-bold shadow-lg transform transition hover:scale-105 active:scale-95 ${
                        isSharing 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                    {isSharing ? 'Stop Sharing' : 'Start Sharing Location'}
                </button>

                {isSharing && lastPosition && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono">
                        <p>Lat: {lastPosition.lat.toFixed(6)}</p>
                        <p>Lng: {lastPosition.lng.toFixed(6)}</p>
                        <p className="text-gray-400 mt-1">Last Updated: {new Date().toLocaleTimeString()}</p>
                    </div>
                )}
            </div>
        </InfoCard>
    );
};

const ProfileSettingsView: React.FC<{ user: User; onUpdateUser: (user: User) => void; onUpdatePassword: (userId: number, currentPass: string, newPass: string) => 'SUCCESS' | 'INCORRECT_PASSWORD'; onBiometricSetup: (user: User) => Promise<boolean>; }> = ({ user, onUpdateUser, onUpdatePassword, onBiometricSetup }) => {
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [editedUser, setEditedUser] = useState<User>(user);
    const [feedback, setFeedback] = useState('');
    const [biometricFeedback, setBiometricFeedback] = useState('');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const url = await fileToDataUrl(e.target.files[0]);
            setEditedUser(prev => ({ ...prev, photoUrl: url }));
        }
    };
    
    const handleSave = () => {
        onUpdateUser(editedUser);
        setFeedback('Profile updated successfully!');
        setTimeout(() => setFeedback(''), 3000);
    };

    const handleBiometricEnable = async () => {
        setBiometricFeedback('Processing...');
        const success = await onBiometricSetup(user);
        if (success) {
            setBiometricFeedback('Biometric authentication enabled successfully!');
        } else {
            setBiometricFeedback('Failed to enable biometrics. Please ensure your device supports it.');
        }
        setTimeout(() => setBiometricFeedback(''), 5000);
    };

    return (
        <div className="space-y-6">
            <InfoCard title="Edit Profile">
                 <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <img src={editedUser.photoUrl || `https://placehold.co/400x400/7c3aed/FFFFFF/png?text=${user.name.charAt(0)}`} alt="Profile" className="w-32 h-32 rounded-full object-cover"/>
                        <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </label>
                        <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                    <div className="w-full max-w-sm space-y-4">
                        <input type="text" value={editedUser.email || ''} onChange={e => setEditedUser(prev => ({...prev, email: e.target.value}))} placeholder="Email" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" value={editedUser.phone || ''} onChange={e => setEditedUser(prev => ({...prev, phone: e.target.value}))} placeholder="Phone" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 btn-interactive">Save Changes</button>
                    {feedback && <p className="text-green-500 text-sm">{feedback}</p>}
                </div>
            </InfoCard>
            <InfoCard title="Security">
                <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Password Management</span>
                        <button onClick={() => setShowChangePassword(true)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 btn-interactive">Change Password</button>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                        <div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium block">Biometric Security</span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">Login with Fingerprint or Face ID</span>
                        </div>
                        <button onClick={handleBiometricEnable} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 btn-interactive flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.5-4m1.5 8l.054-.09A13.916 13.916 0 008 11a4 4 0 00-.05-1.5m3.44-2.04L11.3 7.3" />
                             </svg>
                            Enable / Register
                        </button>
                    </div>
                     {biometricFeedback && <p className={`text-sm ${biometricFeedback.includes('Success') ? 'text-green-500' : 'text-blue-500'}`}>{biometricFeedback}</p>}
                </div>
            </InfoCard>
            {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} onSubmit={(current, newP) => onUpdatePassword(user.id, current, newP)} />}
        </div>
    );
};

const FeeStatusContent: React.FC<{ studentData: StudentData }> = ({ studentData }) => {
    const [openFeeYear, setOpenFeeYear] = useState<string | null>(() => `year${getStudentYear(studentData)}`);
    const feeSummary = (Object.values(studentData.fees) as YearlyFee[]).reduce((acc, year) => {
      acc.total += year.installment1.total + year.installment2.total;
      acc.paid += year.installment1.paid + year.installment2.paid;
      return acc;
    }, { total: 0, paid: 0 });
    return <InfoCard title="Fee Status"><p>Total Due: ₹{(feeSummary.total - feeSummary.paid).toLocaleString()}</p></InfoCard>;
};
const NoticeBoardContent: React.FC<{ notices: Notice[], department: string }> = ({ notices, department }) => {
    const departmentNotices = notices.filter(n => n.department === department || n.department === 'ALL');
    return <InfoCard title="Notice Board"><p>{departmentNotices.length} notices found for your department.</p></InfoCard>;
};

const MaterialsContent: React.FC<{ materials: CourseMaterial[], user: User, studentData: StudentData }> = ({ materials, user, studentData }) => {
    const year = getStudentYear(studentData);
    const relevantMaterials = materials.filter(m => 
        m.department === user.department && 
        m.year === year && 
        m.section === user.section
    );

    const getIcon = (type: string) => {
        if (type === 'pdf') return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
        if (type === 'image') return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>;
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>;
    };

    return (
        <InfoCard title="Course Materials">
            {relevantMaterials.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No materials uploaded for your section yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relevantMaterials.map(material => (
                        <div key={material.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center text-center card-interactive bg-gray-50 dark:bg-gray-700/50">
                            <div className="mb-3">
                                {getIcon(material.fileType)}
                            </div>
                            <h4 className="font-semibold text-lg mb-1">{material.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{material.description}</p>
                            <p className="text-xs text-gray-400 mb-4">Uploaded by {material.uploadedBy} on {material.uploadedAt}</p>
                            <a 
                                href={material.fileUrl} 
                                download={material.fileName} 
                                className="mt-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 w-full"
                            >
                                Download / View
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </InfoCard>
    );
};

// --- MAIN STUDENT VIEW COMPONENT ---

const StudentView: React.FC<StudentViewProps> = ({ user, studentData, timetables, notices, periodTimes, materials, onUpdatePassword, onUpdateUser, activeView, setActiveView, onBiometricSetup, onUpdateLocation }) => {
  const [showIdCard, setShowIdCard] = useState(false);

  useEffect(() => {
    if (activeView === null) {
        setActiveView('overview');
    }
  }, [activeView, setActiveView]);


  const renderActiveView = () => {
    if (!studentData) return <InfoCard title="Error"><p>Student data could not be loaded.</p></InfoCard>;

    switch (activeView) {
      case 'overview': return <StudentProfileOverview user={user} studentData={studentData} onIdCardClick={() => setShowIdCard(true)} onSettingsClick={() => setActiveView('profile_settings')} notices={notices} />;
      case 'todays_attendance': return <TodaysAttendanceContent user={user} studentData={studentData} timetables={timetables} periodTimes={periodTimes} />;
      case 'attendance_history': return <AttendanceHistoryContent studentData={studentData} />;
      case 'academics': return <AcademicRecordsContent studentData={studentData} />;
      case 'fees': return <FeeStatusContent studentData={studentData} />;
      case 'timetable': return <TimetableView user={user} timetables={timetables} studentData={studentData} periodTimes={periodTimes} />;
      case 'notices': return <NoticeBoardContent notices={notices} department={user.department} />;
      case 'profile_settings': return <ProfileSettingsView user={user} onUpdateUser={onUpdateUser} onUpdatePassword={onUpdatePassword} onBiometricSetup={onBiometricSetup} />;
      case 'materials': return <MaterialsContent materials={materials} user={user} studentData={studentData} />;
      case 'live_location': return <LiveLocationView user={user} onUpdateLocation={onUpdateLocation} studentData={studentData} />;
      default: return <div />;
    }
  };

  return (
    <div className="anim-enter-student">
        {renderActiveView()}

      {showIdCard && studentData && (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop" onClick={() => setShowIdCard(false)}>
          <IdCard user={user} studentData={studentData} onClose={() => setShowIdCard(false)} />
        </div>
      )}
    </div>
  );
};

interface StudentViewProps {
  user: User;
  studentData: StudentData | undefined;
  timetables: SectionTimeTable[];
  notices: Notice[];
  periodTimes: string[];
  materials: CourseMaterial[];
  onUpdatePassword: (userId: number, currentPass: string, newPass: string) => 'SUCCESS' | 'INCORRECT_PASSWORD';
  onUpdateUser: (user: User) => void;
  activeView: StudentViewType | null;
  setActiveView: React.Dispatch<React.SetStateAction<StudentViewType | null>>;
  onBiometricSetup: (user: User) => Promise<boolean>;
  onUpdateLocation: (userId: number, location: GeoLocation) => void;
}


export default StudentView;
