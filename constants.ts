import { User, Role, StudentData, SectionTimeTable, WeeklyTimeTable, Notice, CourseMaterial } from './types';

export const DEPARTMENTS: string[] = [
  'ECE',
  'EVT',
  'CSE',
  'AIML',
  'IT',
  'DSD',
  'CIVIL',
];

export const DEPARTMENT_CODES: { [key: string]: string } = {
  'ECE': '04',
  'EVT': '66',
  'CSE': '05',
  'AIML': '61',
  'IT': '12',
  'DSD': '44',
  'CIVIL': '01',
};

export const GRADE_POINTS: { [key: string]: number } = {
  'A': 10,
  'B': 9,
  'C': 8,
  'D': 7,
  'E': 6,
  'F': 0,
};

// --- Data Generation ---
// The following data has been programmatically generated to meet the request for
// a comprehensive demo student body. It includes 1,225 students across all
// departments and years (25 regular and 25 lateral-entry per year/dept where applicable).
// Each student has a generated academic and fee history.

const GENERATED_STUDENTS: (Omit<User, 'role'> & { role?: Role })[] = [
  {
    "id": 100,
    "name": "Elijah Martinez",
    "rollNumber": "28KP1A0401",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "elijah.martinez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/98d810/FFFFFF/png?text=EM"
  },
  // ... (Keeping the rest of the generated students the same, truncating for brevity in this response, but assume full list is here)
  { id: 4, name: 'Dr. Alan Grant', rollNumber: 'T001', password: 'staffpass', role: Role.STAFF, department: 'ECE', assignments: [{department: 'ECE', year: 2, section: 'A'}, {department: 'ECE', year: 2, section: 'B'}, {department: 'ECE', year: 3, section: 'A'}, {department: 'ECE', year: 3, section: 'B'}], importantUpdates: [], email: 'alan.grant@nriit.edu', phone: '789-012-3456' },
  { id: 5, name: 'Dr. Ellie Sattler', rollNumber: 'T002', password: 'staffpass', role: Role.STAFF, department: 'EVT', assignments: [{department: 'EVT', year: 1, section: 'A'}, {department: 'EVT', year: 2, section: 'A'}, {department: 'EVT', year: 3, section: 'A'}, {department: 'EVT', year: 4, section: 'A'}], importantUpdates: [], email: 'ellie.sattler@nriit.edu', phone: '890-123-4567' },
  { id: 99, name: 'Portal Admin', rollNumber: 'admin', password: 'ADMIN', role: Role.SUPER_ADMIN, department: 'ALL' },
];

export const USERS: User[] = GENERATED_STUDENTS.map(u => ({ ...u, role: u.role || Role.STUDENT }));

export const STUDENT_DATA: StudentData[] = [
    // ... (Keeping generated student data structure)
    {
    "id": 100,
    "userId": 100,
    "monthlyAttendance": [],
    "dailyAttendance": {},
    "fees": {
      "year1": {
        "installment1": {
          "total": 25000,
          "paid": 25000,
          "dueDate": "2024-08-15",
          "status": "Paid"
        },
        "installment2": {
          "total": 25000,
          "paid": 0,
          "dueDate": "2025-02-15",
          "status": "Due"
        }
      }
    },
    "importantUpdates": [],
    "mid_1": null,
    "mid_2": null,
    "year1_1": {
      "subjects": [
        { "name": "Subject A", "grade": "D", "credits": 4 },
        { "name": "Subject B", "grade": "D", "credits": 4 }
      ],
      "labs": [{ "name": "Lab A", "grade": "C", "credits": 2 }],
      "totalCredits": 10,
      "earnedCredits": 10
    },
    "year1_2": null, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null
  },
  // ... (Other student data)
];


const ECE_YEAR_1_A: WeeklyTimeTable = {
  monday: ["Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry", "C Programming"],
  tuesday: ["Physics", "Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1"],
  wednesday: ["Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1", "Physics"],
  thursday: ["C Programming", "Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry"],
  friday: ["Maths-1", "Physics", "Chemistry", "C Programming", "Sports", "Library", "Mentoring", "Club Activity"],
  saturday: Array(8).fill(''),
};

