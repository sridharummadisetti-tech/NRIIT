




import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Role, StudentData, YearMarks, ParsedStudent, AttendanceRecord, ImportantUpdate, MidTermMarks, MidTermSubject, FeeInstallment } from '../types';
import InfoCard from './InfoCard';
import IdCard from './IdCard';
import ImportStudentsModal from './ImportStudentsModal';
import { GRADE_POINTS, DEPARTMENT_CODES } from '../constants';

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


const getStudentYear = (studentData: StudentData | undefined): number => {
    if (!studentData) return 1;
    if (studentData.year4_1 || studentData.year4_2) return 4;
    if (studentData.year3_1 || studentData.year3_2) return 3;
    if (studentData.year2_1 || studentData.year2_2) return 2;
    return 1;
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
  const admissionYear = currentYear - (academicYear - (isLateralEntry ? 2 : 1));

  const yearCode = String(admissionYear).slice(-2);
  const collegeCode = 'KP';
  const entryCode = isLateralEntry ? '4A' : '1A';
  const branchCode = DEPARTMENT_CODES[department] || '00';
  const prefix = `${yearCode}${collegeCode}${entryCode}${branchCode}`;

  const existingSerials = allUsers
    .filter(u => u.rollNumber.startsWith(prefix))
    .map(u => parseInt(u.rollNumber.slice(-2), 10))
    .filter(n => !isNaN(n));

  const nextSerial = existingSerials.length > 0 ? Math.max(...existingSerials) + 1 : 1;
  const serialCode = String(nextSerial).padStart(2, '0');

  return `${prefix}${serialCode}`;
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

const academicPeriods = {
    mid_1: "Mid-Term 1",
    mid_2: "Mid-Term 2",
    year1_1: "YEAR(1-1)", year1_2: "YEAR(1-2)",
    year2_1: "YEAR(2-1)", year2_2: "YEAR(2-2)",
    year3_1: "YEAR(3-1)", year3_2: "YEAR(3-2)",
    year4_1: "YEAR(4-1)", year4_2: "YEAR(4-2)",
};
type AcademicPeriodKey = keyof typeof academicPeriods;


interface SuperAdminViewProps {
  currentUser: User;
  users: User[];
  studentData: StudentData[];
  departments: string[];
  periodTimes: string[];
  onAddStaff: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
  onAddDepartment: (newDepartment: string) => void;
  onUpdateDepartment: (oldName: string, newName: string) => void;
  onDeleteDepartment: (departmentName: string) => void;
  onAddStudent: (user: User, data: StudentData) => void;
  onUpdateStudentData: (data: StudentData) => void;
  onAddMultipleStudents: (newUsers: User[], newStudentDataItems: StudentData[]) => void;
  onBiometricSetup: (user: User) => Promise<boolean>;
  onUpdatePassword: (userId: number, currentPass: string, newPass: string) => 'SUCCESS' | 'INCORRECT_PASSWORD';
}

const AdminChangePasswordModal: React.FC<{
  onClose: () => void;
  onSubmit: (currentPass: string, newPass: string) => 'SUCCESS' | 'INCORRECT_PASSWORD';
}> = ({ onClose, onSubmit }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const validateStrongPassword = (pass: string) => {
        // At least 8 chars, 1 uppercase, 1 number, 1 special char (any non-word char or underscore)
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return regex.test(pass);
    };

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
        if (!validateStrongPassword(newPassword)) {
            setError('Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.');
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
                <h2 className="text-2xl font-bold mb-4 text-center">Change Admin Password</h2>
                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                {success && <p className="text-green-500 text-sm text-center mb-4">{success}</p>}
                <div className="space-y-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min 8 chars, 1 uppercase, 1 number, 1 special char.</p>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-red-600 text-white rounded btn-interactive">Update Password</button>
                </div>
            </div>
        </div>
    );
};

const DepartmentModal: React.FC<{
  department?: string;
  onClose: () => void;
  onSave: (name: string, oldName?: string) => void;
  existingDepartments: string[];
}> = ({ department, onClose, onSave, existingDepartments }) => {
  const [name, setName] = useState(department || '');
  const [error, setError] = useState('');
  const isEditing = !!department;

  const handleSave = () => {
    setError('');
    const trimmedName = name.trim().toUpperCase();
    if (!trimmedName) {
      setError('Department name cannot be empty.');
      return;
    }
    if (existingDepartments.includes(trimmedName) && trimmedName !== department) {
      setError('This department already exists.');
      return;
    }
    onSave(trimmedName, department);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md anim-modal-content">
        <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit' : 'Add'} Department</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Department Name (e.g., MECH)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Save</button>
        </div>
      </div>
    </div>
  );
};

const StaffModal: React.FC<{
  staff?: User;
  onClose: () => void;
  onSave: (user: User) => void;
  existingUsers: User[];
  departments: string[];
}> = ({ staff, onClose, onSave, existingUsers, departments }) => {
  const [name, setName] = useState(staff?.name || '');
  const [staffId, setStaffId] = useState(staff?.rollNumber || '');
  const [department, setDepartment] = useState(staff?.department || departments[0]);
  const [assignments, setAssignments] = useState<{ department: string; year: number; section: string }[]>(staff?.assignments || []);
  
  const [newAssignment, setNewAssignment] = useState({ department: departments[0], section: '' });
  const [selectedYears, setSelectedYears] = useState<{[key: string]: boolean}>({ '1': false, '2': false, '3': false, '4': false });

  const [error, setError] = useState('');
  const isEditing = !!staff;

  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const handleBatchAddAssignment = () => {
    setError('');
    const department = newAssignment.department;
    const sections = newAssignment.section.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const years = Object.keys(selectedYears).filter(year => selectedYears[year]);

    if (sections.length === 0) {
        setError('Section(s) cannot be empty. Please enter one or more, separated by commas.');
        return;
    }
    if (years.length === 0) {
        setError('At least one year must be selected.');
        return;
    }

    const assignmentsToAdd: { department: string; year: number; section: string }[] = [];
    years.forEach(yearStr => {
        const year = parseInt(yearStr, 10);
        sections.forEach(section => {
            const assignmentExists = assignments.some(a => 
                a.department === department && 
                a.year === year && 
                a.section === section
            );
            const alreadyInBatch = assignmentsToAdd.some(a => 
                a.department === department && 
                a.year === year && 
                a.section === section
            );
            if (!assignmentExists && !alreadyInBatch) {
                assignmentsToAdd.push({ department, year, section });
            }
        });
    });
    
    if (assignmentsToAdd.length === 0) {
        setError('All specified assignments already exist for this staff member.');
        return;
    }

    setAssignments(prev => [...prev, ...assignmentsToAdd].sort((a,b) => a.department.localeCompare(b.department) || a.year - b.year || a.section.localeCompare(b.section)));
    
    // Reset form
    setNewAssignment(prev => ({ ...prev, section: '' }));
    setSelectedYears({ '1': false, '2': false, '3': false, '4': false });
  };


  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };


  const handleSave = () => {
    setError('');
    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!staffId.trim()) {
      setError('Staff ID / Roll Number is required.');
      return;
    }
    if (existingUsers.some(u => u.rollNumber === staffId && u.id !== staff?.id)) {
      setError('This Staff ID is already taken.');
      return;
    }
    if (!staffId.toUpperCase().startsWith('T')) {
      setError('Staff ID must start with "T" (e.g., "T001").');
      return;
    }
    
    let finalPassword = staff?.password;

    if (!isEditing) {
      if (!newPassword.trim()) {
        setError('Password is required for new staff.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('Passwords do not match.');
        return;
      }
      finalPassword = newPassword.trim();
    } else if (changePassword) {
      if (!newPassword.trim()) {
        setError('New password cannot be empty.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('New passwords do not match.');
        return;
      }
      finalPassword = newPassword.trim();
    }
    
    if (!finalPassword) {
        setError('Password cannot be empty.');
        return;
    }

    const userToSave: User = {
      id: staff?.id || Date.now(),
      name: name.trim(),
      rollNumber: staffId.trim(),
      password: finalPassword,
      role: Role.STAFF,
      department: department,
      assignments: assignments,
    };
    onSave(userToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl anim-modal-content">
        <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit' : 'Add'} Staff Member</h2>
        {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label htmlFor="staff-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input id="staff-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
          </div>
           <div>
            <label htmlFor="staff-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Staff ID / Roll Number</label>
            <input id="staff-id" type="text" placeholder="Must start with 'T' (e.g., T003)" value={staffId} onChange={e => setStaffId(e.target.value.toUpperCase())} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
          </div>
          
          {isEditing ? (
            <div className="space-y-4 pt-2 border-t dark:border-gray-600">
                <div className="flex items-center">
                    <input id="changePasswordCheck" type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="changePasswordCheck" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Change Password</label>
                </div>
                {changePassword && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                            <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </>
                )}
            </div>
          ) : (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                    <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                </div>
            </>
          )}

          <div className="space-y-4 pt-4 border-t dark:border-gray-600">
             <h3 className="text-lg font-medium text-gray-900 dark:text-white">Assignments</h3>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Department</label>
             <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
             </select>

             <div className="space-y-2">
                {assignments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <span className="text-sm">{a.department} - Year: {a.year}, Section: {a.section}</span>
                        <button onClick={() => handleRemoveAssignment(i)} className="p-1 text-red-500 hover:text-red-700 btn-interactive">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                ))}
             </div>
              <div className="p-4 border dark:border-gray-600 rounded-lg">
                  <h4 className="font-semibold mb-2">Add New Assignment(s)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                          <select value={newAssignment.department} onChange={e => setNewAssignment({...newAssignment, department: e.target.value, section: ''})} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600">
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section(s)</label>
                          <input type="text" placeholder="e.g., A, B" value={newAssignment.section} onChange={e => setNewAssignment({...newAssignment, section: e.target.value})} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                           <p className="text-xs text-gray-400 mt-1">Separate multiple sections with a comma.</p>
                      </div>
                  </div>
                   <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year(s)</label>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 p-2 border rounded dark:border-gray-600">
                           {['1','2','3','4'].map(year => (
                               <div key={year} className="flex items-center">
                                   <input id={`year-${year}`} type="checkbox" checked={selectedYears[year]} onChange={() => setSelectedYears(prev => ({ ...prev, [year]: !prev[year] }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                   <label htmlFor={`year-${year}`} className="ml-2 text-sm">{year}{year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year</label>
                               </div>
                           ))}
                        </div>
                   </div>
                  <div className="flex justify-end mt-4">
                      <button onClick={handleBatchAddAssignment} className="px-4 py-2 bg-green-600 text-white rounded h-10 btn-interactive">Add Assignments</button>
                  </div>
              </div>
          </div>
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded btn-interactive">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive">Save Staff</button>
        </div>
      </div>
    </div>
  );
};

const AddStudentModal: React.FC<{
    onClose: () => void;
    onAdd: (name: string, rollNumber: string, isLateral: boolean, pass: string, department: string, year: string, section: string, email: string, phone: string, photoUrl?: string) => void;
    departments: string[];
    allUsers: User[];
}> = ({ onClose, onAdd, departments, allUsers }) => {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [password, setPassword] = useState('password123');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string>();
    const [isLateralEntry, setIsLateralEntry] = useState(false);
    const [department, setDepartment] = useState(departments[0]);
    const [year, setYear] = useState('1');
    const [section, setSection] = useState('A');
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
        if (!name || !password || !department || !year || !section || !rollNumber) {
            setError('All fields are required.');
            return;
        }
        const isDuplicate = allUsers.some(u => u.rollNumber.toLowerCase() === rollNumber.trim().toLowerCase());
        if (isDuplicate) {
            setError('This Roll Number is already in use.');
            return;
        }
        onAdd(name, rollNumber.trim(), isLateralEntry, password, department, year, section, email, phone, photoUrl);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md anim-modal-content">
                <h2 className="text-2xl font-bold mb-4">Add New Student</h2>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                            {photoUrl ? <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                        </div>
                        <label htmlFor="add-student-photo-admin" className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400">Upload Photo</label>
                        <input id="add-student-photo-admin" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                    <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="text" placeholder="Roll Number (e.g., 24KP1A0401)" value={rollNumber} onChange={e => setRollNumber(e.target.value.toUpperCase())} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Dept</label>
                            <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"><option value="">Select...</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Year</label>
                            <select value={year} onChange={e => setYear(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"><option value="">Select...</option>{['1','2','3','4'].map(y => <option key={y} value={y}>{y}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Section</label>
                            <input type="text" placeholder="A" value={section} onChange={e => setSection(e.target.value.toUpperCase())} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input id="lateral-entry-check-admin" type="checkbox" checked={isLateralEntry} onChange={e => setIsLateralEntry(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="lateral-entry-check-admin" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Lateral Entry Student (Joins in 2nd Year)</label>
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

type EditableSection = 'profile' | 'attendance' | 'fees' | 'academics' | 'updates' | null;

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  currentUser,
  users,
  studentData,
  departments,
  periodTimes,
  onAddStaff,
  onUpdateUser,
  onDeleteUser,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onAddStudent,
  onUpdateStudentData,
  onAddMultipleStudents,
  onBiometricSetup,
  onUpdatePassword,
}) => {
    const [activeTab, setActiveTab] = useState<'home' | 'departments' | 'staff' | 'students'>('home');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [departmentFilter, setDepartmentFilter] = useState<'all' | string>('all');
    const [yearFilter, setYearFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all');
    const [sectionFilter, setSectionFilter] = useState<'all' | string>('all');
    const [feedback, setFeedback] = useState('');
    
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<string | undefined>(undefined);

    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<User | undefined>(undefined);
    
    const [isImportingStudents, setIsImportingStudents] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedDepartmentName, setSelectedDepartmentName] = useState<string | null>(null);

    const [editingSection, setEditingSection] = useState<EditableSection>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingData, setEditingData] = useState<StudentData | null>(null);
    
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

    const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);
    const selectedStudentData = useMemo(() => studentData.find(sd => sd.userId === selectedUserId), [studentData, selectedUserId]);

     useEffect(() => {
        setEditingSection(null); // Reset edit mode when selection changes
        setEditingUser(selectedUser ? { ...selectedUser } : null);
        setEditingData(selectedStudentData ? JSON.parse(JSON.stringify(selectedStudentData)) : null);
    }, [selectedUserId, selectedUser, selectedStudentData]);


    const allStudents = useMemo(() => users.filter(u => u.role === Role.STUDENT), [users]);
    const allStaff = useMemo(() => users.filter(u => u.role === Role.STAFF), [users]);

    const filteredUsers = useMemo(() => {
        let usersToFilter: User[] = [];
        if (activeTab === 'staff') usersToFilter = allStaff;
        if (activeTab === 'students') usersToFilter = allStudents;

        if (departmentFilter !== 'all') {
            usersToFilter = usersToFilter.filter(u => u.department === departmentFilter);
        }
        if (activeTab === 'students' && yearFilter !== 'all') {
            usersToFilter = usersToFilter.filter(u => getStudentYear(studentData.find(sd => sd.userId === u.id)).toString() === yearFilter);
        }
        if (activeTab === 'students' && sectionFilter !== 'all') {
            usersToFilter = usersToFilter.filter(u => u.section === sectionFilter);
        }

        if (debouncedSearchQuery) {
            usersToFilter = usersToFilter.filter(u => 
                u.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
                u.rollNumber.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }
        return usersToFilter;
    }, [activeTab, allStudents, allStaff, departmentFilter, yearFilter, sectionFilter, debouncedSearchQuery, studentData]);

    const availableSections = useMemo(() => {
        if (activeTab !== 'students') return [];
        let studentsToConsider = allStudents;
        if (departmentFilter !== 'all') {
            studentsToConsider = studentsToConsider.filter(u => u.department === departmentFilter);
        }
        if (yearFilter !== 'all') {
            studentsToConsider = studentsToConsider.filter(u => getStudentYear(studentData.find(sd => sd.userId === u.id)).toString() === yearFilter);
        }
        const sections = new Set(studentsToConsider.map(u => u.section).filter((s): s is string => !!s));
        return Array.from(sections).sort();
    }, [activeTab, allStudents, studentData, departmentFilter, yearFilter]);

    const groupedStudents = useMemo(() => {
        const groups: { [dept: string]: { [year: string]: { [section: string]: User[] } } } = {};
        filteredUsers.filter(u => u.role === Role.STUDENT).forEach(user => {
            const dept = user.department;
            const year = getStudentYear(studentData.find(sd => sd.userId === user.id)).toString();
            const section = user.section || 'N/A';

            if (!groups[dept]) groups[dept] = {};
            if (!groups[dept][year]) groups[dept][year] = {};
            if (!groups[dept][year][section]) groups[dept][year][section] = [];
            groups[dept][year][section].push(user);
        });
        return groups;
    }, [filteredUsers, studentData]);


    const filteredDepartments = useMemo(() => {
        if (!debouncedSearchQuery) return departments;
        return departments.filter(d => d.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    }, [departments, debouncedSearchQuery]);
    
    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 5000);
    }

    const handleEditClick = (section: EditableSection) => {
        setEditingUser(selectedUser ? { ...selectedUser } : null);
        if (selectedUser?.role === Role.STUDENT) {
            setEditingData(selectedStudentData ? JSON.parse(JSON.stringify(selectedStudentData)) : null);
        }
        setEditingSection(section);
    };

    const handleSave = () => {
        if (!editingUser) return;
        
        const isDuplicate = users.some(u => u.id !== editingUser.id && u.rollNumber.toLowerCase() === editingUser.rollNumber.toLowerCase());
        if (isDuplicate) {
            alert(`Error: The ID "${editingUser.rollNumber}" is already in use.`);
            return;
        }

        onUpdateUser(editingUser);
        if (editingData && selectedUser?.role === Role.STUDENT) {
            onUpdateStudentData(editingData);
        }
        showFeedback(`${editingUser.role === Role.STAFF ? 'Staff' : 'Student'} profile updated!`);
        setEditingSection(null);
    };

    const handleCancel = () => {
        setEditingSection(null);
        setEditingUser(selectedUser ? { ...selectedUser } : null);
        setEditingData(selectedStudentData ? JSON.parse(JSON.stringify(selectedStudentData)) : null);
    };
    
    const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editingUser) {
            try {
                const url = await fileToDataUrl(e.target.files[0]);
                setEditingUser({ ...editingUser, photoUrl: url });
            } catch (error) {
                alert('There was an error uploading the photo.');
            }
        }
    };
    
    const handleSaveDepartment = (name: string, oldName?: string) => {
        if (oldName) {
            onUpdateDepartment(oldName, name);
            setSelectedDepartmentName(name);
            showFeedback('Department updated.');
        } else {
            onAddDepartment(name);
            showFeedback('Department added.');
        }
        setIsDepartmentModalOpen(false);
    };

    const handleDeleteDepartmentInternal = (deptName: string) => {
        if (window.confirm(`Are you sure you want to delete the "${deptName}" department? This action cannot be undone.`)) {
            onDeleteDepartment(deptName);
            setSelectedDepartmentName(null);
        }
    };


    const handleSaveStaff = (user: User) => {
        if (editingStaff) {
            onUpdateUser(user);
            showFeedback('Staff details updated.');
        } else {
            onAddStaff(user);
            showFeedback('New staff member added.');
        }
        setIsStaffModalOpen(false);
        setEditingStaff(undefined);
    };

    const handleDeleteUserInternal = (user: User) => {
        const userType = user.role === Role.STAFF ? 'staff member' : 'student';
        if (window.confirm(`Are you sure you want to delete ${user.name}? This will remove all their associated data and cannot be undone.`)) {
            onDeleteUser(user.id);
            if(selectedUserId === user.id) setSelectedUserId(null);
            showFeedback(`${userType} ${user.name} has been deleted.`);
        }
    };
    
      const handleAddStudentInternal = (name: string, rollNumber: string, isLateralEntry: boolean, password: string, department: string, yearStr: string, section: string, email: string, phone: string, photoUrl?: string) => {
        const newId = Date.now();
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
            isLateralEntry,
        };
        const academicYear = parseInt(yearStr, 10);
        const newStudentData: StudentData = {
            id: newId, userId: newId, monthlyAttendance: [], 
            fees: {},
            importantUpdates: [],
            mid_1: { subjects: [] }, mid_2: { subjects: [] },
            year1_1: null,
            year1_2: null,
            year2_1: null,
            year2_2: null,
            year3_1: null,
            year3_2: null,
            year4_1: null,
            year4_2: null,
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
        
        const existingRollNumbers = new Set(users.map(u => u.rollNumber));

        allParsedStudents.forEach(pStudent => {
            const studentYear = parseInt(pStudent.year, 10);

            let finalRollNumber = pStudent.rollNumber?.trim();
            let isDuplicate = false;

            if (finalRollNumber) {
                isDuplicate = existingRollNumbers.has(finalRollNumber);
            } else {
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
        
        let feedbackMessage = `Import processed: ${allParsedStudents.length} total records.`;
        if (newUsers.length > 0) feedbackMessage += ` ${newUsers.length} new students added.`;
        if (skippedStudents.length > 0) feedbackMessage += ` ${skippedStudents.length} duplicates skipped.`;
        
        showFeedback(feedbackMessage);
    };

    const handleBiometricEnable = async () => {
        const success = await onBiometricSetup(currentUser);
        if (success) {
            showFeedback('Biometric authentication enabled successfully!');
        } else {
            showFeedback('Failed to enable biometrics.');
        }
    };

    const renderHome = () => (
        <div className="space-y-6">
            <InfoCard title="Portal Dashboard">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div><p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{departments.length}</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Total Departments</p></div>
                    <div><p className="text-4xl font-bold text-green-600 dark:text-green-400">{allStaff.length}</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Total Staff</p></div>
                    <div><p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{allStudents.length}</p><p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p></div>
                </div>
            </InfoCard>
             <InfoCard title="Security Settings">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                        <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Biometric Login</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Enable fingerprint or face ID for faster login.</p>
                        </div>
                        <button onClick={handleBiometricEnable} className="px-4 py-2 bg-indigo-600 text-white rounded btn-interactive">
                            Enable Biometrics
                        </button>
                    </div>
                     <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Admin Password</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Update the secure password for this admin account.</p>
                        </div>
                        <button onClick={() => setIsChangePasswordModalOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded btn-interactive">
                            Change Password
                        </button>
                    </div>
                </div>
            </InfoCard>
        </div>
    );
    
    const renderDepartments = () => {
        const selectedDeptStaff = allStaff.filter(s => s.department === selectedDepartmentName);
        const selectedDeptStudents = allStudents.filter(s => s.department === selectedDepartmentName);

        return (
            <InfoCard title={selectedDepartmentName ? `Department: ${selectedDepartmentName}` : 'Select a Department'}>
                {selectedDepartmentName ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Details</h3>
                            <div className="flex space-x-2">
                                <button onClick={() => { setEditingDepartment(selectedDepartmentName); setIsDepartmentModalOpen(true); }} className="px-3 py-1 text-sm bg-blue-600 text-white rounded btn-interactive">Edit Name</button>
                                <button onClick={() => handleDeleteDepartmentInternal(selectedDepartmentName)} className="px-3 py-1 text-sm bg-red-600 text-white rounded btn-interactive">Delete</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <p className="text-2xl font-bold">{selectedDeptStaff.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Staff Members</p>
                            </div>
                            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <p className="text-2xl font-bold">{selectedDeptStudents.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
                            </div>
                        </div>
                    </div>
                ) : <p className="text-center text-gray-500 dark:text-gray-400">Select a department from the list to view details.</p>}
            </InfoCard>
        );
    };

    const renderStaff = () => {
        if (!selectedUser) return <InfoCard title="Select Staff"><p className="text-center text-gray-500 dark:text-gray-400">Select a staff member to view details.</p></InfoCard>;
        
        const userToDisplay = editingSection === 'profile' && editingUser ? editingUser : selectedUser;

        return (
            <InfoCard 
                title={editingSection === 'profile' ? `Editing ${selectedUser.name}` : selectedUser.name}
                actions={
                    editingSection === 'profile' ? (
                        <div className="flex items-center space-x-2">
                            <button onClick={handleSave} className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                            <button onClick={handleCancel} className="px-3 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400">Cancel</button>
                        </div>
                    ) : (
                         <div className="flex space-x-2">
                             <button onClick={() => { setEditingStaff(selectedUser); setIsStaffModalOpen(true); }} className="px-3 py-1 text-sm bg-blue-600 text-white rounded btn-interactive">Edit</button>
                             <button onClick={() => handleDeleteUserInternal(selectedUser)} className="px-3 py-1 text-sm bg-red-600 text-white rounded btn-interactive">Delete</button>
                         </div>
                    )
                }
            >
                {editingSection === 'profile' && editingUser ? (
                    <div className="space-y-4">
                        <input type="text" placeholder="Full Name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="text" placeholder="Staff ID" value={editingUser.rollNumber} onChange={e => setEditingUser({...editingUser, rollNumber: e.target.value.toUpperCase()})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="email" placeholder="Email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="text" placeholder="Phone" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="password" placeholder="Enter new password to change" onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Assignments can be edited via the main "Edit" button for the staff member.</p>
                    </div>
                ) : (
                    <div className="space-y-2 text-sm">
                        <p><strong>Staff ID:</strong> {userToDisplay.rollNumber}</p>
                        <p><strong>Department:</strong> {userToDisplay.department}</p>
                        <p><strong>Email:</strong> {userToDisplay.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {userToDisplay.phone || 'N/A'}</p>
                        <h4 className="font-semibold pt-2 border-t dark:border-gray-600">Assignments</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {userToDisplay.assignments?.length ? userToDisplay.assignments.map((a, i) => (
                                <div key={i} className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">{a.department} - Year: {a.year}, Section: {a.section}</div>
                            )) : <p className="text-sm text-gray-500">No assignments.</p>}
                        </div>
                    </div>
                )}
            </InfoCard>
        );
    };
    
    const renderStudents = () => {
        if (!selectedUser || !selectedStudentData) return <InfoCard title="Select Student"><p className="text-center text-gray-500 dark:text-gray-400">Select a student to view details.</p></InfoCard>;

        const userToDisplay = editingSection === 'profile' && editingUser ? editingUser : selectedUser;
        
        return (
             <InfoCard 
                title={editingSection === 'profile' ? `Editing ${selectedUser.name}` : selectedUser.name}
                actions={
                    editingSection === 'profile' ? (
                        <div className="flex items-center space-x-2">
                            <button onClick={handleSave} className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                            <button onClick={handleCancel} className="px-3 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400">Cancel</button>
                        </div>
                    ) : (
                         <div className="flex space-x-2">
                             <button onClick={() => handleEditClick('profile')} className="px-3 py-1 text-sm bg-blue-600 text-white rounded btn-interactive">Edit</button>
                             <button onClick={() => handleDeleteUserInternal(selectedUser)} className="px-3 py-1 text-sm bg-red-600 text-white rounded btn-interactive">Delete</button>
                         </div>
                    )
                }
            >
                {editingSection === 'profile' && editingUser ? (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-2 mb-4">
                            <div className="relative group w-24 h-24">
                                <img src={editingUser.photoUrl || `https://placehold.co/400x400/7c3aed/FFFFFF/png?text=${editingUser.name.charAt(0)}`} alt={editingUser.name} className="w-24 h-24 rounded-full object-cover" />
                                <label htmlFor="admin-edit-photo" className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full cursor-pointer transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </label>
                                <input id="admin-edit-photo" type="file" className="hidden" accept="image/*" onChange={handleProfilePhotoChange} />
                            </div>
                        </div>
                        <input type="text" placeholder="Full Name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="text" placeholder="Roll Number" value={editingUser.rollNumber} onChange={e => setEditingUser({...editingUser, rollNumber: e.target.value.toUpperCase()})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="email" placeholder="Email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="tel" placeholder="Phone" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="text" placeholder="Section" value={editingUser.section || ''} onChange={e => setEditingUser({...editingUser, section: e.target.value.toUpperCase()})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="password" placeholder="Enter new password to change" onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                    </div>
                ) : (
                    <div className="flex items-start space-x-6">
                         <div className="flex-shrink-0">
                            <img src={userToDisplay.photoUrl || `https://placehold.co/400x400/7c3aed/FFFFFF/png?text=${userToDisplay.name.charAt(0)}`} alt={userToDisplay.name} className="w-24 h-24 rounded-full object-cover" />
                        </div>
                        <div className="space-y-1 text-sm">
                            <p><strong>Roll No:</strong> {userToDisplay.rollNumber}</p>
                            <p><strong>Department:</strong> {userToDisplay.department}</p>
                            <p><strong>Year:</strong> {getStudentYear(selectedStudentData)}</p>
                            <p><strong>Section:</strong> {userToDisplay.section || 'N/A'}</p>
                            <p><strong>Email:</strong> {userToDisplay.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> {userToDisplay.phone || 'N/A'}</p>
                        </div>
                    </div>
                )}
            </InfoCard>
        );
    };

    const renderDetailPanel = () => {
        switch (activeTab) {
            case 'home': return renderHome();
            case 'departments': return renderDepartments();
            case 'staff': return renderStaff();
            case 'students': return renderStudents();
            default: return null;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 anim-enter-admin">
            <div className="lg:col-span-1">
                <InfoCard title="Portal Management">
                     <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'home' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('home')}>Home</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'departments' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('departments')}>Departments</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'staff' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('staff')}>Staff</button>
                        <button className={`flex-shrink-0 px-3 py-2 text-sm font-medium ${activeTab === 'students' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} btn-interactive`} onClick={() => setActiveTab('students')}>Students</button>
                    </div>
                    
                    {activeTab !== 'home' && (
                        <div className="space-y-4">
                            <div className="flex space-x-2">
                                <input 
                                    type="text" 
                                    placeholder={`Search ${activeTab}...`} 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                                />
                                {activeTab === 'departments' && <button onClick={() => { setEditingDepartment(undefined); setIsDepartmentModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive flex-shrink-0">Add</button>}
                                {activeTab === 'staff' && <button onClick={() => { setEditingStaff(undefined); setIsStaffModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive flex-shrink-0">Add</button>}
                                {activeTab === 'students' && <button onClick={() => setIsAddingStudent(true)} className="px-4 py-2 bg-blue-600 text-white rounded btn-interactive flex-shrink-0">Add</button>}
                            </div>
                            {activeTab === 'students' && (
                                <button onClick={() => setIsImportingStudents(true)} className="w-full px-4 py-2 bg-purple-600 text-white rounded btn-interactive">Import Students</button>
                            )}
                             {activeTab === 'staff' && (
                                <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                    <option value="all">All Departments</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                             )}
                             {activeTab === 'students' && (
                                <div className="grid grid-cols-3 gap-2">
                                    <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"><option value="all">All Depts</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                    <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value as any)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"><option value="all">All Years</option>{['1', '2', '3', '4'].map(year => <option key={year} value={year}>{year}</option>)}</select>
                                    <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"><option value="all">All Sections</option>{availableSections.map(sec => (<option key={sec} value={sec}>{sec}</option>))}</select>
                                </div>
                            )}
                            <div className="max-h-96 overflow-y-auto space-y-1">
                                {activeTab === 'departments' && filteredDepartments.map(d => (
                                    <button key={d} onClick={() => setSelectedDepartmentName(d)} className={`w-full text-left p-2 list-item-interactive ${selectedDepartmentName === d ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{d}</button>
                                ))}
                                {(activeTab === 'staff' || activeTab === 'students') && filteredUsers.map(u => (
                                    <button key={u.id} onClick={() => setSelectedUserId(u.id)} className={`w-full text-left p-2 list-item-interactive ${selectedUserId === u.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                        <div>
                                            {u.name} <span className="text-xs opacity-70">({u.rollNumber})</span>
                                        </div>
                                        {u.role === Role.STAFF && (
                                            <div className={`text-xs ${selectedUserId === u.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {u.assignments?.length || 0} Assignments
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </InfoCard>
                {feedback && <div className="mt-4 p-2 text-center text-sm text-green-800 bg-green-100 dark:text-green-100 dark:bg-green-800 rounded">{feedback}</div>}
            </div>
            <div className="lg:col-span-2">
                 {renderDetailPanel()}
            </div>
            {isDepartmentModalOpen && <DepartmentModal department={editingDepartment} onClose={() => { setIsDepartmentModalOpen(false); setEditingDepartment(undefined); }} onSave={handleSaveDepartment} existingDepartments={departments} />}
            {isStaffModalOpen && <StaffModal staff={editingStaff} onClose={() => { setIsStaffModalOpen(false); setEditingStaff(undefined); }} onSave={handleSaveStaff} existingUsers={users} departments={departments} />}
            {isImportingStudents && <ImportStudentsModal onClose={() => setIsImportingStudents(false)} onImport={handleAddMultipleStudentsWrapper} existingRollNumbers={users.map(u => u.rollNumber)} />}
            {isAddingStudent && <AddStudentModal onClose={() => setIsAddingStudent(false)} onAdd={handleAddStudentInternal} departments={departments} allUsers={users} />}
            {isChangePasswordModalOpen && (
                <AdminChangePasswordModal 
                    onClose={() => setIsChangePasswordModalOpen(false)} 
                    onSubmit={(current, newPass) => onUpdatePassword(currentUser.id, current, newPass)} 
                />
            )}
        </div>
    );
};