

import React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { StudentData, User, Role, YearMarks, MarkItem, ParsedStudent, AttendanceRecord, ParsedAttendanceRecord, ImportantUpdate, MidTermMarks, MidTermSubject, FeeInstallment, YearlyFee, SectionTimeTable, WeeklyTimeTable, Notice, DailyAttendanceStatus } from '../types';
import { GRADE_POINTS, DEPARTMENTS, DEPARTMENT_CODES } from '../constants';
import InfoCard from './InfoCard';
import IdCard from './IdCard';
import ImportStudentsModal from './ImportStudentsModal';
import ImportAttendanceModal from './ImportAttendanceModal';

interface StaffViewProps {
  currentUser: User;
  users: User[];
  allStudentData: StudentData[];
  timetables: SectionTimeTable[];
  notices: Notice[];
  periodTimes: string[];
  onUpdateUser: (user: User) => void;
  onUpdateStudentData: (data: StudentData) => void;
  onUpdateMultipleStudentData: (data: StudentData[]) => void;
  onAddStudent: (user: User, data: StudentData) => void;
  onAddMultipleStudents: (newUsers: User[], newStudentDataItems: StudentData[]) => void;
  onUpdateMultipleAttendance: (updates: ParsedAttendanceRecord[]) => void;
  onUpdateTimetable: (timetable: SectionTimeTable) => void;
  onUpdatePeriodTimes: (newTimes: string[]) => void;
  onAddNotice: (newNotice: Omit<Notice, 'id'>) => void;
  onDeleteNotice: (noticeId: number) => void;
  onBiometricSetup: (user: User) => Promise<boolean>;
}

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const generateRollNumber = (
  department: string,
  academicYear: number,
  isLateralEntry: boolean,
  allUsers: User[],
): string => {
  const currentYear = new Date().getFullYear();
  // For a regular student, admissionYear = currentYear - (academicYear - 1)
  // For a lateral entry student, admissionYear = currentYear - (academicYear - 2)
  const admissionYear = currentYear - (academicYear - (isLateralEntry ? 2 : 1));

  // Deconstruct the roll number parts as per user's 10-digit specification
  const yearCode = String(admissionYear).slice(-2); // First two: year (e.g., 23)
  const collegeCode = 'KP'; // Next two: college code
  const entryCode = isLateralEntry ? '4A' : '1A'; // Next two: entry type
  const branchCode = DEPARTMENT_CODES[department] || '00'; // Next two: department code

  const prefix = `${yearCode}${collegeCode}${entryCode}${branchCode}`;

  const existingSerials = allUsers
    .filter(u => u.rollNumber.startsWith(prefix))
    .map(u => parseInt(u.rollNumber.slice(-2), 10)) // Last two: roll number (sequential)
    .filter(n => !isNaN(n));

  const nextSerial = existingSerials.length > 0 ? Math.max(...existingSerials) + 1 : 1;
  const serialCode = String(nextSerial).padStart(2, '0');

  return `${prefix}${serialCode}`;
};


const MERGED_CELL = '::MERGED::';

const academicPeriods = {
    mid_1: "Mid-Term 1",
    mid_2: "Mid-Term 2",
    year1_1: "YEAR(1-1)", year1_2: "YEAR(1-2)",
    year2_1: "YEAR(2-1)", year2_2: "YEAR(2-2)",
    year3_1: "YEAR(3-1)", year3_2: "YEAR(3-2)",
    year4_1: "YEAR(4-1)", year4_2: "YEAR(4-2)",
};
type AcademicPeriodKey = keyof typeof academicPeriods;
const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_WEEK: (keyof WeeklyTimeTable)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const AddStudentModal: React.FC<{
    onClose: () => void;
    onAdd: (name: string, rollNumber: string, isLateral: boolean, pass: string, department: string, year: string, section: string, email: string, phone: string, photoUrl?: string) => void;
    staffAssignments: { department: string; year: number; section: string }[] | undefined;
    allUsers: User[];
}> = ({ onClose, onAdd, staffAssignments = [], allUsers }) => {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string>();
    const [isLateralEntry, setIsLateralEntry] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(staffAssignments[0] ? `${staffAssignments[0].department}-${staffAssignments[0].year}-${staffAssignments[0].section}` : '');
    const [error, setError] = useState('');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const url = await fileToDataUrl(e.target.files[0]);
                setPhotoUrl(url);
            } catch (err) {
                setError('Could not read photo file.');
            }
        }
    };

    const handleSubmit = () => {
        setError('');
        if (staffAssignments.length === 0) {
            setError('You must be assigned to at least one section and year to add students.');
            return;
        }
        if (!name || !password || !selectedAssignment || !rollNumber) {
            setError('Name, Roll Number, Password, and Assignment are required.');
            return;
        }
        const isDuplicate = allUsers.some(u => u.rollNumber.toLowerCase() === rollNumber.trim().toLowerCase());
        if (isDuplicate) {
            setError('This Roll Number is already in use.');
            return;
        }
        const [department, year, section] = selectedAssignment.split('-');
        onAdd(name, rollNumber.trim(), isLateralEntry, password, department, year, section, email, phone, photoUrl);
        onClose();
    };
    
    const selectedDeptFromAssignment = selectedAssignment ? selectedAssignment.split('-')[0] : '';

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md anim-modal-content">
                <h2 className="text-2xl font-bold mb-4">Add New Student</h2>
                <div className="space-y-4">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                            {photoUrl ? <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                        </div>
                        <label htmlFor="add-student-photo" className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400">Upload Photo</label>
                        <input id="add-student-photo" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                    <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="text" placeholder="Roll Number (e.g., 24KP1A0401)" value={rollNumber} onChange={e => setRollNumber(e.target.value.toUpperCase())} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <div className="p-2 border rounded bg-gray-100 dark:bg-gray-900 dark:border-gray-600">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Department: </span>
                        <span className="font-semibold">{selectedDeptFromAssignment}</span>
                    </div>
                    <div>
                         <label htmlFor="assignment-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign to Year/Section</label>
                         <select id="assignment-select" value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" disabled={staffAssignments.length === 0}>
                            {staffAssignments.length > 0 ? (
                                staffAssignments.map(a => <option key={`${a.department}-${a.year}-${a.section}`} value={`${a.department}-${a.year}-${a.section}`}>{a.department} - {a.year}{['st','nd','rd'][a.year-1]||'th'} Year - Section {a.section}</option>)
                            ) : (
                                <option>No assignments available</option>
                            )}
                         </select>
                    </div>
                    <div className="flex items-center">
                        <input id="lateral-entry-check" type="checkbox" checked={isLateralEntry} onChange={e => setIsLateralEntry(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="lateral-entry-check" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Lateral Entry Student (Joins in 2nd Year)</label>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Add Student</button>
                </div>
            </div>
        </div>
    );
};

const AddNoticeModal: React.FC<{ onClose: () => void, onAdd: (title: string, content: string) => void }> = ({ onClose, onAdd }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            setError('Title and content cannot be empty.');
            return;
        }
        onAdd(title, content);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg anim-modal-content">
                <h2 className="text-2xl font-bold mb-4">Create New Notice</h2>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Notice Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <textarea
                        placeholder="Notice Content..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 h-40"
                    />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Post Notice</button>
                </div>
            </div>
        </div>
    );
};