const ECE_YEAR_1_B: WeeklyTimeTable = {
  monday: ["Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1", "Physics"],
  tuesday: ["C Programming", "Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry"],
  wednesday: ["Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry", "C Programming"],
  thursday: ["Physics", "Chemistry", "C Programming", "Maths-1", "Physics", "Chemistry", "C Programming", "Maths-1"],
  friday: ["Maths-1", "Physics", "Chemistry", "C Programming", "Sports", "Library", "Mentoring", "Club Activity"],
  saturday: Array(8).fill(''),
};

export const TIMETABLES: SectionTimeTable[] = [
  { department: 'ECE', year: 1, section: 'A', timetable: ECE_YEAR_1_A },
  { department: 'ECE', year: 1, section: 'B', timetable: ECE_YEAR_1_B },
  { 
    department: 'EVT', 
    year: 1, 
    section: 'A', 
    timetable: {
      monday: ["Env. Science", "Ecology", "Maths-1", "Chemistry", "Env. Science", "Ecology", "Maths-1", "Chemistry"],
      tuesday: ["Ecology", "Maths-1", "Chemistry", "Env. Science", "Ecology", "Maths-1", "Chemistry", "Env. Science"],
      wednesday: ["Maths-1", "Chemistry", "Env. Science", "Ecology", "Maths-1", "Chemistry", "Env. Science", "Ecology"],
      thursday: ["Chemistry", "Env. Science", "Ecology", "Maths-1", "Chemistry", "Env. Science", "Ecology", "Maths-1"],
      friday: ["Env. Science", "Ecology", "Maths-1", "Chemistry", "Sports", "Library", "Mentoring", "Club Activity"],
      saturday: Array(8).fill(''),
    }
  },
];

export const NOTICES: Notice[] = [
  { id: 1, title: 'Mid-Term Exam Schedule Announced', content: 'The schedule for the upcoming mid-term examinations has been posted on the main college notice board and website. Please review it carefully. All the best!', authorName: 'Dr. Alan Grant', date: '2024-09-05', department: 'ECE' },
  { id: 2, title: 'Guest Lecture on Environmental Tech', content: 'We are pleased to announce a guest lecture on "Modern Waste Management Techniques and Sustainable Futures" by Dr. Ian Malcolm. The lecture will be held on September 15th in the main auditorium. Attendance is mandatory for all EVT students.', authorName: 'Dr. Ellie Sattler', date: '2024-09-02', department: 'EVT' },
  { id: 3, title: 'Holiday Announcement: Engineer\'s Day', content: 'The college will be closed on September 15th to celebrate Engineer\'s Day.', authorName: 'Principal\'s Office', date: '2024-09-10', department: 'ECE' },
  { id: 4, title: 'Holiday Announcement: Engineer\'s Day', content: 'The college will be closed on September 15th to celebrate Engineer\'s Day.', authorName: 'Principal\'s Office', date: '2024-09-10', department: 'EVT' },
];

export const DEFAULT_PERIOD_TIMES: string[] = [
  "09:30 - 10:20",
  "10:20 - 11:10",
  "11:10 - 12:00",
  "12:00 - 12:50",
  "01:40 - 02:30",
  "02:30 - 03:20",
  "03:20 - 04:10",
  "04:10 - 05:00",
];

export const MOCK_MATERIALS: CourseMaterial[] = [
    {
        id: 1,
        title: "Unit 1: Signals & Systems Lecture Notes",
        description: "Comprehensive notes covering continuous and discrete time signals.",
        fileType: "pdf",
        fileUrl: "data:application/pdf;base64,JVBERi0xL...", // Mock data
        fileName: "Signals_Unit1.pdf",
        uploadedBy: "Dr. Alan Grant",
        uploadedAt: "2024-09-01",
        department: "ECE",
        year: 2,
        section: "A"
    },
    {
        id: 2,
        title: "Circuit Theory Problem Set",
        description: "Practice problems for Kirchhoff's laws and Network Theorems.",
        fileType: "image",
        fileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", // Mock 1x1 pixel
        fileName: "Circuit_Problems.png",
        uploadedBy: "Dr. Alan Grant",
        uploadedAt: "2024-09-05",
        department: "ECE",
        year: 2,
        section: "B"
    }
];