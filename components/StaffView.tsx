import React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { StudentData, User, Role, YearMarks, MarkItem, ParsedStudent, AttendanceRecord, ParsedAttendanceRecord, ImportantUpdate, MidTermMarks, MidTermSubject, FeeInstallment, YearlyFee, SectionTimeTable, WeeklyTimeTable, Notice, DailyAttendanceStatus, CourseMaterial } from '../types';
import { GRADE_POINTS, DEPARTMENTS, DEPARTMENT_CODES } from '../constants';
import InfoCard from './InfoCard';
import IdCard from './IdCard';
import ImportStudentsModal from './ImportStudentsModal';
import ImportAttendanceModal from './ImportAttendanceModal';
import { generateNoticeDraft, analyzeDocumentForMaterial } from '../services/geminiService';

export type StaffViewType = 'attendance' | 'timetable' | 'notices' | 'materials' | 'students' | 'profile' | 'tracking';

interface StaffViewProps {
  currentUser: User;
  users: User[];
  allStudentData: StudentData[];
  timetables: SectionTimeTable[];
  notices: Notice[];
  periodTimes: string[];
  materials: CourseMaterial[];
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
  onAddMaterial: (material: CourseMaterial) => void;
  onDeleteMaterial: (materialId: number) => void;
  activeView: StaffViewType;
  setActiveView: (view: StaffViewType) => void;
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

const isMidTermKey = (key: string): boolean => key.startsWith('mid');

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_WEEK: (keyof WeeklyTimeTable)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const ChangePasswordModal: React.FC<{
  onClose: () => void;
  onSubmit: (currentPass: string, newPass: string) => boolean;
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
        const success = onSubmit(currentPassword, newPassword);
        if (success) {
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

const AddStudentModal: React.FC<{
    onClose: () => void;
    onAdd: (name: string, rollNumber: string, isLateral: boolean, pass: string, department: string, year: string, section: string, email: string, phone: string, photoUrl?: string) => void;
    staffAssignments: { department: string; year: number; section: string }[] | undefined;
    allUsers: User[];
}> = ({ onClose, onAdd, staffAssignments = [], allUsers }) => {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [password, setPassword] = useState('password123');
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

const AddNoticeModal: React.FC<{ onClose: () => void, onAdd: (title: string, content: string) => void, authorName: string, department: string }> = ({ onClose, onAdd, authorName, department }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [draftTopic, setDraftTopic] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            setError('Title and content cannot be empty.');
            return;
        }
        onAdd(title, content);
        onClose();
    };

    const handleDraft = async () => {
        if (!draftTopic.trim()) return;
        setIsDrafting(true);
        try {
            const draft = await generateNoticeDraft(draftTopic, authorName, department);
            setTitle(draft.title);
            setContent(draft.content);
            setError('');
        } catch (e) {
            setError("Failed to generate draft. Please try again.");
        } finally {
            setIsDrafting(false);
        }
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg anim-modal-content">
                <h2 className="text-2xl font-bold mb-4">Create New Notice</h2>
                
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                    <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8m1-13h-2v5h2zm0 6h-2v2h2z"/></svg> 
                        Draft with Gemini AI
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="E.g., Holiday for Diwali, Guest Lecture on AI..." 
                            value={draftTopic}
                            onChange={e => setDraftTopic(e.target.value)}
                            className="flex-grow p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                        <button 
                            onClick={handleDraft} 
                            disabled={isDrafting || !draftTopic}
                            className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 btn-interactive flex items-center gap-1"
                        >
                            {isDrafting ? 'Drafting...' : 'Generate'}
                            {!isDrafting && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                        </button>
                    </div>
                </div>

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

const AddMaterialModal: React.FC<{ 
    onClose: () => void, 
    onAdd: (title: string, description: string, file: File, department: string, year: string, section: string) => void,
    assignments: { department: string; year: number; section: string }[]
}> = ({ onClose, onAdd, assignments }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [target, setTarget] = useState(assignments[0] ? `${assignments[0].department}-${assignments[0].year}-${assignments[0].section}` : '');
    const [error, setError] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSubmit = () => {
        if (!title.trim() || !description.trim() || !file || !target) {
            setError('All fields are required.');
            return;
        }
        const [department, year, section] = target.split('-');
        onAdd(title, description, file, department, year, section);
        onClose();
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setIsAnalyzing(true);
        setError('');
        try {
            const result = await analyzeDocumentForMaterial(file);
            setTitle(result.title);
            setDescription(result.description);
        } catch (e) {
            setError("Analysis failed. Please fill details manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg anim-modal-content">
                <h2 className="text-2xl font-bold mb-4">Upload Course Material</h2>
                <div className="space-y-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign to Class</label>
                         <select value={target} onChange={e => setTarget(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            {assignments.map(a => <option key={`${a.department}-${a.year}-${a.section}`} value={`${a.department}-${a.year}-${a.section}`}>{a.department} - Year {a.year} - Sec {a.section}</option>)}
                         </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select File (PDF, Image, Word)</label>
                        <input 
                            type="file" 
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                        {file && (
                            <div className="mt-2">
                                <button 
                                    onClick={handleAnalyze} 
                                    disabled={isAnalyzing}
                                    className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium flex items-center gap-1"
                                >
                                    {isAnalyzing ? (
                                       <>Processing...</>
                                    ) : (
                                       <>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                                         Auto-fill details with Gemini AI
                                       </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="Material Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <textarea
                        placeholder="Description..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 h-24"
                    />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Upload</button>
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

const LiveTrackerDashboard: React.FC<{
    users: User[],
    allStudentData: StudentData[],
    assignments: { department: string; year: number; section: string }[]
}> = ({ users, allStudentData, assignments }) => {
    const [selectedAssignmentKey, setSelectedAssignmentKey] = useState<string>('');
    const assignmentMap = useMemo(() => new Map(assignments.map(a => [`${a.department}-${a.year}-${a.section}`, a])), [assignments]);
    const selectedAssignment = selectedAssignmentKey ? assignmentMap.get(selectedAssignmentKey) : null;

    useEffect(() => {
        if (!selectedAssignmentKey && assignments.length > 0) {
            const first = assignments[0];
            setSelectedAssignmentKey(`${first.department}-${first.year}-${first.section}`);
        }
    }, [assignments, selectedAssignmentKey]);

    // Filter students who are SHARING location in this class
    const trackedStudents = useMemo(() => {
        if (!selectedAssignment) return [];
        return users.filter(u => {
            if (u.role !== Role.STUDENT) return false;
            const data = allStudentData.find(d => d.userId === u.id);
            if (!data) return false;
            
            const matchesClass = u.department === selectedAssignment.department &&
                                 getStudentYear(data) === selectedAssignment.year &&
                                 u.section === selectedAssignment.section;
            
            return matchesClass && data.location?.isSharing;
        }).map(u => ({
            user: u,
            location: allStudentData.find(d => d.userId === u.id)!.location!
        }));
    }, [users, allStudentData, selectedAssignment]);

    // Mock map plotting: Since we don't have real map tiles, we use a relative grid.
    // In a real app, this would use Leaflet/Google Maps.
    // For this visual, we assume a bounding box or just hash Lat/Lng to X/Y percentages for demo effect.
    const plotOnMap = (lat: number, lng: number) => {
        // Pseudo-random consistent position based on coords for demo if they are close, 
        // OR just simple mapping if we assume a specific campus bounding box.
        // Let's assume a small campus range. 
        // Center: 0,0 relative. 
        // For the demo, we will generate X/Y based on the decimal part of lat/lng to spread them on the canvas.
        
        const x = (Math.abs(lng * 1000) % 100); 
        const y = (Math.abs(lat * 1000) % 100);
        return { x: `${x}%`, y: `${y}%` };
    };

    return (
        <InfoCard title="Live Student Tracking">
             <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Class to Track</label>
                <select 
                    value={selectedAssignmentKey} 
                    onChange={e => setSelectedAssignmentKey(e.target.value)} 
                    className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                    {assignments.map(a => <option key={`${a.department}-${a.year}-${a.section}`} value={`${a.department}-${a.year}-${a.section}`}>{a.department} - Year {a.year} - Sec {a.section}</option>)}
                </select>
            </div>

            <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-inner group">
                {/* Decorative Map Grid */}
                <div className="absolute inset-0 opacity-20" style={{ 
                    backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)', 
                    backgroundSize: '20px 20px' 
                }}></div>
                
                {/* Radar Sweep Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent w-full h-full animate-[spin_4s_linear_infinite] opacity-30 origin-bottom-right"></div>
                
                {/* Center Campus Marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                    <span className="text-[10px] text-blue-400 mt-1 font-mono">CAMPUS HUB</span>
                </div>

                {/* Student Dots */}
                {trackedStudents.map(({ user, location }) => {
                    const pos = plotOnMap(location.lat, location.lng);
                    return (
                        <div 
                            key={user.id} 
                            className="absolute flex flex-col items-center group/marker transition-all duration-1000"
                            style={{ left: pos.x, top: pos.y }}
                        >
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                            <div className="absolute top-4 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity">
                                {user.name} ({user.rollNumber})
                                <br/>
                                <span className="text-gray-400">Last seen: {new Date(location.lastUpdated).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    );
                })}
                
                {trackedStudents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        No students in this class are currently sharing location.
                    </div>
                )}
            </div>
            
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p>Found {trackedStudents.length} active students.</p>
            </div>
        </InfoCard>
    );
};

type EditableSection = 'profile' | 'attendance' | 'fees' | 'academics' | 'updates' | null;

const StaffView: React.FC<StaffViewProps> = ({ currentUser, users, allStudentData, timetables, notices, periodTimes, materials, onUpdateUser, onUpdateStudentData, onUpdateMultipleStudentData, onAddStudent, onAddMultipleStudents, onUpdateMultipleAttendance, onUpdateTimetable, onUpdatePeriodTimes, onAddNotice, onDeleteNotice, onBiometricSetup, onAddMaterial, onDeleteMaterial, activeView, setActiveView }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [noticeSearchQuery, setNoticeSearchQuery] = useState('');
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [isImportingStudents, setIsImportingStudents] = useState(false);
    const [isImportingAttendance, setIsImportingAttendance] = useState(false);
    const [isAddingNotice, setIsAddingNotice] = useState(false);
    const [isEditingTimes, setIsEditingTimes] = useState(false);
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    const [feedback, setFeedback] = useState('');
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

    useEffect(() => {
        // When the active tab changes, always reset the selection.
        setSelectedStudent(null);
        setSelectedUserId(null);

        // Reset filters when tab changes
        setSearchQuery('');
        setNoticeSearchQuery('');
        setYearFilter('all');
        setSectionFilter('all');
    }, [activeView]);

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
        let dataToUse = studentData;
        
        // If we are editing but data is missing (e.g. newly added student), initialize it
        if (!studentData && user && section) {
             const newId = user.id;
             dataToUse = {
                id: newId, userId: newId, monthlyAttendance: [], fees: {}, importantUpdates: [],
                mid_1: null, mid_2: null, year1_1: null, year1_2: null, year2_1: null, year2_2: null, year3_1: null, year3_2: null, year4_1: null, year4_2: null
             };
        }

        setEditingData(dataToUse ? JSON.parse(JSON.stringify(dataToUse)) : null);
        setEditingSection(section);
    };

    const handleSave = () => {
        if (editingSection === 'profile' && editingUser) {
            onUpdateUser(editingUser);
        } else if (editingData) {
            onUpdateStudentData(editingData);
        }
        showFeedback('Changes saved successfully!');
        setEditingSection(null);
        
        // Update selected student ref
        if (selectedStudent) {
             setSelectedStudent({
                 user: editingUser || selectedStudent.user,
                 studentData: editingData || selectedStudent.studentData
             });
        }
    };

    const handleCancel = () => {
        setEditingSection(null);
        const user = selectedStudent?.user;
        const studentData = selectedStudent?.studentData;
        setEditingUser(user ? { ...user } : null);
        setEditingData(studentData ? JSON.parse(JSON.stringify(studentData)) : null);
    };
    
    const handleAddUpdate = () => {
        if (!newStaffUpdateText.trim() || !editingData) return;
        const updatedUpdates = [...editingData.importantUpdates, { date: new Date().toISOString().split('T')[0], text: newStaffUpdateText }];
        setEditingData({ ...editingData, importantUpdates: updatedUpdates });
        setNewStaffUpdateText('');
    };

    const handleRemoveUpdate = (index: number) => {
         if (!editingData) return;
         const updatedUpdates = editingData.importantUpdates.filter((_, i) => i !== index);
         setEditingData({ ...editingData, importantUpdates: updatedUpdates });
    };

    const handleMarkChange = (subjectIndex: number, field: 'grade' | 'credits' | 'score' | 'maxScore', value: string) => {
        if (!editingData) return;
        
        // Deep copy needed for nested objects
        const newData = JSON.parse(JSON.stringify(editingData));
        const currentPeriodData = newData[activeAcademicPeriodTab];
        
        if (!currentPeriodData) return;

        if (isMidTermKey(activeAcademicPeriodTab)) {
             const subjects = (currentPeriodData as MidTermMarks).subjects;
             if (field === 'score' || field === 'maxScore') {
                 subjects[subjectIndex][field] = Number(value);
             }
        } else {
             // It's a YearMarks object
             const subjects = (currentPeriodData as YearMarks).subjects;
             const labs = (currentPeriodData as YearMarks).labs;
             
             if (subjectIndex < subjects.length) {
                 if (field === 'grade') subjects[subjectIndex].grade = value;
                 if (field === 'credits') subjects[subjectIndex].credits = Number(value);
             } else {
                 const labIndex = subjectIndex - subjects.length;
                  if (field === 'grade') labs[labIndex].grade = value;
                  if (field === 'credits') labs[labIndex].credits = Number(value);
             }
             
             // Recalculate totals
             let totalCredits = 0;
             let earnedCredits = 0; // Simplified logic: if grade is not F, credit is earned
             [...subjects, ...labs].forEach(item => {
                 totalCredits += item.credits;
                 if (item.grade !== 'F') earnedCredits += item.credits;
             });
             (currentPeriodData as YearMarks).totalCredits = totalCredits;
             (currentPeriodData as YearMarks).earnedCredits = earnedCredits;
        }
        setEditingData(newData);
    };

    const handleAttendanceRecordAdd = () => {
        if (!editingData) return;
        const existingIndex = editingData.monthlyAttendance.findIndex(r => r.month === newAttendanceRecord.month && r.year === parseInt(newAttendanceRecord.year));
        
        const newRecord: AttendanceRecord = {
            month: newAttendanceRecord.month,
            year: parseInt(newAttendanceRecord.year),
            present: parseInt(newAttendanceRecord.present) || 0,
            total: parseInt(newAttendanceRecord.total) || 0
        };

        let newAttendance = [...editingData.monthlyAttendance];
        if (existingIndex >= 0) {
            newAttendance[existingIndex] = newRecord;
        } else {
            newAttendance.push(newRecord);
        }
        
        setEditingData({ ...editingData, monthlyAttendance: newAttendance });
        setNewAttendanceRecord({ ...newAttendanceRecord, present: '', total: '' });
    };

    const handleDeleteAttendanceRecord = (index: number) => {
         if (!editingData) return;
         const newAttendance = editingData.monthlyAttendance.filter((_, i) => i !== index);
         setEditingData({ ...editingData, monthlyAttendance: newAttendance });
    };
    
    // --- TIMETABLE HANDLERS ---
    
    const handleTimetableCellChange = (day: keyof WeeklyTimeTable, periodIndex: number, value: string) => {
        if (!editingTimetable) return;
        const newSchedule = [...editingTimetable[day]];
        newSchedule[periodIndex] = value;
        setEditingTimetable({
            ...editingTimetable,
            [day]: newSchedule
        });
    };

    const handleMergeRight = (day: keyof WeeklyTimeTable, periodIndex: number) => {
        if (!editingTimetable) return;
        const currentSchedule = editingTimetable[day];
        if (periodIndex >= currentSchedule.length - 1) return;

        const newSchedule = [...currentSchedule];
        // The cell to the right becomes merged
        newSchedule[periodIndex + 1] = MERGED_CELL;
        setEditingTimetable({ ...editingTimetable, [day]: newSchedule });
    };

    const handleUnmerge = (day: keyof WeeklyTimeTable, periodIndex: number) => {
        if (!editingTimetable) return;
        const currentSchedule = editingTimetable[day];
        // If current cell is not merged, nothing to do (unless we are unmerging a source cell which implies clearing next cells?)
        // Logic: If I am at index i, and i+1 is merged, unmerge i+1.
        // OR: If I am a merged cell, become empty?
        // Let's assume we unmerge the cell to the right if it is merged.
        if (periodIndex < currentSchedule.length - 1 && currentSchedule[periodIndex + 1] === MERGED_CELL) {
             const newSchedule = [...currentSchedule];
             newSchedule[periodIndex + 1] = ''; // Reset to empty string
             setEditingTimetable({ ...editingTimetable, [day]: newSchedule });
        }
    };


    const handleSaveTimetable = () => {
        if (editingTimetable) {
            onUpdateTimetable({
                department: currentUser.department,
                year: parseInt(selectedTimetableYear),
                section: selectedTimetableSection,
                timetable: editingTimetable
            });
            showFeedback('Timetable saved successfully!');
        }
    };
    
    useEffect(() => {
        if (activeView === 'timetable' && currentUser.assignments && currentUser.assignments.length > 0) {
            // Default to first assignment if not set or invalid
             const validAssignment = currentUser.assignments.find(a => 
                a.year.toString() === selectedTimetableYear && a.section === selectedTimetableSection
            );
            
            if (!validAssignment) {
                 const first = currentUser.assignments[0];
                 setSelectedTimetableYear(first.year.toString());
                 setSelectedTimetableSection(first.section);
            }
        }
    }, [activeView, currentUser.assignments]);


    useEffect(() => {
        if (activeView === 'timetable') {
            const currentTimetable = timetables.find(t => 
                t.department === currentUser.department && 
                t.year.toString() === selectedTimetableYear && 
                t.section === selectedTimetableSection
            );
            
            if (currentTimetable) {
                setEditingTimetable(JSON.parse(JSON.stringify(currentTimetable.timetable)));
            } else {
                 // Initialize empty timetable
                 const emptyDay = Array(8).fill('');
                 setEditingTimetable({
                     monday: [...emptyDay], tuesday: [...emptyDay], wednesday: [...emptyDay],
                     thursday: [...emptyDay], friday: [...emptyDay], saturday: [...emptyDay]
                 });
            }
        }
    }, [activeView, selectedTimetableYear, selectedTimetableSection, timetables, currentUser.department]);

    const handleImportStudents = (allParsedStudents: ParsedStudent[]) => {
        const newUsers: User[] = [];
        const newStudentDataItems: StudentData[] = [];
        const skippedStudents: string[] = [];
        
        // Helper to check against all existing users + ones we are about to add
        const existingRollNumbers = new Set(users.map(u => u.rollNumber));

        allParsedStudents.forEach(pStudent => {
            // Only import students for assignments the staff member has
            const hasAssignment = currentUser.assignments?.some(a => 
                a.department === pStudent.department && 
                a.year.toString() === pStudent.year && 
                a.section === pStudent.section
            );

            if (!hasAssignment) {
                skippedStudents.push(`${pStudent.name} (No assignment for ${pStudent.department}-${pStudent.year}-${pStudent.section})`);
                return;
            }

            const studentYear = parseInt(pStudent.year, 10);
            
            let finalRollNumber = pStudent.rollNumber?.trim();
            let isDuplicate = false;

            if (finalRollNumber) {
                 isDuplicate = existingRollNumbers.has(finalRollNumber);
            } else {
                 // Generate if missing
                 finalRollNumber = generateRollNumber(
                     pStudent.department, 
                     studentYear, 
                     pStudent.isLateralEntry || false, 
                     [...users, ...newUsers]
                 );
                 isDuplicate = existingRollNumbers.has(finalRollNumber);
            }

            if (isDuplicate) {
                skippedStudents.push(`${pStudent.name} (Duplicate Roll No: ${finalRollNumber})`);
                return;
            }
            
             if (!finalRollNumber) {
                 skippedStudents.push(`${pStudent.name} (Could not generate Roll No)`);
                return;
            }

            const newId = Date.now() + Math.random();
            const newUser: User = {
                id: newId,
                name: pStudent.name,
                rollNumber: finalRollNumber,
                password: 'password123', // Default password for imported students
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
            // Simple default fee structure if not parsed
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
            existingRollNumbers.add(finalRollNumber);
        });

        if (newUsers.length > 0) {
            onAddMultipleStudents(newUsers, newStudentDataItems);
        }
        
        let feedbackMessage = `Import processed.`;
        if (newUsers.length > 0) feedbackMessage += ` ${newUsers.length} students added.`;
        if (skippedStudents.length > 0) feedbackMessage += ` ${skippedStudents.length} skipped (duplicates or no access).`;
        
        showFeedback(feedbackMessage);
    };

    const handleImportAttendance = (allParsedRecords: ParsedAttendanceRecord[]) => {
        onUpdateMultipleAttendance(allParsedRecords);
        showFeedback(`Successfully imported/updated ${allParsedRecords.length} attendance records.`);
    };

    const handleAddStudentInternal = (name: string, rollNumber: string, isLateral: boolean, pass: string, department: string, year: string, section: string, email: string, phone: string, photoUrl?: string) => {
        const newId = Date.now();
        const newUser: User = { 
            id: newId, 
            name,
            rollNumber,
            password: pass,
            role: Role.STUDENT,
            department,
            section,
            email,
            phone,
            photoUrl,
            isLateralEntry: isLateral,
        };
        const academicYear = parseInt(year, 10);
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
    
    // --- RENDER HELPERS ---

    const renderTimetableManager = () => {
         if (!editingTimetable) return <div className="p-4">Loading...</div>;
         return (
            <div className="space-y-6">
                <InfoCard title="Manage Timetables">
                     <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Year</label>
                            <select value={selectedTimetableYear} onChange={e => setSelectedTimetableYear(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                {['1','2','3','4'].map(y => <option key={y} value={y}>{y}{['st','nd','rd'][parseInt(y)-1]||'th'} Year</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Section</label>
                            <select value={selectedTimetableSection} onChange={e => setSelectedTimetableSection(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                {currentUser.assignments?.filter(a => a.year.toString() === selectedTimetableYear).map(a => (
                                    <option key={a.section} value={a.section}>Section {a.section}</option>
                                ))}
                            </select>
                        </div>
                         <div className="flex items-end">
                            <button onClick={() => setIsEditingTimes(true)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 btn-interactive">Edit Period Times</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse border dark:border-gray-600">
                             <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="p-2 border dark:border-gray-600">Day</th>
                                    {periodTimes.map((time, i) => <th key={i} className="p-2 border dark:border-gray-600 min-w-[120px]">Period {i+1}<br/><span className="text-xs font-normal text-gray-500 dark:text-gray-400">{time}</span></th>)}
                                </tr>
                             </thead>
                             <tbody>
                                 {DAYS_OF_WEEK.map(day => (
                                     <tr key={day}>
                                         <td className="p-2 border dark:border-gray-600 font-medium capitalize bg-gray-50 dark:bg-gray-700">{day}</td>
                                         {editingTimetable[day].map((subject, index) => {
                                            if (subject === MERGED_CELL) return null;
                                            
                                            // Calculate colSpan
                                            let colSpan = 1;
                                            while (index + colSpan < editingTimetable[day].length && editingTimetable[day][index + colSpan] === MERGED_CELL) {
                                                colSpan++;
                                            }

                                            return (
                                             <td key={index} colSpan={colSpan} className="p-2 border dark:border-gray-600 relative group">
                                                 <input 
                                                    type="text" 
                                                    value={subject} 
                                                    onChange={e => handleTimetableCellChange(day, index, e.target.value)}
                                                    className="w-full p-1 border rounded text-center dark:bg-gray-800 dark:border-gray-600"
                                                    placeholder="Subject"
                                                 />
                                                 {/* Merge Controls */}
                                                 <div className="absolute top-0 right-0 hidden group-hover:flex bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-600 rounded">
                                                     {colSpan === 1 && index + colSpan < editingTimetable[day].length && editingTimetable[day][index+1] !== MERGED_CELL && (
                                                        <button onClick={() => handleMergeRight(day, index)} title="Merge Right" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        </button>
                                                     )}
                                                     {colSpan > 1 && (
                                                         <button onClick={() => handleUnmerge(day, index)} title="Unmerge" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L7.586 9H3a1 1 0 100 2h4.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                                                         </button>
                                                     )}
                                                 </div>
                                             </td>
                                            );
                                         })}
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleSaveTimetable} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 btn-interactive">Save Timetable</button>
                    </div>
                </InfoCard>
            </div>
         );
    };

    const renderNoticesManager = () => (
        <InfoCard title="Notice Board Management">
            <div className="mb-4">
                <div className="flex gap-2">
                     <input 
                        type="text" 
                        placeholder="Search notices..." 
                        value={noticeSearchQuery} 
                        onChange={e => setNoticeSearchQuery(e.target.value)} 
                        className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button onClick={() => setIsAddingNotice(true)} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive whitespace-nowrap">Post New Notice</button>
                </div>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {notices
                    .filter(n => n.department === currentUser.department || n.department === 'ALL')
                    .filter(n => n.title.toLowerCase().includes(noticeSearchQuery.toLowerCase()))
                    .map(notice => (
                    <div key={notice.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg">{notice.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{notice.date} • {notice.authorName} • {notice.department === 'ALL' ? 'All Depts' : notice.department}</p>
                            </div>
                            <button onClick={() => onDeleteNotice(notice.id)} className="text-red-500 hover:text-red-700 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{notice.content}</p>
                    </div>
                ))}
                {notices.length === 0 && <p className="text-center text-gray-500">No notices posted yet.</p>}
            </div>
        </InfoCard>
    );

    const renderMaterialsManager = () => (
        <InfoCard title="Course Materials">
             <div className="mb-6 flex justify-between items-center">
                 <p className="text-sm text-gray-600 dark:text-gray-400">Share resources with your students.</p>
                 <button onClick={() => setIsAddingMaterial(true)} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Upload Material</button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {materials.filter(m => currentUser.assignments?.some(a => a.department === m.department && a.year === m.year && a.section === m.section)).map(material => (
                     <div key={material.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative bg-gray-50 dark:bg-gray-800 card-interactive">
                         <div className="absolute top-2 right-2">
                             <button onClick={() => onDeleteMaterial(material.id)} className="text-gray-400 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                             </button>
                         </div>
                         <h4 className="font-semibold text-gray-900 dark:text-white pr-6 truncate">{material.title}</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{material.department} - {material.year}Yr - Sec {material.section}</p>
                         <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{material.description}</p>
                         <div className="flex justify-between items-center text-xs text-gray-400">
                             <span>{material.fileType.toUpperCase()}</span>
                             <span>{material.uploadedAt}</span>
                         </div>
                     </div>
                 ))}
             </div>
             {materials.length === 0 && <p className="text-center text-gray-500 py-8">No materials uploaded.</p>}
        </InfoCard>
    );

    const renderProfileSettings = () => (
        <div className="space-y-6">
            <InfoCard title="My Profile">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                        {currentUser.photoUrl ? <img src={currentUser.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-2xl text-gray-500 font-bold">{currentUser.name.charAt(0)}</span>}
                    </div>
                    <h2 className="text-xl font-bold">{currentUser.name}</h2>
                    <p className="text-gray-500">{currentUser.rollNumber}</p>
                    <p className="text-gray-500">{currentUser.department}</p>
                    
                    <div className="w-full max-w-sm mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h4 className="font-semibold mb-2">My Assignments</h4>
                         <ul className="text-sm space-y-1">
                            {currentUser.assignments?.map((a, i) => (
                                <li key={i}>• {a.department} - Year {a.year} - Section {a.section}</li>
                            ))}
                         </ul>
                    </div>
                </div>
            </InfoCard>
            <InfoCard title="Security">
                <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                         <span className="font-medium">Password</span>
                         <button onClick={() => setEditingSection('profile')} className="text-blue-600 hover:text-blue-800 text-sm">Change Password</button>
                    </div>
                     <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                        <div>
                            <span className="font-medium block">Biometric Login</span>
                            <span className="text-sm text-gray-500">Use fingerprint/face ID</span>
                        </div>
                        <button onClick={handleBiometricEnable} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded btn-interactive">Enable</button>
                    </div>
                </div>
            </InfoCard>
             {editingSection === 'profile' && (
                <ChangePasswordModal 
                    onClose={() => setEditingSection(null)} 
                    onSubmit={(current, newPass) => {
                        // In a real app, verify current password. Here we assume success for simplicity or add prop for validation
                        onUpdateUser({...currentUser, password: newPass});
                        return true;
                    }} 
                />
            )}
        </div>
    );
    
    // --- MAIN RENDER ---

    return (
        <div className="anim-enter-staff">
            {feedback && <div className="mb-4 p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg text-sm text-center font-medium animate-pulse">{feedback}</div>}

            {/* Main Content Area */}
            <div className="space-y-6">
                {activeView === 'attendance' && <AttendanceManager currentUser={currentUser} allStudentData={allStudentData} users={users} periodTimes={periodTimes} onUpdateMultipleStudentData={onUpdateMultipleStudentData} showFeedback={showFeedback} />}
                {activeView === 'timetable' && renderTimetableManager()}
                {activeView === 'notices' && renderNoticesManager()}
                {activeView === 'materials' && renderMaterialsManager()}
                {activeView === 'tracking' && <LiveTrackerDashboard users={users} allStudentData={allStudentData} assignments={currentUser.assignments || []} />}
                {activeView === 'profile' && renderProfileSettings()}
                {/* Simplified student list for staff - focusing on view/edit functionality */}
                {activeView === 'students' && (
                     <div className="space-y-6">
                         <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-2 items-center flex-grow">
                                <input 
                                    type="text" 
                                    placeholder="Search students..." 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    className="p-2 border rounded w-full max-w-md dark:bg-gray-700 dark:border-gray-600"
                                />
                                <div className="flex gap-2">
                                    <select value={yearFilter} onChange={e => setYearFilter(e.target.value as any)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                        <option value="all">All Years</option>
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                    </select>
                                    <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                        <option value="all">All Sections</option>
                                        {availableSections.map(s => <option key={s} value={s}>Sec {s}</option>)}
                                        {hasUnsectionedStudents && <option value="none">No Section</option>}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsAddingStudent(true)} className="px-4 py-2 bg-green-600 text-white rounded btn-interactive">Add Student</button>
                                <button onClick={() => setIsImportingStudents(true)} className="px-4 py-2 bg-purple-600 text-white rounded btn-interactive">Import List</button>
                            </div>
                         </div>
                         
                         <InfoCard title="Student List">
                             <div className="overflow-y-auto max-h-[60vh]">
                                 <table className="min-w-full text-sm text-left">
                                     <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                         <tr>
                                             <th className="p-3">Roll No</th>
                                             <th className="p-3">Name</th>
                                             <th className="p-3">Year/Sec</th>
                                             <th className="p-3">Actions</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y dark:divide-gray-700">
                                         {Object.entries(filteredGroupedStudents).flatMap(([year, sections]) => 
                                            Object.entries(sections).flatMap(([section, students]) => 
                                                students.map(student => (
                                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                        <td className="p-3 font-mono">{student.rollNumber}</td>
                                                        <td className="p-3">{student.name}</td>
                                                        <td className="p-3">{year} - {section}</td>
                                                        <td className="p-3">
                                                            <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400">View</button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )
                                         )}
                                         {Object.keys(filteredGroupedStudents).length === 0 && (
                                             <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found matching filters.</td></tr>
                                         )}
                                     </tbody>
                                 </table>
                             </div>
                         </InfoCard>
                     </div>
                )}
            </div>

            {/* Modals */}
            {isAddingStudent && (
                <AddStudentModal 
                    onClose={() => setIsAddingStudent(false)} 
                    onAdd={handleAddStudentInternal}
                    staffAssignments={currentUser.assignments}
                    allUsers={users}
                />
            )}
            {isImportingStudents && (
                <ImportStudentsModal 
                    onClose={() => setIsImportingStudents(false)} 
                    onImport={handleImportStudents}
                    existingRollNumbers={users.map(u => u.rollNumber)}
                />
            )}
            {isAddingNotice && (
                <AddNoticeModal 
                    onClose={() => setIsAddingNotice(false)} 
                    onAdd={onAddNotice} 
                    authorName={currentUser.name}
                    department={currentUser.department}
                />
            )}
            {isEditingTimes && (
                <EditTimesModal
                    currentTimes={periodTimes}
                    onClose={() => setIsEditingTimes(false)}
                    onSave={onUpdatePeriodTimes}
                />
            )}
             {isAddingMaterial && (
                <AddMaterialModal
                    onClose={() => setIsAddingMaterial(false)}
                    onAdd={onAddMaterial}
                    assignments={currentUser.assignments || []}
                />
            )}
        </div>
    );
};

export default StaffView;

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
    const [groupLateral, setGroupLateral] = useState(false);
    const [onlyLateral, setOnlyLateral] = useState(false);

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

    const displayedStudents = useMemo(() => {
        let students = [...studentsInClass];
        
        if (onlyLateral) {
            students = students.filter(s => s.isLateralEntry);
        }

        if (groupLateral) {
            students.sort((a, b) => {
                if (a.isLateralEntry && !b.isLateralEntry) return -1;
                if (!a.isLateralEntry && b.isLateralEntry) return 1;
                return a.rollNumber.localeCompare(b.rollNumber);
            });
        }
        
        return students;
    }, [studentsInClass, onlyLateral, groupLateral]);
    
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

                    <div className="mb-4 flex flex-wrap items-center gap-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/30">
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                             Lateral Entry Tools:
                        </span>
                        <label className="flex items-center space-x-2 cursor-pointer select-none bg-white dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={groupLateral}
                                onChange={e => setGroupLateral(e.target.checked)}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Group at Top</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer select-none bg-white dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={onlyLateral}
                                onChange={e => setOnlyLateral(e.target.checked)}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Show Only Lateral</span>
                        </label>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                        <p className="text-lg font-semibold">{displayedStudents.length} students listed.</p>
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
                                {displayedStudents.map(student => {
                                    const studentAttendance = attendance.get(student.id) || [];
                                    return (
                                        <tr key={student.id} className="divide-x dark:divide-gray-600">
                                            <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-2 font-medium whitespace-nowrap">
                                                {student.name}
                                                {student.isLateralEntry && (
                                                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded shadow-sm">
                                                        LATERAL
                                                    </span>
                                                )}
                                                <br/><span className="text-xs text-gray-500 dark:text-gray-400">{student.rollNumber}</span>
                                            </td>
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
