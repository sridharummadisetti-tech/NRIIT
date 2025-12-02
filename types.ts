
export enum Role {
  STUDENT = 'student',
  STAFF = 'staff',
  SUPER_ADMIN = 'super_admin',
}

export interface User {
  id: number;
  name: string;
  rollNumber: string;
  password: string;
  role: Role;
  department: string;
  assignments?: { department: string; year: number; section: string }[];
  photoUrl?: string;
  email?: string;
  phone?: string;
  importantUpdates?: ImportantUpdate[];
  // For students, section is still needed for simplicity in some views
  section?: string;
  isLateralEntry?: boolean;
}

export interface MarkItem {
  name: string;
  grade: string; // e.g., 'A', 'B', 'C', 'F'
  credits: number;
}

export interface YearMarks {
  subjects: MarkItem[];
  labs: MarkItem[];
  totalCredits: number;
  earnedCredits: number;
}

export interface MidTermSubject {
  name: string;
  score: number;
  maxScore: number;
}

export interface MidTermMarks {
  subjects: MidTermSubject[];
}

export interface AttendanceRecord {
  month: string;
  year: number;
  present: number;
  total: number;
}

export interface ImportantUpdate {
  date: string; // YYYY-MM-DD format
  text: string;
}

export interface FeeInstallment {
  total: number;
  paid: number;
  dueDate: string; // YYYY-MM-DD
  status: 'Paid' | 'Due' | 'Overdue';
}

export interface YearlyFee {
    installment1: FeeInstallment;
    installment2: FeeInstallment;
}

export type DailyAttendanceStatus = 'Present' | 'Absent' | 'Not Marked';

export interface GeoLocation {
    lat: number;
    lng: number;
    lastUpdated: string; // ISO String
    isSharing: boolean;
}

export interface StudentData {
  id: number;
  userId: number;
  monthlyAttendance: AttendanceRecord[];
  dailyAttendance?: {
    [date: string]: DailyAttendanceStatus[]; // YYYY-MM-DD
  };
  fees: {
    [yearKey: string]: YearlyFee; // e.g., "year1", "year2"
  };
  importantUpdates: ImportantUpdate[];
  mid_1: MidTermMarks | null;
  mid_2: MidTermMarks | null;
  year1_1: YearMarks | null;
  year1_2: YearMarks | null;
  year2_1: YearMarks | null;
  year2_2: YearMarks | null;
  year3_1: YearMarks | null;
  year3_2: YearMarks | null;
  year4_1: YearMarks | null;
  year4_2: YearMarks | null;
  location?: GeoLocation;
}

export interface ParsedStudent {
  name: string;
  rollNumber?: string;
  department: string;
  year: string;
  section?: string;
  isLateralEntry?: boolean;
  totalFees?: number;
  paidFees?: number;
  email?: string;
  phone?: string;
}

export interface ParsedAttendanceRecord {
  rollNumber: string;
  month: string;
  year: number;
  present: number;
  total: number;
}

export enum ChatAuthor {
    USER = 'user',
    AI = 'ai',
    SYSTEM = 'system',
}

export interface ChatMessage {
    author: ChatAuthor;
    text: string;
}

// Timetable Types
export type DailySchedule = string[]; // Array of subject names, index corresponds to period

export interface WeeklyTimeTable {
  monday: DailySchedule;
  tuesday: DailySchedule;
  wednesday: DailySchedule;
  thursday: DailySchedule;
  friday: DailySchedule;
  saturday: DailySchedule;
}

export interface SectionTimeTable {
  department: string;
  year: number;
  section: string;
  timetable: WeeklyTimeTable;
}

// Notice Board Types
export interface Notice {
  id: number;
  title: string;
  content: string;
  authorName: string;
  date: string; // YYYY-MM-DD
  department: string;
}

// Course Material Types
export interface CourseMaterial {
  id: number;
  title: string;
  description: string;
  fileType: 'pdf' | 'image' | 'doc' | 'other';
  fileUrl: string; // Base64 string for demo
  fileName: string;
  uploadedBy: string; // Staff Name
  uploadedAt: string; // YYYY-MM-DD
  department: string;
  year: number;
  section: string;
}