const EditTimesModal: React.FC<{
  currentTimes: string[];
  onClose: () => void;
  onSave: (newTimes: string[]) => void;
}> = ({ currentTimes, onClose, onSave }) => {
  const [times, setTimes] = useState([...currentTimes]);
  const [error, setError] = useState('');

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleSave = () => {
    if (times.some(t => !t.trim())) {
      setError('Time slots cannot be empty.');
      return;
    }
    setError('');
    onSave(times);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md anim-modal-content">
        <h2 className="text-2xl font-bold mb-4">Edit Period Times</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {times.map((time, index) => (
            <div key={index} className="flex items-center space-x-3">
              <label className="font-medium text-gray-700 dark:text-gray-300 w-20">Period {index + 1}</label>
              <input
                type="text"
                value={time}
                onChange={e => handleTimeChange(index, e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Save Times</button>
        </div>
      </div>
    </div>
  );
};


const getStudentYear = (studentData: StudentData | undefined): number => {
    if (!studentData) return 1;
    if (studentData.year4_1 || studentData.year4_2) return 4;
    if (studentData.year3_1 || studentData.year3_2) return 3;
    if (studentData.year2_1 || studentData.year2_2) return 2;
    return 1;
};

const calculateOverallAttendance = (records: AttendanceRecord[]): number => {
    if (!records || records.length === 0) return 0;
    const totalPresent = records.reduce((acc, r) => acc + r.present, 0);
    const totalWorkingDays = records.reduce((acc, r) => acc + r.total, 0);
    if (totalWorkingDays === 0) return 0;
    return Math.round((totalPresent / totalWorkingDays) * 100);
};

const calculateSGPA = (marks: YearMarks): string => {
  const allItems = [...marks.subjects, ...marks.labs];
  let totalPoints = 0;
  let totalCredits = 0;

  allItems.forEach(item => {
    if (GRADE_POINTS[item.grade] !== undefined) {
      totalPoints += GRADE_POINTS[item.grade] * item.credits;
    }
    totalCredits += item.credits;
  });

  if (totalCredits === 0) {
    return 'N/A';
  }

  const sgpa = totalPoints / totalCredits;
  return sgpa.toFixed(2);
};


type EditableSection = 'profile' | 'attendance' | 'fees' | 'academics' | 'updates' | null;

const isMidTermKey = (key: AcademicPeriodKey): boolean => key === 'mid_1' || key === 'mid_2';

type VirtualItem = {
    type: 'user' | 'header';
    id: string;
    data: any;
    onClick?: () => void;
    content?: string;
    count?: number;
    isCollapsed?: boolean;
}

const VIRTUAL_ROW_HEIGHT = 52;
const VirtualizedList = React.memo(({ items, renderItem, containerHeight }: { items: VirtualItem[], renderItem: (item: VirtualItem) => React.ReactNode, containerHeight: number }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const visibleItemCount = Math.ceil(containerHeight / VIRTUAL_ROW_HEIGHT);
    const startIndex = Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT);
    const endIndex = Math.min(items.length, startIndex + visibleItemCount + 5); // Add buffer of 5 items
    
    const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

    const paddingTop = startIndex * VIRTUAL_ROW_HEIGHT;
    const paddingBottom = (items.length - endIndex) * VIRTUAL_ROW_HEIGHT;

    return (
        <div
            ref={containerRef}
            onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
            className="overflow-y-auto"
            style={{ height: `${containerHeight}px` }}
        >
            <div style={{ paddingTop, paddingBottom }}>
                {visibleItems.map(item => renderItem(item))}
            </div>
        </div>
    );
});

const AttendanceManager: React.FC<{
  currentUser: User;
  allStudentData: StudentData[];
  users: User[];
  periodTimes: string[];
  onUpdateMultipleStudentData: (data: StudentData[]) => void;
  showFeedback: (message: string) => void;
}> = ({ currentUser, allStudentData, users, periodTimes, onUpdateMultipleStudentData, showFeedback }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedAssignmentKey, setSelectedAssignmentKey] = useState<string>('');
    const [attendance, setAttendance] = useState<Map<number, DailyAttendanceStatus[]>>(new Map());
    const [absenteeInput, setAbsenteeInput] = useState('');

    const assignments = currentUser.assignments || [];
    const assignmentMap = useMemo(() => new Map(assignments.map(a => [`${a.department}-${a.year}-${a.section}`, a])), [assignments]);
    const selectedAssignment = selectedAssignmentKey ? assignmentMap.get(selectedAssignmentKey) : null;

    useEffect(() => {
        if (!selectedAssignmentKey && assignments.length > 0) {
            const firstAssignment = assignments[0];
            setSelectedAssignmentKey(`${firstAssignment.department}-${firstAssignment.year}-${firstAssignment.section}`);
        }
    }, [assignments, selectedAssignmentKey]);

    const studentsInClass = useMemo(() => {
        if (!selectedAssignment) return [];
        return users.filter(u => {
            if (u.role !== Role.STUDENT) return false;
            const studentData = allStudentData.find(d => d.userId === u.id);
            const studentYear = getStudentYear(studentData);
            return (
                u.department === selectedAssignment.department &&
                studentYear === selectedAssignment.year &&
                u.section === selectedAssignment.section
            );
        }).sort((a,b) => a.rollNumber.localeCompare(b.rollNumber));
    }, [selectedAssignment, users, allStudentData]);
    
    const dateKey = selectedDate.toISOString().split('T')[0];

    useEffect(() => {
        const newAttendance = new Map<number, DailyAttendanceStatus[]>();
        const todayKey = new Date().toISOString().split('T')[0];
        const isTodayOrFuture = dateKey >= todayKey;

        studentsInClass.forEach(student => {
            const studentData = allStudentData.find(sd => sd.userId === student.id);
            const recordForDate = studentData?.dailyAttendance?.[dateKey];
            
            const initialStatus = recordForDate 
                ? recordForDate 
                : isTodayOrFuture
                    ? Array(periodTimes.length).fill('Present')
                    : Array(periodTimes.length).fill('Not Marked');

            newAttendance.set(student.id, initialStatus);
        });
        setAttendance(newAttendance);
    }, [studentsInClass, allStudentData, dateKey, periodTimes.length]);

    const handleStatusChange = (studentId: number, periodIndex: number, newStatus: DailyAttendanceStatus) => {
        const currentStatuses = attendance.get(studentId) || [];
        const newStatuses = [...currentStatuses];
        
        if (newStatuses[periodIndex] === newStatus) {
            newStatuses[periodIndex] = 'Not Marked'; // Toggle off
        } else {
            newStatuses[periodIndex] = newStatus;
        }
        
        setAttendance(new Map(attendance.set(studentId, newStatuses)));
    };

    const handleMarkAbsenteesFromInput = () => {
        if (!absenteeInput.trim()) return;

        const rollNumberEndings = absenteeInput.trim().split(/[\s,]+/).filter(Boolean);
        if (rollNumberEndings.length === 0) return;

        const newAttendance = new Map(attendance);
        let studentsMarkedCount = 0;
        const unmatchedEndings = new Set(rollNumberEndings);

        studentsInClass.forEach(student => {
            const matchingEnding = rollNumberEndings.find(ending => student.rollNumber.endsWith(ending));
            if (matchingEnding) {
                newAttendance.set(student.id, Array(periodTimes.length).fill('Absent'));
                studentsMarkedCount++;
                unmatchedEndings.delete(matchingEnding);
            }
        });
        
        setAttendance(newAttendance);
        setAbsenteeInput('');

        let feedbackMsg = `${studentsMarkedCount} student(s) marked as absent.`;
        if (unmatchedEndings.size > 0) {
            feedbackMsg += ` No match found for: ${Array.from(unmatchedEndings).join(', ')}.`;
        }
        showFeedback(feedbackMsg);
    };
    
    const handleSave = () => {
        const updatedStudentData: StudentData[] = [];
        for (const [userId, statuses] of attendance.entries()) {
            const originalStudentData = allStudentData.find(sd => sd.userId === userId);
            if (originalStudentData) {
                const newDailyAttendance = {
                    ...(originalStudentData.dailyAttendance || {}),
                    [dateKey]: statuses,
                };
                updatedStudentData.push({
                    ...originalStudentData,
                    dailyAttendance: newDailyAttendance,
                });
            }
        }
        if (updatedStudentData.length > 0) {
            onUpdateMultipleStudentData(updatedStudentData);
            showFeedback(`Attendance for ${selectedAssignment?.section} section on ${selectedDate.toLocaleDateString()} saved.`);
        } else {
            showFeedback('No attendance data to save.');
        }
    };
    
    return (
        <InfoCard title="Mark Daily Attendance">
            <div className="flex flex-col md:flex-row gap-4 mb-6 pb-6 border-b dark:border-gray-700">
                <div className="flex-1">
                    <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Date</label>
                    <input
                        id="attendance-date"
                        type="date"
                        value={dateKey}
                        onChange={e => setSelectedDate(new Date(e.target.value))}
                        className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="flex-1">
                    <label htmlFor="attendance-class" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Class</label>
                    <select
                        id="attendance-class"
                        value={selectedAssignmentKey || ''}
                        onChange={e => setSelectedAssignmentKey(e.target.value)}
                        className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                        {assignments.map(a => <option key={`${a.department}-${a.year}-${a.section}`} value={`${a.department}-${a.year}-${a.section}`}>{a.department} - Year {a.year} - Sec {a.section}</option>)}
                    </select>
                </div>
            </div>

            {selectedAssignment ? (
                <>
                    <div className="mb-6">
                        <label htmlFor="absentee-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quick Mark Absentees
                        </label>
                        <div className="mt-1 flex gap-2">
                            <input
                                id="absentee-input"
                                type="text"
                                value={absenteeInput}
                                onChange={(e) => setAbsenteeInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleMarkAbsenteesFromInput(); }}
                                placeholder="Enter last 2-3 digits of absent roll numbers"
                                className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            />
                            <button onClick={handleMarkAbsenteesFromInput} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 btn-interactive">
                                Mark Absent
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Separate numbers with spaces or commas. This marks students absent for the whole day.</p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                        <p className="text-lg font-semibold">{studentsInClass.length} students in this class.</p>
                        <div className="flex items-center gap-4">
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 btn-interactive font-bold">Save Attendance</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse border dark:border-gray-600">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr className="divide-x dark:divide-gray-600">
                                    <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-2 font-medium">Student</th>
                                    {periodTimes.map((time, i) => (
                                        <th key={i} className="px-2 py-2 text-center font-medium">P{i+1}<br/><span className="text-xs font-normal">({time})</span></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {studentsInClass.map(student => {
                                    const studentAttendance = attendance.get(student.id) || [];
                                    return (
                                        <tr key={student.id} className="divide-x dark:divide-gray-600">
                                            <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-2 font-medium whitespace-nowrap">{student.name}<br/><span className="text-xs text-gray-500 dark:text-gray-400">{student.rollNumber}</span></td>
                                            {periodTimes.map((_, periodIndex) => {
                                                const status = studentAttendance[periodIndex];
                                                return (
                                                <td key={periodIndex} className="text-center p-1 align-middle">
                                                    <div className="flex justify-center items-center gap-1">
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, periodIndex, 'Present')}
                                                            className={`w-7 h-7 rounded text-xs font-bold transition-colors ${status === 'Present' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800/50 dark:text-green-200 dark:hover:bg-green-800'}`}
                                                        >P</button>
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, periodIndex, 'Absent')}
                                                            className={`w-7 h-7 rounded text-xs font-bold transition-colors ${status === 'Absent' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800/50 dark:text-red-200 dark:hover:bg-red-800'}`}
                                                        >A</button>
                                                    </div>
                                                </td>
                                            )})}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Please select a class to mark attendance.</p>
            )}
        </InfoCard>
    );
};

const StaffView: React.FC<StaffViewProps> = ({ currentUser, users, allStudentData, timetables, notices, periodTimes, onUpdateUser, onUpdateStudentData, onUpdateMultipleStudentData, onAddStudent, onAddMultipleStudents, onUpdateMultipleAttendance, onUpdateTimetable, onUpdatePeriodTimes, onAddNotice, onDeleteNotice, onBiometricSetup }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [noticeSearchQuery, setNoticeSearchQuery] = useState('');
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [isImportingStudents, setIsImportingStudents] = useState(false);
    const [isImportingAttendance, setIsImportingAttendance] = useState(false);
    const [isAddingNotice, setIsAddingNotice] = useState(false);
    const [isEditingTimes, setIsEditingTimes] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [activeTab, setActiveTab] = useState<'attendance' | 'home' | 'students' | 'staff' | 'timetable' | 'notices'>('attendance');
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]); // "year-2", "year-3-section-A"
    const [yearFilter, setYearFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all');
    const [sectionFilter, setSectionFilter] = useState<'all' | 'none' | string>('all');
    const [isViewingIdCard, setIsViewingIdCard] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<{user: User, studentData: StudentData} | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const [editingSection, setEditingSection] = useState<EditableSection>(null);
    const [newStaffUpdateText, setNewStaffUpdateText] = useState('');
    
    // Timetable state
    const [selectedTimetableYear, setSelectedTimetableYear] = useState<string>('1');
    const [selectedTimetableSection, setSelectedTimetableSection] = useState<string>('');
    const [editingTimetable, setEditingTimetable] = useState<WeeklyTimeTable | null>(null);

    const handleButtonMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        button.style.setProperty('--mouse-x', `${x}px`);
        button.style.setProperty('--mouse-y', `${y}px`);
    };
    
    const handleBiometricEnable = async () => {
        const success = await onBiometricSetup(currentUser);
        if (success) {
            showFeedback('Biometric authentication enabled successfully!');
        } else {
            showFeedback('Failed to enable biometrics.');
        }
    };

    const staffDepartment = currentUser.department;

    const studentUsers = useMemo(() => {
        if (!currentUser.assignments || currentUser.assignments.length === 0) {
            return [];
        }
        return users.filter(u => {
            if (u.role !== Role.STUDENT) {
                return false;
            }
            const studentData = allStudentData.find(d => d.userId === u.id);
            const studentYear = getStudentYear(studentData);
            const studentSection = u.section;

            if (!studentSection) {
                return false;
            }

            return currentUser.assignments!.some(assignment => 
                assignment.department === u.department &&
                assignment.year === studentYear && 
                assignment.section === studentSection
            );
        });
    }, [users, allStudentData, currentUser.assignments]);

    const staffUsersInDepartment = useMemo(() => users.filter(u => u.role === Role.STAFF && u.department === staffDepartment), [users, staffDepartment]);
    
    const studentsForYearFilter = useMemo(() => {
        if (yearFilter === 'all') return studentUsers;
        return studentUsers.filter(user => {
            const data = allStudentData.find(d => d.userId === user.id);
            return getStudentYear(data).toString() === yearFilter;
        });
    }, [studentUsers, allStudentData, yearFilter]);

    const availableSections = useMemo(() => {
        const sections = new Set<string>();
        studentsForYearFilter.forEach(user => {
            if (user.section) {
                sections.add(user.section);
            }
        });
        return Array.from(sections).sort();
    }, [studentsForYearFilter]);
    
    const hasUnsectionedStudents = useMemo(() => {
        return studentsForYearFilter.some(user => !user.section);
    }, [studentsForYearFilter]);

    useEffect(() => {
        const choiceCount = availableSections.length + (hasUnsectionedStudents ? 1 : 0);
        if (choiceCount === 1) {
            if (availableSections.length === 1) {
                setSectionFilter(availableSections[0]);
            } else {
                setSectionFilter('none');
            }
        } else {
            setSectionFilter('all');
        }
    }, [yearFilter, availableSections, hasUnsectionedStudents]);

    const filteredGroupedStudents = useMemo(() => {
        let filteredStudents = studentUsers;

        if (yearFilter !== 'all') {
            filteredStudents = filteredStudents.filter(user => {
                const data = allStudentData.find(d => d.userId === user.id);
                return getStudentYear(data).toString() === yearFilter;
            });
        }

        if (sectionFilter !== 'all') {
             if (sectionFilter === 'none') {
                filteredStudents = filteredStudents.filter(user => !user.section);
            } else {
                filteredStudents = filteredStudents.filter(user => user.section === sectionFilter);
            }
        }

        if (debouncedSearchQuery) {
            filteredStudents = filteredStudents.filter(user =>
                user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                user.rollNumber.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }

        const groups: { [year: string]: { [section: string]: User[] } } = {};
        filteredStudents.forEach(user => {
            const data = allStudentData.find(d => d.userId === user.id);
            const year = getStudentYear(data).toString();
            const section = user.section || 'N/A';
            if (!groups[year]) groups[year] = {};
            if (!groups[year][section]) groups[year][section] = [];
            groups[year][section].push(user);
        });

        const finalGroups: { [year: string]: { [section: string]: User[] } } = {};
        for (const year of ['1', '2', '3', '4']) {
            if (groups[year] && Object.keys(groups[year]).length > 0) {
                finalGroups[year] = Object.fromEntries(Object.entries(groups[year]).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));
            }
        }
        return finalGroups;
    }, [studentUsers, allStudentData, yearFilter, sectionFilter, debouncedSearchQuery]);


    const filteredStaff = useMemo(() => {
        let staff = staffUsersInDepartment;

        if (debouncedSearchQuery) {
            staff = staff.filter(user =>
                user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                user.rollNumber.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }
        return staff;
    }, [staffUsersInDepartment, debouncedSearchQuery]);
    
    useEffect(() => {
        // When the active tab changes, always reset the selection.
        setSelectedStudent(null);
        setSelectedUserId(null);

        // Reset filters when tab changes
        setSearchQuery('');
        setNoticeSearchQuery('');
        setYearFilter('all');
        setSectionFilter('all');
    }, [activeTab]);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingData, setEditingData] = useState<StudentData | null>(null);
    const [activeAcademicPeriodTab, setActiveAcademicPeriodTab] = useState<AcademicPeriodKey>('mid_1');
    const [newAttendanceRecord, setNewAttendanceRecord] = useState<{ month: string, year: string, present: string, total: string }>({ month: MONTHS[0], year: new Date().getFullYear().toString(), present: '', total: '' });

    const selectedUser = users.find(u => u.id === selectedUserId);
    
    useEffect(() => {
        const user = selectedStudent?.user;
        const studentData = selectedStudent?.studentData;
        setEditingUser(user ? { ...user } : null);
        setEditingData(studentData ? JSON.parse(JSON.stringify(studentData)) : null);
        setEditingSection(null); // Close any open edit sections when user changes
        setActiveAcademicPeriodTab('mid_1');
    }, [selectedStudent]);
    
    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 5000);
    }
    
    const handleEditClick = (section: EditableSection) => {
        const user = selectedStudent?.user;
        const studentData = selectedStudent?.studentData;

        setEditingUser(user ? { ...user } : null);
        let dataToEdit = studentData ? JSON.parse(JSON.stringify(studentData)) : null;

        if (section === 'academics' && dataToEdit) {
            (Object.keys(academicPeriods) as AcademicPeriodKey[]).forEach(periodKey => {
                if (!dataToEdit![periodKey]) {
                    if (isMidTermKey(periodKey)) {
                        dataToEdit![periodKey] = { subjects: [] };
                    } else {
                        dataToEdit![periodKey] = { subjects: [], labs: [], totalCredits: 0, earnedCredits: 0 };
                    }
                }
            });
        }
        setEditingData(dataToEdit);
        setEditingSection(section);
    };

    const handleSave = (section: EditableSection) => {
        const userName = selectedStudent?.user?.name;
        switch (section) {
            case 'profile':
                if (editingUser) {
                    const isRollNumberChanged = editingUser.rollNumber !== selectedStudent?.user?.rollNumber;
                    if (isRollNumberChanged) {
                        const isDuplicate = users.some(u => u.id !== editingUser.id && u.rollNumber === editingUser.rollNumber);
                        if (isDuplicate) {
                            alert(`Error: Roll Number "${editingUser.rollNumber}" is already in use. Please choose a unique one.`);
                            return; 
                        }
                    }
                    onUpdateUser(editingUser);
                }
                break;
            case 'fees':
            case 'attendance':
            case 'academics':
            case 'updates':
                if (editingData) onUpdateStudentData(editingData);
                break;
        }
        setEditingSection(null);
        showFeedback(`${userName}'s ${section} updated successfully!`);
    };

    const handleCancel = () => {
        const user = selectedStudent?.user;
        const studentData = selectedStudent?.studentData;
        setEditingSection(null);
        setEditingUser(user ?? null);
        setEditingData(studentData ? JSON.parse(JSON.stringify(studentData)) : null);
    };

    const renderActionButtons = (section: EditableSection) => (
        <div className="flex items-center space-x-2">
            <button onClick={() => handleSave(section)} className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 btn-interactive">Save</button>
            <button onClick={handleCancel} className="px-3 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400 btn-interactive">Cancel</button>
        </div>
    );
    
    const renderEditIcon = (section: EditableSection) => (
        <button onClick={() => handleEditClick(section)} className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 btn-interactive">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
        </button>
    );

    const handleMarkChange = (periodKey: AcademicPeriodKey, type: 'subjects' | 'labs', index: number, field: 'name' | 'grade' | 'credits', value: string | number) => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as YearMarks) };
        const updatedItems = [...updatedPeriodData[type]];
        const currentItem = { ...updatedItems[index] };
        
        if (field === 'name') currentItem.name = value as string;
        else if (field === 'grade') currentItem.grade = value as string;
        else if (field === 'credits') currentItem.credits = parseFloat(value as string) || 0;
        
        updatedItems[index] = currentItem;
        updatedPeriodData[type] = updatedItems;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };

    const handleAddMarkItem = (periodKey: AcademicPeriodKey, type: 'subjects' | 'labs') => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as YearMarks) };
        const updatedItems = [...updatedPeriodData[type]];
        updatedItems.push({ name: '', grade: 'A', credits: 3 });
        updatedPeriodData[type] = updatedItems;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };

    const handleRemoveMarkItem = (periodKey: AcademicPeriodKey, type: 'subjects' | 'labs', index: number) => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as YearMarks) };
        const updatedItems = [...updatedPeriodData[type]];
        updatedItems.splice(index, 1);
        updatedPeriodData[type] = updatedItems;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };
    
    const handleSemesterCreditsChange = (periodKey: AcademicPeriodKey, field: 'totalCredits' | 'earnedCredits', value: string) => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as YearMarks) };
        updatedPeriodData[field] = parseFloat(value) || 0;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };

    const handleMidTermMarkChange = (periodKey: AcademicPeriodKey, index: number, field: 'name' | 'score' | 'maxScore', value: string | number) => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as MidTermMarks) };
        const updatedSubjects = [...updatedPeriodData.subjects];
        const currentSubject = { ...updatedSubjects[index] };

        if (field === 'name') currentSubject.name = value as string;
        else if (field === 'score') currentSubject.score = Math.min(parseInt(value as string, 10) || 0, currentSubject.maxScore);
        else if (field === 'maxScore') currentSubject.maxScore = parseInt(value as string, 10) || 0;
        
        updatedSubjects[index] = currentSubject;
        updatedPeriodData.subjects = updatedSubjects;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };

    const handleAddMidTermMarkItem = (periodKey: AcademicPeriodKey) => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as MidTermMarks) };
        const updatedSubjects = [...updatedPeriodData.subjects];
        updatedSubjects.push({ name: '', score: 0, maxScore: 100 });
        updatedPeriodData.subjects = updatedSubjects;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };

    const handleRemoveMidTermMarkItem = (periodKey: AcademicPeriodKey, index: number) => {
        if (!editingData) return;
        const updatedPeriodData = { ...(editingData[periodKey] as MidTermMarks) };
        const updatedSubjects = [...updatedPeriodData.subjects];
        updatedSubjects.splice(index, 1);
        updatedPeriodData.subjects = updatedSubjects;
        setEditingData({ ...editingData, [periodKey]: updatedPeriodData });
    };
    
    const handleAddStudentInternal = (name: string, rollNumber: string, isLateralEntry: boolean, password: string, department: string, yearStr: string, section: string, email: string, phone: string, photoUrl?: string) => {
        const newId = Date.now();
        const academicYear = parseInt(yearStr, 10);
        
        const newUser: User = { 
            id: newId, 
            name, 
            rollNumber, 
            password, 
            role: Role.STUDENT, 
            department, 
            section, 
            email, 
            phone, 
            photoUrl,
            isLateralEntry
        };
        
        const newStudentData: StudentData = {
            id: newId, userId: newId, monthlyAttendance: [], 
            fees: {},
            importantUpdates: [],
            mid_1: { subjects: [] }, mid_2: { subjects: [] },
            year1_1: null, year1_2: null, year2_1: null, year2_2: null, year3_1: null, year3_2: null, year4_1: null, year4_2: null,
        };
        
        const yearKey = `year${academicYear}`;
        newStudentData.fees[yearKey] = {
            installment1: { total: 25000, paid: 0, dueDate: '2024-08-15', status: 'Due' },
            installment2: { total: 25000, paid: 0, dueDate: '2025-02-15', status: 'Due' },
        };

        const emptyYearMarks: YearMarks = { subjects: [], labs: [], totalCredits: 0, earnedCredits: 0 };
        const academicPeriodKey = `year${academicYear}_1` as AcademicPeriodKey;
        if(newStudentData.hasOwnProperty(academicPeriodKey)) {
            (newStudentData as any)[academicPeriodKey] = emptyYearMarks;
        }

        onAddStudent(newUser, newStudentData);
        showFeedback('Student added successfully!');
    }
    
    const handleAddMultipleStudentsWrapper = (allParsedStudents: ParsedStudent[]) => {
        const newUsers: User[] = [];
        const newStudentDataItems: StudentData[] = [];
        const skippedStudents: string[] = [];
        const mismatchedStudents: string[] = [];

        if (!currentUser.assignments || currentUser.assignments.length === 0) {
            showFeedback("You must be assigned to a section and year to import students.");
            return;
        }
        
        const existingRollNumbers = new Set(users.map(u => u.rollNumber));

        allParsedStudents.forEach(pStudent => {
            const studentYear = parseInt(pStudent.year, 10);

            let finalRollNumber = pStudent.rollNumber?.trim();
            let isDuplicate = false;

            if (finalRollNumber) {
                isDuplicate = existingRollNumbers.has(finalRollNumber);
            } else {
                // If no roll number in file, generate one
                finalRollNumber = generateRollNumber(
                    pStudent.department,
                    studentYear,
                    pStudent.isLateralEntry || false,
                    [...users, ...newUsers]
                );
                isDuplicate = existingRollNumbers.has(finalRollNumber);
            }

            if (isDuplicate) {
                skippedStudents.push(`${pStudent.name} (roll number ${finalRollNumber} is a duplicate)`);
                return;
            }
            
            if (!finalRollNumber) {
                 skippedStudents.push(`${pStudent.name} (could not determine roll number)`);
                return;
            }

            const isAssigned = currentUser.assignments!.some(a => 
                a.department === pStudent.department &&
                a.year === studentYear && 
                a.section === pStudent.section
            );

            if (!isAssigned) {
                mismatchedStudents.push(`${pStudent.name} (${pStudent.department} - Year ${pStudent.year} - Sec ${pStudent.section})`);
                return;
            }
            
            const newId = Date.now() + Math.random();
            const newUser: User = {
                id: newId,
                name: pStudent.name,
                rollNumber: finalRollNumber,
                password: 'password123', // Default password
                role: Role.STUDENT,
                department: pStudent.department,
                section: pStudent.section,
                isLateralEntry: pStudent.isLateralEntry,
                email: pStudent.email,
                phone: pStudent.phone,
            };

            const newStudentData: StudentData = {
                id: newId, userId: newId, monthlyAttendance: [], 
                fees: {}, 
                importantUpdates: [],
                mid_1: { subjects: [] }, mid_2: { subjects: [] },
                year1_1: null, year1_2: null, year2_1: null, year2_2: null, year3_1: null, year3_2: null, year4_1: null, year4_2: null,
            };
            const yearKey = `year${pStudent.year}`;
            newStudentData.fees[yearKey] = {
                installment1: { total: (pStudent.totalFees ?? 50000) / 2, paid: (pStudent.paidFees ?? 0), dueDate: '2024-08-15', status: 'Due' },
                installment2: { total: (pStudent.totalFees ?? 50000) / 2, paid: 0, dueDate: '2025-02-15', status: 'Due' },
            };
            const emptyYearMarks: YearMarks = { subjects: [], labs: [], totalCredits: 0, earnedCredits: 0 };
            const academicPeriodKey = `year${studentYear}_1` as AcademicPeriodKey;
            if(newStudentData.hasOwnProperty(academicPeriodKey)) {
                (newStudentData as any)[academicPeriodKey] = emptyYearMarks;
            }
            
            newUsers.push(newUser);
            newStudentDataItems.push(newStudentData);
            existingRollNumbers.add(finalRollNumber); // Add to set to prevent duplicates within the same import
        });

        if (newUsers.length > 0) {
            onAddMultipleStudents(newUsers, newStudentDataItems);
        }
        
        let feedbackMessage = `Import processed: ${allParsedStudents.length} total records.`;
        if (newUsers.length > 0) feedbackMessage += ` ${newUsers.length} new students added.`;
        if (skippedStudents.length > 0) feedbackMessage += ` ${skippedStudents.length} duplicates skipped.`;
        if (mismatchedStudents.length > 0) feedbackMessage += ` ${mismatchedStudents.length} students skipped because they do not belong to any of your assigned groups.`;
        
        showFeedback(feedbackMessage);
    };

    const handleImportAttendanceWrapper = (allParsedRecords: ParsedAttendanceRecord[]) => {
      const validRecords: ParsedAttendanceRecord[] = [];
      const skippedRecords: ParsedAttendanceRecord[] = [];
      const studentRollNumbers = new Set(studentUsers.map(u => u.rollNumber));

      allParsedRecords.forEach(record => {
          if (studentRollNumbers.has(record.rollNumber)) {
              validRecords.push(record);
          } else {
              skippedRecords.push(record);
          }
      });

      if (validRecords.length > 0) {
        onUpdateMultipleAttendance(validRecords);
      }
      
      let feedbackMessage = `Import processed: ${allParsedRecords.length} total records.`;
      const processedCount = validRecords.length;
      const skippedCount = skippedRecords.length;
      
      if (processedCount > 0) {
          feedbackMessage += ` ${processedCount} records applied.`;
      }
      
      if (skippedCount > 0) {
          const skippedRolls = [...new Set(skippedRecords.map(r => r.rollNumber))].join(', ');
          feedbackMessage += ` ${skippedCount} records skipped for unknown or unassigned students (${skippedRolls}).`;
      }

      if (processedCount === 0 && skippedCount === 0) {
          feedbackMessage = "Import complete. No attendance data was found in the file for your assigned students.";
      }
      
      showFeedback(feedbackMessage);
    };

    const handleAddAttendanceRecord = () => {
        if (!editingData) return;
        const { month, year, present, total } = newAttendanceRecord;
        if (!month || !year || !present || !total) {
            alert("Please fill all fields for the new attendance record.");
            return;
        }
        const newRecord: AttendanceRecord = {
            month,
            year: parseInt(year),
            present: parseInt(present),
            total: parseInt(total)
        };
        const updatedAttendance = [...editingData.monthlyAttendance, newRecord];
        setEditingData({ ...editingData, monthlyAttendance: updatedAttendance });
        setNewAttendanceRecord({ month: MONTHS[0], year: new Date().getFullYear().toString(), present: '', total: '' });
    };

    const handleUpdateAttendanceRecord = (index: number, field: keyof AttendanceRecord, value: string) => {
        if (!editingData) return;
        const updatedAttendance = [...editingData.monthlyAttendance];
        const recordToUpdate = { ...updatedAttendance[index] };
        if (field === 'month') {
            recordToUpdate.month = value;
        } else {
            (recordToUpdate as any)[field] = parseInt(value, 10) || 0;
        }
        updatedAttendance[index] = recordToUpdate;
        setEditingData({ ...editingData, monthlyAttendance: updatedAttendance });
    };

    const handleRemoveAttendanceRecord = (index: number) => {
        if (!editingData) return;
        const updatedAttendance = [...editingData.monthlyAttendance];
        updatedAttendance.splice(index, 1);
        setEditingData({ ...editingData, monthlyAttendance: updatedAttendance });
    };

    const handleAddImportantUpdate = () => {
        if (!editingData) return;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const updatedUpdates = [...editingData.importantUpdates, { date: today, text: '' }];
        setEditingData({ ...editingData, importantUpdates: updatedUpdates });
    };

    const handleImportantUpdateChange = (index: number, field: 'date' | 'text', value: string) => {
        if (!editingData) return;
        const updatedUpdates = [...editingData.importantUpdates];
        updatedUpdates[index] = { ...updatedUpdates[index], [field]: value };
        setEditingData({ ...editingData, importantUpdates: updatedUpdates });
    };

    const handleRemoveImportantUpdate = (index: number) => {
        if (!editingData) return;
        const updatedUpdates = [...editingData.importantUpdates];
        updatedUpdates.splice(index, 1);
        setEditingData({ ...editingData, importantUpdates: updatedUpdates });
    };
    
    const handleFeeChange = (yearKey: string, installment: 'installment1' | 'installment2', field: 'total' | 'paid' | 'dueDate', value: string) => {
        if (!editingData) return;
        const updatedFees = { ...editingData.fees };
        const yearData = { ...updatedFees[yearKey] };
        const installmentData = { ...yearData[installment] };

        if (field === 'dueDate') {
            installmentData.dueDate = value;
        } else {
            const numValue = parseInt(value, 10) || 0;
            if (field === 'total') {
                installmentData.total = numValue;
                if (installmentData.paid > installmentData.total) installmentData.paid = installmentData.total;
            } else { // paid
                installmentData.paid = Math.min(numValue, installmentData.total);
            }
        }
        
        const today = new Date().toISOString().split('T')[0];
        if (installmentData.paid >= installmentData.total) {
            installmentData.status = 'Paid';
        } else if (today > installmentData.dueDate) {
            installmentData.status = 'Overdue';
        } else {
            installmentData.status = 'Due';
        }

        yearData[installment] = installmentData;
        updatedFees[yearKey] = yearData;
        setEditingData({ ...editingData, fees: updatedFees });
    };
    
    const handleAddFeeYear = () => {
        if (!editingData) return;

        const feeYears = Object.keys(editingData.fees).map(key => parseInt(key.replace('year', '')));
        const latestFeeYear = feeYears.length > 0 ? Math.max(...feeYears) : 0;
        
        if (latestFeeYear >= 4) return;

        const nextYear = latestFeeYear + 1;
        const nextYearKey = `year${nextYear}`;

        if (editingData.fees[nextYearKey]) return;

        const updatedFees = { ...editingData.fees };

        let lastDueDate = new Date(); // fallback to today
        if (latestFeeYear > 0 && editingData.fees[`year${latestFeeYear}`]) {
             lastDueDate = new Date(editingData.fees[`year${latestFeeYear}`].installment2.dueDate);
        }
        
        const nextDueDate1 = new Date(lastDueDate.getFullYear() + 1, 7, 15); // Aug 15
        const nextDueDate2 = new Date(lastDueDate.getFullYear() + 2, 1, 15); // Feb 15

        updatedFees[nextYearKey] = {
            installment1: { total: 25000, paid: 0, dueDate: nextDueDate1.toISOString().split('T')[0], status: 'Due' },
            installment2: { total: 25000, paid: 0, dueDate: nextDueDate2.toISOString().split('T')[0], status: 'Due' },
        };
        setEditingData({ ...editingData, fees: updatedFees });
    };

    const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editingUser) {
            try {
                const url = await fileToDataUrl(e.target.files[0]);
                setEditingUser({ ...editingUser, photoUrl: url });
            } catch (error) {
                console.error('Failed to update photo', error);
                alert('There was an error uploading the photo.');
            }
        }
    };


    const handleAddStaffUpdate = () => {
        if (!selectedUser || selectedUser.role !== Role.STAFF || !newStaffUpdateText.trim()) return;
        const today = new Date().toISOString().split('T')[0];
        const newUpdate: ImportantUpdate = { date: today, text: newStaffUpdateText.trim() };
    
        const updatedUser = {
            ...selectedUser,
            importantUpdates: [...(selectedUser.importantUpdates || []), newUpdate]
        };
    
        onUpdateUser(updatedUser);
        setNewStaffUpdateText('');
        showFeedback(`Update added for ${selectedUser.name}`);
    };

    const toggleGroupCollapse = (key: string) => {
        setCollapsedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };
    
    const yearSuffix = (year: string | number) => {
        const y = String(year);
        if (y === '1') return 'st';
        if (y === '2') return 'nd';
        if (y === '3') return 'rd';
        return 'th';
    };

    const renderEmptyState = () => (
        <InfoCard title="User Details">
            <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{users.length === 0 ? "No Users Available" : `Select a ${activeTab.slice(0, -1)}`}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{`Select a ${activeTab.slice(0, -1)} from the list to see and edit their details.`}</p>
            </div>
        </InfoCard>
    );

    const HubButton: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, color: string }> = ({ onClick, icon, label, color }) => (
      <button
        onClick={onClick}
        className={`group flex flex-col items-center justify-center p-4 rounded-lg shadow-md hover:shadow-xl ${color} btn-interactive`}
      >
        <div className="text-white mb-2">{icon}</div>
        <span className="font-semibold text-white text-center text-sm">{label}</span>
      </button>
    );

    const renderHome = () => {
        const totalStudents = studentUsers.length;
        
        const totalPresentDays = studentUsers.reduce((total, student) => {
            const data = allStudentData.find(d => d.userId === student.id);
            return total + (data?.monthlyAttendance.reduce((acc, record) => acc + record.present, 0) || 0);
        }, 0);

        const totalWorkingDays = studentUsers.reduce((total, student) => {
            const data = allStudentData.find(d => d.userId === student.id);
            return total + (data?.monthlyAttendance.reduce((acc, record) => acc + record.total, 0) || 0);
        }, 0);

        const avgAttendance = totalWorkingDays > 0 ? (totalPresentDays / totalWorkingDays) * 100 : 0;
        
        const fullyPaidStudents = studentUsers.filter(student => { 
            const data = allStudentData.find(d => d.userId === student.id); 
            if (!data) return false;
            // Fix: Explicitly type 'y' as YearlyFee to avoid operating on an 'unknown' type.
            const totalFees = (Object.values(data.fees) as YearlyFee[]).reduce((acc, y) => acc + y.installment1.total + y.installment2.total, 0);
            const totalPaid = (Object.values(data.fees) as YearlyFee[]).reduce((acc, y) => acc + y.installment1.paid + y.installment2.paid, 0);
            return totalPaid >= totalFees;
        }).length;
        const feesPaidPercentage = totalStudents > 0 ? (fullyPaidStudents / totalStudents) * 100 : 0;
        
        let assignmentSummary = 'for your assigned sections and years';
        if (currentUser.assignments && currentUser.assignments.length === 1) {
            const a = currentUser.assignments[0];
            assignmentSummary = `for Section ${a.section}, ${a.year}${yearSuffix(String(a.year))} Year`;
        }
        
        return (
            <div className="space-y-6 animated-grid">
                <InfoCard title={`Welcome, ${currentUser.name}!`}>
                    <p className="text-gray-600 dark:text-gray-300">This is your central hub for managing the <span className="font-semibold">{currentUser.department}</span> department {assignmentSummary}. Here's a quick overview and your main actions.</p>
                </InfoCard>
                <InfoCard title="Class Overview">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div><p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{totalStudents}</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p></div>
                        <div><p className="text-4xl font-bold text-green-600 dark:text-green-400">{avgAttendance.toFixed(1)}%</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Average Attendance</p></div>
                        <div><p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{feesPaidPercentage.toFixed(1)}%</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Fees Fully Paid</p></div>
                    </div>
                </InfoCard>
                <InfoCard title="Management Hub">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                       <HubButton onClick={() => setActiveTab('students')} label="Manage Students" color="bg-blue-500 hover:bg-blue-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />
                       <HubButton onClick={() => setActiveTab('staff')} label="View Staff" color="bg-sky-500 hover:bg-sky-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
                       <HubButton onClick={() => setActiveTab('timetable')} label="Edit Timetables" color="bg-orange-500 hover:bg-orange-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                       <HubButton onClick={() => setIsAddingStudent(true)} label="Add New Student" color="bg-green-500 hover:bg-green-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>} />
                       <HubButton onClick={() => setIsImportingStudents(true)} label="Import Students" color="bg-purple-500 hover:bg-purple-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V13h-1.5z" /><path d="M9 13h2v5H9v-5z" /></svg>} />
                       <HubButton onClick={() => setIsImportingAttendance(true)} label="Import Attendance" color="bg-teal-500 hover:bg-teal-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>} />
                       <HubButton onClick={handleBiometricEnable} label="Enable Biometrics" color="bg-indigo-500 hover:bg-indigo-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.5-4m1.5 8l.054-.09A13.916 13.916 0 008 11a4 4 0 00-.05-1.5m3.44-2.04L11.3 7.3" /></svg>} />
                    </div>
                </InfoCard>
            </div>
        );
    };

    const sectionsByYear = useMemo(() => {
        const result: { [year: string]: string[] } = { '1': [], '2': [], '3': [], '4': [] };
        if (currentUser.assignments) {
            for (const assignment of currentUser.assignments) {
                const yearStr = String(assignment.year);
                if (result[yearStr] && !result[yearStr].includes(assignment.section)) {
                    result[yearStr].push(assignment.section);
                }
            }
        }
        Object.values(result).forEach(sections => sections.sort());
        return result;
    }, [currentUser.assignments]);

    useEffect(() => {
        const availableSections = sectionsByYear[selectedTimetableYear] || [];
        if (!availableSections.includes(selectedTimetableSection)) {
            setSelectedTimetableSection(availableSections[0] || '');
        }
    }, [selectedTimetableYear, sectionsByYear]);
    
    useEffect(() => {
        if (!selectedTimetableYear || !selectedTimetableSection) {
            setEditingTimetable(null);
            return;
        }

        const existing = timetables.find(t => 
            t.department === staffDepartment &&
            t.year === parseInt(selectedTimetableYear) &&
            t.section === selectedTimetableSection
        );

        if (existing) {
            setEditingTimetable(JSON.parse(JSON.stringify(existing.timetable)) as WeeklyTimeTable);
        } else {
            // Create a blank timetable
            const blank: WeeklyTimeTable = {
                monday: Array(8).fill(''),
                tuesday: Array(8).fill(''),
                wednesday: Array(8).fill(''),
                thursday: Array(8).fill(''),
                friday: Array(8).fill(''),
                saturday: Array(8).fill(''),
            };
            setEditingTimetable(blank);
        }

    }, [selectedTimetableYear, selectedTimetableSection, timetables, staffDepartment]);
    
    const handleTimetableCellChange = (day: keyof WeeklyTimeTable, periodIndex: number, value: string) => {
        if (!editingTimetable) return;
        const updatedTimetable = { ...editingTimetable };
        updatedTimetable[day][periodIndex] = value;
        setEditingTimetable(updatedTimetable);
    };

    const handleMergeRight = (day: keyof WeeklyTimeTable, periodIndex: number) => {
        if (!editingTimetable) return;

        const daySchedule = [...editingTimetable[day]];
        
        let currentColSpan = 1;
        for (let j = periodIndex + 1; j < daySchedule.length; j++) {
            if (daySchedule[j] === MERGED_CELL) { currentColSpan++; } 
            else { break; }
        }

        const nextPeriodIndex = periodIndex + currentColSpan;
        if (nextPeriodIndex >= daySchedule.length || daySchedule[nextPeriodIndex] === MERGED_CELL) return;

        if (daySchedule[nextPeriodIndex] && !daySchedule[periodIndex]) {
            daySchedule[periodIndex] = daySchedule[nextPeriodIndex];
        }
        
        daySchedule[nextPeriodIndex] = MERGED_CELL;
        
        const updatedTimetable = { ...editingTimetable };
        updatedTimetable[day] = daySchedule;
        setEditingTimetable(updatedTimetable);
    };
    
    const handleUnmerge = (day: keyof WeeklyTimeTable, periodIndex: number, colSpan: number) => {
        if (!editingTimetable) return;
        
        const daySchedule = [...editingTimetable[day]];
        for (let i = 1; i < colSpan; i++) {
            if (periodIndex + i < daySchedule.length) {
                daySchedule[periodIndex + i] = '';
            }
        }
        const updatedTimetable = { ...editingTimetable };
        updatedTimetable[day] = daySchedule;
        setEditingTimetable(updatedTimetable);
    };

    const handleSaveTimetable = () => {
        if (!editingTimetable || !selectedTimetableYear || !selectedTimetableSection) return;

        const updated: SectionTimeTable = {
            department: staffDepartment,
            year: parseInt(selectedTimetableYear),
            section: selectedTimetableSection,
            timetable: editingTimetable,
        };
        onUpdateTimetable(updated);
        showFeedback(`Timetable for Year ${selectedTimetableYear} - Section ${selectedTimetableSection} saved.`);
    };

    const handleSavePeriodTimes = (newTimes: string[]) => {
        onUpdatePeriodTimes(newTimes);
        showFeedback('Period times have been updated successfully.');
    };

    const renderTimetableManager = () => {
        const renderTableBody = () => {
            if (!editingTimetable) return null;
        
            return DAYS_OF_WEEK.map(day => {
                const cells: React.ReactElement[] = [];
                
                const daySchedule = editingTimetable[day];
                for (let i = 0; i < daySchedule.length; i++) {
                    const subject = daySchedule[i];
                    if (subject === MERGED_CELL) continue;
                    
                    let colSpan = 1;
                    for (let j = i + 1; j < daySchedule.length; j++) {
                        if (daySchedule[j] === MERGED_CELL) colSpan++;
                        else break;
                    }

                    cells.push(
                        <td key={i} colSpan={colSpan} className="px-1 py-1 relative group align-top border dark:border-gray-600">
                            <input 
                                type="text" 
                                value={subject}
                                onChange={e => handleTimetableCellChange(day, i, e.target.value)}
                                className="w-full h-12 p-1 border-none rounded bg-transparent focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 text-sm"
                            />
                            <div className="absolute top-1 right-1 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 p-0.5 rounded-full shadow">
                                {colSpan > 1 && (
                                    <button onClick={() => handleUnmerge(day, i, colSpan)} title="Unmerge cells" className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </button>
                                )}
                                {(i + colSpan) < daySchedule.length && (
                                    <button onClick={() => handleMergeRight(day, i)} title="Merge with next cell" className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </td>
                    );
                }
                
                return (
                    <tr key={day}>
                        <td className="capitalize p-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border dark:border-gray-600">{day}</td>
                        {cells}
                    </tr>
                );
            });
        };

        return (
            <InfoCard title={`Manage Timetables for ${staffDepartment} Department`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
                        <select value={selectedTimetableYear} onChange={e => setSelectedTimetableYear(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            {Object.keys(sectionsByYear).filter(y => sectionsByYear[y].length > 0).map(y => <option key={y} value={y}>{y}{yearSuffix(y)} Year</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                        <select value={selectedTimetableSection} onChange={e => setSelectedTimetableSection(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" disabled={!sectionsByYear[selectedTimetableYear]?.length}>
                            {sectionsByYear[selectedTimetableYear]?.length ? (
                                sectionsByYear[selectedTimetableYear].map(s => <option key={s} value={s}>{s}</option>)
                            ) : (
                                <option>No assigned sections</option>
                            )}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => setIsEditingTimes(true)} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 btn-interactive">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                            Edit Period Times
                        </button>
                    </div>
                </div>

                {editingTimetable ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border dark:border-gray-600">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase border dark:border-gray-600">Day</th>
                                    {periodTimes.map((time, index) => (
                                        <th key={index} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase border dark:border-gray-600">
                                            <div>P{index + 1}</div>
                                            <div className="font-normal normal-case">{time}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800">
                                {renderTableBody()}
                            </tbody>
                        </table>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSaveTimetable} className="px-6 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 btn-interactive">Save Timetable</button>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">Please select a year and section to manage its timetable.</p>
                )}
            </InfoCard>
        );
    }
    
    const handleAddNewNotice = (title: string, content: string) => {
        const newNotice: Omit<Notice, 'id'> = {
            title,
            content,
            authorName: currentUser.name,
            date: new Date().toISOString().split('T')[0],
            department: currentUser.department,
        };
        onAddNotice(newNotice);
        showFeedback('New notice has been posted successfully!');
    };

    const handleDeleteNoticeInternal = (noticeId: number) => {
        if (window.confirm("Are you sure you want to delete this notice? This action cannot be undone.")) {
            onDeleteNotice(noticeId);
            showFeedback('Notice deleted.');
        }
    };
    
    const renderNoticeManager = () => {
        const filteredNotices = notices
            .filter(n => n.department === staffDepartment)
            .filter(n => 
                noticeSearchQuery ? 
                n.title.toLowerCase().includes(noticeSearchQuery.toLowerCase()) || 
                n.content.toLowerCase().includes(noticeSearchQuery.toLowerCase()) : 
                true
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <InfoCard title={`Manage Notices for ${staffDepartment} Department`}>
                <div className="mb-4 space-y-4">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Search notices..."
                            value={noticeSearchQuery} 
                            onChange={e => setNoticeSearchQuery(e.target.value)} 
                            className="w-full p-2 pl-10 pr-10 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            aria-label="Search notices" 
                        />
                        {noticeSearchQuery && (
                            <button 
                                onClick={() => setNoticeSearchQuery('')} 
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                aria-label="Clear search"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setIsAddingNotice(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 btn-interactive">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            Create New Notice
                        </button>
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {filteredNotices.map(notice => (
                            <div key={notice.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{notice.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">By {notice.authorName} on {new Date(notice.date).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleDeleteNoticeInternal(notice.id)} className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 btn-interactive"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">{notice.content}</p>
                            </div>
                        ))
                    }
                </div>
            </InfoCard>
        );
    };

    const choiceCount = availableSections.length + (hasUnsectionedStudents ? 1 : 0);
    const isSectionFilterDisabled = choiceCount <= 1;

    const flatStudentList = useMemo(() => {
        const items: VirtualItem[] = [];
        Object.entries(filteredGroupedStudents).forEach(([year, sections]) => {
            const yearKey = `year-${year}`;
            const isYearCollapsed = collapsedGroups.includes(yearKey);
            items.push({
                type: 'header',
                id: yearKey,
                data: null,
                content: `${year}${yearSuffix(year)} Year`,
                count: Object.values(sections).flat().length,
                isCollapsed: isYearCollapsed,
                onClick: () => toggleGroupCollapse(yearKey),
            });

            if (!isYearCollapsed) {
                Object.entries(sections).forEach(([section, students]) => {
                    const sectionKey = `${yearKey}-section-${section}`;
                    const isSectionCollapsed = collapsedGroups.includes(sectionKey);
                    items.push({
                        type: 'header',
                        id: sectionKey,
                        data: null,
                        content: `Section ${section}`,
                        count: students.length,
                        isCollapsed: isSectionCollapsed,
                        onClick: () => toggleGroupCollapse(sectionKey),
                    });
                    if (!isSectionCollapsed) {
                        students.forEach(user => {
                            items.push({ type: 'user', id: `user-${user.id}`, data: user });
                        });
                    }
                });
            }
        });
        return items;
    }, [filteredGroupedStudents, collapsedGroups]);

    const totalFilteredStudents = Object.values(filteredGroupedStudents).flatMap(sections => Object.values(sections)).flat().length;

    const renderDetailPanel = () => {
        switch (activeTab) {
            case 'home':
                return renderHome();
            case 'timetable':
                return renderTimetableManager();
            case 'notices':
                return renderNoticeManager();
            case 'students':
                return renderEmptyState(); // Details now open in a modal
            case 'staff':
                return renderEmptyState(); // Staff detail view not implemented for staff role
            // Fix: Handle 'attendance' tab within the main layout.
            case 'attendance':
                return <AttendanceManager 
                    currentUser={currentUser}
                    allStudentData={allStudentData}
                    users={users}
                    periodTimes={periodTimes}
                    onUpdateMultipleStudentData={onUpdateMultipleStudentData}
                    showFeedback={showFeedback}
                />;
            default:
                return null;
        }
    };

    return (
    <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animated-grid" style={{ perspective: '1000px' }}>
            <div className="lg:col-span-1">
                <InfoCard title={`${staffDepartment} - Management`}>
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'home' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('home')}>Home</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'students' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('students')}>Students</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'staff' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('staff')}>Staff</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'attendance' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('attendance')}>Attendance</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'notices' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('notices')}>Notices</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'timetable' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('timetable')}>Timetable</button>
                    </div>

                    {(activeTab === 'students' || activeTab === 'staff') && (
                        <div className="space-y-4">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                </span>
                                <input 
                                    type="text" 
                                    placeholder={`Search ${activeTab}...`} 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    className="w-full p-2 pl-10 pr-10 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    aria-label="Search users" 
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')} 
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        aria-label="Clear search"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {activeTab === 'students' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label htmlFor="year-filter" className="sr-only">Filter by Year</label>
                                        <select
                                            id="year-filter"
                                            value={yearFilter}
                                            onChange={(e) => setYearFilter(e.target.value as 'all' | '1' | '2' | '3' | '4')}
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="all">All Years</option>
                                            {['1', '2', '3', '4'].map(year => {
                                                if (studentUsers.some(u => getStudentYear(allStudentData.find(d => d.userId === u.id)).toString() === year)) {
                                                    return <option key={year} value={year}>{year}{yearSuffix(year)} Year</option>;
                                                }
                                                return null;
                                            })}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <label htmlFor="section-filter" className="sr-only">Filter by Section</label>
                                        <select
                                            id="section-filter"
                                            value={sectionFilter}
                                            onChange={(e) => setSectionFilter(e.target.value)}
                                            disabled={isSectionFilterDisabled}
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSectionFilterDisabled ? (
                                                choiceCount === 0 ? <option value="all">No Sections</option> :
                                                sectionFilter === 'none' ? <option value="none">None</option> :
                                                <option value={sectionFilter}>Section {sectionFilter}</option>
                                            ) : (
                                                <>
                                                    <option value="all">All Sections</option>
                                                    {hasUnsectionedStudents && <option value="none">None</option>}
                                                    {availableSections.map(sec => (
                                                        <option key={sec} value={sec}>Section {sec}</option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="text-sm text-gray-500 dark:text-gray-400 px-1">
                                {activeTab === 'students' ? `Showing ${totalFilteredStudents} of ${studentUsers.length} students` : `Showing ${filteredStaff.length} of ${staffUsersInDepartment.length} staff`}
                            </div>
                            <div className="space-y-1">
                               {activeTab === 'students' ? (
                                <VirtualizedList
                                    items={flatStudentList}
                                    containerHeight={400}
                                    renderItem={(item) => {
                                        if (item.type === 'header') {
                                            return item.content.startsWith('Section') ? (
                                                 <button onClick={item.onClick} style={{height: VIRTUAL_ROW_HEIGHT}} className="w-full flex justify-between items-center text-left p-2 rounded bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 btn-interactive">
                                                     <span className="font-medium text-sm pl-4">{item.content}</span>
                                                      <span className="flex items-center">
                                                        <span className="text-xs bg-gray-300 dark:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-full px-2 py-0.5 mr-2">{item.count}</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${item.isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                     </span>
                                                 </button>
                                            ) : (
                                                <button onClick={item.onClick} style={{height: VIRTUAL_ROW_HEIGHT}} className="w-full flex justify-between items-center text-left p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 btn-interactive">
                                                    <span className="font-semibold">{item.content}</span>
                                                    <span className="flex items-center">
                                                        <span className="text-xs bg-gray-300 dark:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-full px-2 py-0.5 mr-2">{item.count}</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${item.isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </span>
                                                </button>
                                            )
                                        }
                                        const user = item.data as User;
                                        const studentData = allStudentData.find(sd => sd.userId === user.id);
                                        return (
                                            <div style={{height: VIRTUAL_ROW_HEIGHT}} className="pl-8">
                                                <button onClick={() => {
                                                    if(studentData) {
                                                        setSelectedStudent({ user, studentData });
                                                    }
                                                }} className={`w-full h-full text-left p-2 rounded-lg list-item-interactive ${selectedStudent?.user.id === user.id ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                    {user.name} ({user.rollNumber})
                                                </button>
                                            </div>
                                        )
                                    }}
                                />
                               ) : (
                                <VirtualizedList
                                    items={filteredStaff.map(user => ({ type: 'user', id: `user-${user.id}`, data: user }))}
                                    containerHeight={400}
                                    renderItem={(item) => {
                                        const user = item.data as User;
                                        return (
                                            <div style={{height: VIRTUAL_ROW_HEIGHT}}>
                                            <button
                                              onClick={() => setSelectedUserId(user.id)}
                                              className={`w-full h-full text-left p-2 list-item-interactive ${selectedUserId === user.id ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                            >
                                              {user.name} ({user.rollNumber})
                                            </button>
                                            </div>
                                        );
                                    }}
                                />
                               )}
                            </div>
                        </div>
                    )}
                </InfoCard>
                {feedback && <div className="mt-4 p-2 text-center text-sm text-green-800 bg-green-100 dark:text-green-100 dark:bg-green-800 rounded">{feedback}</div>}
            </div>
            <div className="lg:col-span-2">
                 <div className="anim-content-block">
                    {renderDetailPanel()}
                 </div>
            </div>
        </div>

        {selectedStudent && (
             <div className="fixed inset-0 z-50 bg-black/60 anim-modal-backdrop">
                <div className="bg-gray-100 dark:bg-slate-900 w-full h-full anim-modal-content">
                    <StudentDetailsPanel
                        key={selectedStudent.user.id}
                        selectedUser={selectedStudent.user}
                        selectedStudentData={selectedStudent.studentData}
                        editingSection={editingSection}
                        editingUser={editingUser}
                        editingData={editingData}
                        setEditingUser={setEditingUser}
                        setEditingData={setEditingData}
                        activeAcademicPeriodTab={activeAcademicPeriodTab}
                        setActiveAcademicPeriodTab={setActiveAcademicPeriodTab}
                        newAttendanceRecord={newAttendanceRecord}
                        setNewAttendanceRecord={setNewAttendanceRecord}
                        isViewingIdCard={isViewingIdCard}
                        setIsViewingIdCard={setIsViewingIdCard}
                        renderActionButtons={renderActionButtons}
                        renderEditIcon={renderEditIcon}
                        handleProfilePhotoChange={handleProfilePhotoChange}
                        handleUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                        handleRemoveAttendanceRecord={handleRemoveAttendanceRecord}
                        handleAddAttendanceRecord={handleAddAttendanceRecord}
                        handleFeeChange={handleFeeChange}
                        handleAddFeeYear={handleAddFeeYear}
                        handleMidTermMarkChange={handleMidTermMarkChange}
                        handleRemoveMidTermMarkItem={handleRemoveMidTermMarkItem}
                        handleAddMidTermMarkItem={handleAddMidTermMarkItem}
                        handleMarkChange={handleMarkChange}
                        handleRemoveMarkItem={handleRemoveMarkItem}
                        handleAddMarkItem={handleAddMarkItem}
                        handleSemesterCreditsChange={handleSemesterCreditsChange}
                        handleImportantUpdateChange={handleImportantUpdateChange}
                        handleRemoveImportantUpdate={handleRemoveImportantUpdate}
                        handleAddImportantUpdate={handleAddImportantUpdate}
                        onClose={() => setSelectedStudent(null)}
                    />
                </div>
             </div>
        )}

        {isAddingStudent && <AddStudentModal onClose={() => setIsAddingStudent(false)} onAdd={handleAddStudentInternal} staffAssignments={currentUser.assignments} allUsers={users} />}
        {isAddingNotice && <AddNoticeModal onClose={() => setIsAddingNotice(false)} onAdd={handleAddNewNotice} />}
        {isEditingTimes && <EditTimesModal currentTimes={periodTimes} onClose={() => setIsEditingTimes(false)} onSave={handleSavePeriodTimes} />}
        {isImportingStudents && <ImportStudentsModal onClose={() => setIsImportingStudents(false)} onImport={handleAddMultipleStudentsWrapper} existingRollNumbers={users.map(u => u.rollNumber)} />}
        {isImportingAttendance && (
          <ImportAttendanceModal
            onClose={() => setIsImportingAttendance(false)}
            onImport={handleImportAttendanceWrapper}
            students={studentUsers}
            allStudentData={allStudentData}
          />
        )}
    </>
    );
};

const StudentDetailsPanel: React.FC<any> = ({
    selectedUser, selectedStudentData, editingSection, editingUser, editingData, setEditingUser, setEditingData,
    activeAcademicPeriodTab, setActiveAcademicPeriodTab, newAttendanceRecord, setNewAttendanceRecord,
    isViewingIdCard, setIsViewingIdCard, renderActionButtons, renderEditIcon, handleProfilePhotoChange,
    handleUpdateAttendanceRecord, handleRemoveAttendanceRecord, handleAddAttendanceRecord,
    handleFeeChange, handleAddFeeYear, handleMidTermMarkChange, handleRemoveMidTermMarkItem,
    handleAddMidTermMarkItem, handleMarkChange, handleRemoveMarkItem, handleAddMarkItem,
    handleSemesterCreditsChange, handleImportantUpdateChange, handleRemoveImportantUpdate,
    handleAddImportantUpdate, onClose
}) => {
    if (!selectedUser || !editingUser) return null;
    const isStudent = selectedUser.role === Role.STUDENT && selectedStudentData && editingData;
    if (!isStudent) return null;

    const studentDataTyped = editingData as StudentData;

    const overallAttendance = calculateOverallAttendance(studentDataTyped.monthlyAttendance);
    
    // Explicitly cast fees to ensure correct typing for reduce operations
    const fees = studentDataTyped.fees as { [key: string]: YearlyFee };
    const totalFees = (Object.values(fees) as YearlyFee[]).reduce((acc, year) => acc + year.installment1.total + year.installment2.total, 0);
    const totalPaid = (Object.values(fees) as YearlyFee[]).reduce((acc, year) => acc + year.installment1.paid + year.installment2.paid, 0);

    return (
        <div className="relative h-full flex flex-col">
            <div className="px-4 py-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div>
                    <h3 className="text-xl leading-6 font-bold text-gray-900 dark:text-white">{selectedUser.name}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{selectedUser.rollNumber}</p>
                </div>
                <button onClick={onClose} className="inline-flex items-center space-x-2 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 btn-interactive">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Back</span>
                </button>
            </div>
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
                <InfoCard
                    title="Profile Information"
                    actions={
                        <div className="flex items-center space-x-4">
                            {editingSection !== 'profile' && <button onClick={() => setIsViewingIdCard(true)} className="text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-500 dark:hover:text-purple-400 btn-interactive">View ID</button>}
                            {editingSection === 'profile' ? renderActionButtons('profile') : renderEditIcon('profile')}
                        </div>
                    }
                >
                    {editingSection === 'profile' ? (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center space-y-2 mb-4">
                                <div className="relative group w-24 h-24">
                                    {editingUser.photoUrl ? (
                                        <img src={editingUser.photoUrl} alt={editingUser.name} className="w-24 h-24 rounded-full object-cover" />
                                    ) : (
                                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                    <label htmlFor="edit-profile-photo" className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full cursor-pointer transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </label>
                                    <input id="edit-profile-photo" type="file" className="hidden" accept="image/*" onChange={handleProfilePhotoChange} />
                                </div>
                            </div>
                            <input type="text" placeholder="Full Name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                            <input type="text" placeholder="Roll Number" value={editingUser.rollNumber} onChange={e => setEditingUser({...editingUser, rollNumber: e.target.value.toUpperCase()})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                            <input type="text" placeholder="Section" value={editingUser.section || ''} onChange={e => setEditingUser({...editingUser, section: e.target.value.toUpperCase()})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                            <input type="email" placeholder="Email Address" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                            <input type="tel" placeholder="Phone Number" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                            <input type="text" placeholder="Enter new password to change" onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                    ) : (
                        <div className="space-y-1 text-sm"><p><strong>Name:</strong> {selectedUser.name}</p><p><strong>Roll No:</strong> {selectedUser.rollNumber}</p><p><strong>Email:</strong> {selectedUser.email || 'N/A'}</p><p><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</p><p><strong>Dept:</strong> {selectedUser.department}</p><p><strong>Section:</strong> {selectedUser.section || 'N/A'}</p></div>
                    )}
                </InfoCard>
                <InfoCard title="Attendance" actions={editingSection === 'attendance' ? renderActionButtons('attendance') : renderEditIcon('attendance')}>
                    {editingSection === 'attendance' ? (
                        <div className="space-y-4">
                           <div className="overflow-y-auto max-h-48 pr-2">
                                <table className="min-w-full text-sm">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-2 py-1 text-left">Month</th>
                                            <th className="px-2 py-1 text-left">Year</th>
                                            <th className="px-2 py-1 text-left">Present</th>
                                            <th className="px-2 py-1 text-left">Total</th>
                                            <th className="px-2 py-1"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800">
                                    {editingData.monthlyAttendance.map((record: AttendanceRecord, index: number) => (
                                        <tr key={index}>
                                            <td className="px-2 py-1"><select value={record.month} onChange={(e) => handleUpdateAttendanceRecord(index, 'month', e.target.value)} className="w-full p-1 border rounded bg-transparent dark:bg-gray-700 dark:border-gray-600">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></td>
                                            <td className="px-2 py-1"><input type="number" value={record.year} onChange={(e) => handleUpdateAttendanceRecord(index, 'year', e.target.value)} className="w-20 p-1 border rounded bg-transparent dark:bg-gray-700 dark:border-gray-600"/></td>
                                            <td className="px-2 py-1"><input type="number" value={record.present} onChange={(e) => handleUpdateAttendanceRecord(index, 'present', e.target.value)} className="w-16 p-1 border rounded bg-transparent dark:bg-gray-700 dark:border-gray-600"/></td>
                                            <td className="px-2 py-1"><input type="number" value={record.total} onChange={(e) => handleUpdateAttendanceRecord(index, 'total', e.target.value)} className="w-16 p-1 border rounded bg-transparent dark:bg-gray-700 dark:border-gray-600"/></td>
                                            <td className="px-2 py-1 text-center"><button onClick={() => handleRemoveAttendanceRecord(index)} className="p-1 text-red-500 hover:text-red-700">✖</button></td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                             <div className="flex items-center space-x-2 border-t dark:border-gray-700 pt-2 mt-2">
                                <select value={newAttendanceRecord.month} onChange={(e) => setNewAttendanceRecord(prev => ({ ...prev, month: e.target.value }))} className="flex-1 p-1 border rounded dark:bg-gray-700 dark:border-gray-600">
                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input type="number" placeholder="Year" value={newAttendanceRecord.year} onChange={(e) => setNewAttendanceRecord(prev => ({ ...prev, year: e.target.value }))} className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                                <input type="number" placeholder="Present" value={newAttendanceRecord.present} onChange={(e) => setNewAttendanceRecord(prev => ({ ...prev, present: e.target.value }))} className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                                <input type="number" placeholder="Total" value={newAttendanceRecord.total} onChange={(e) => setNewAttendanceRecord(prev => ({ ...prev, total: e.target.value }))} className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                                <button onClick={handleAddAttendanceRecord} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Add</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xl font-semibold">{overallAttendance}% Overall Attendance</p>
                             <div className="overflow-x-auto max-h-48">
                                <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th scope="col" className="py-2 px-4">Month & Year</th>
                                            <th scope="col" className="py-2 px-4">Present</th>
                                            <th scope="col" className="py-2 px-4">Total Days</th>
                                            <th scope="col" className="py-2 px-4">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {editingData.monthlyAttendance.map((record: AttendanceRecord, index: number) => {
                                            const percentage = record.total > 0 ? Math.round((record.present / record.total) * 100) : 0;
                                            return (
                                            <tr key={index}>
                                                <td className="py-2 px-4">{record.month} {record.year}</td>
                                                <td className="py-2 px-4">{record.present}</td>
                                                <td className="py-2 px-4">{record.total}</td>
                                                <td className="py-2 px-4">{percentage}%</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </InfoCard>
                <InfoCard title="Fee Status" actions={editingSection === 'fees' ? renderActionButtons('fees') : renderEditIcon('fees')}>
                     {editingSection === 'fees' ? (
                        <div className="space-y-4">
                           {Object.entries(editingData.fees).map(([yearKey, yearData]: [string, YearlyFee]) => (
                                <div key={yearKey} className="p-2 border rounded dark:border-gray-600">
                                    <h4 className="font-semibold text-center">{`Year ${yearKey.replace('year','')}`}</h4>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>
                                            <p className="text-sm font-medium">Installment 1</p>
                                            <input type="number" value={yearData.installment1.total} onChange={e => handleFeeChange(yearKey, 'installment1', 'total', e.target.value)} className="w-full p-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Total"/>
                                            <input type="number" value={yearData.installment1.paid} onChange={e => handleFeeChange(yearKey, 'installment1', 'paid', e.target.value)} className="w-full p-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Paid"/>
                                            <input type="date" value={yearData.installment1.dueDate} onChange={e => handleFeeChange(yearKey, 'installment1', 'dueDate', e.target.value)} className="w-full p-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Due Date"/>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Installment 2</p>
                                            <input type="number" value={yearData.installment2.total} onChange={e => handleFeeChange(yearKey, 'installment2', 'total', e.target.value)} className="w-full p-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Total"/>
                                            <input type="number" value={yearData.installment2.paid} onChange={e => handleFeeChange(yearKey, 'installment2', 'paid', e.target.value)} className="w-full p-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Paid"/>
                                            <input type="date" value={yearData.installment2.dueDate} onChange={e => handleFeeChange(yearKey, 'installment2', 'dueDate', e.target.value)} className="w-full p-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Due Date"/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddFeeYear} className="w-full text-sm py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">Add Fee Year</button>
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <p><strong>Total Fees:</strong> ₹{totalFees.toLocaleString()}</p>
                            <p><strong>Fees Paid:</strong> ₹{totalPaid.toLocaleString()}</p>
                            <p><strong>Amount Due:</strong> ₹{(totalFees - totalPaid).toLocaleString()}</p>
                        </div>
                    )}
                </InfoCard>
                <InfoCard title="Academic Records" actions={editingSection === 'academics' ? renderActionButtons('academics') : renderEditIcon('academics')}>
                   {editingSection === 'academics' ? (
                       <p>Editable academic records form would be here.</p>
                   ) : (
                       <p>Read-only academic records would be here.</p>
                   )}
                </InfoCard>
                <InfoCard title="Important Updates" actions={editingSection === 'updates' ? renderActionButtons('updates') : renderEditIcon('updates')}>
                    {editingSection === 'updates' ? (
                        <div className="space-y-2">
                            {editingData.importantUpdates.map((update: ImportantUpdate, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <input type="date" value={update.date} onChange={e => handleImportantUpdateChange(index, 'date', e.target.value)} className="p-1 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                                    <input type="text" value={update.text} onChange={e => handleImportantUpdateChange(index, 'text', e.target.value)} className="flex-1 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                                    <button onClick={() => handleRemoveImportantUpdate(index)} className="p-1 text-red-500 hover:text-red-700">✖</button>
                                </div>
                            ))}
                            <button onClick={handleAddImportantUpdate} className="w-full text-sm py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">Add Update</button>
                        </div>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {editingData.importantUpdates.length > 0 ? editingData.importantUpdates.map((update: ImportantUpdate, index: number) => (
                                <li key={index}><strong>{update.date}:</strong> {update.text}</li>
                            )) : <li>No important updates.</li>}
                        </ul>
                    )}
                </InfoCard>
            </div>
            {isViewingIdCard && (
                <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
                    <IdCard user={selectedUser} studentData={selectedStudentData} onClose={() => setIsViewingIdCard(false)} />
                </div>
            )}
        </div>
    )
};

export default StaffView;