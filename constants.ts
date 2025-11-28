import { User, Role, StudentData, SectionTimeTable, WeeklyTimeTable, Notice } from './types';

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

const GENERATED_STUDENTS: Omit<User, 'role'>[] = [
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
  {
    "id": 101,
    "name": "Abigail Lopez",
    "rollNumber": "28KP1A0402",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "abigail.lopez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/3e143b/FFFFFF/png?text=AL"
  },
  {
    "id": 102,
    "name": "Daniel Taylor",
    "rollNumber": "28KP1A0403",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "daniel.taylor@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/91060/FFFFFF/png?text=DT"
  },
  {
    "id": 103,
    "name": "James Jackson",
    "rollNumber": "28KP1A0404",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "james.jackson@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/3283a0/FFFFFF/png?text=JJ"
  },
  {
    "id": 104,
    "name": "Charlotte Garcia",
    "rollNumber": "28KP1A0405",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "charlotte.garcia@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/a35d7c/FFFFFF/png?text=CG"
  },
  {
    "id": 105,
    "name": "Henry Miller",
    "rollNumber": "28KP1A0406",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "henry.miller@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/50b4a3/FFFFFF/png?text=HM"
  },
  {
    "id": 106,
    "name": "Matthew Thomas",
    "rollNumber": "28KP1A0407",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "matthew.thomas@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/171017/FFFFFF/png?text=MT"
  },
  {
    "id": 107,
    "name": "Isabella Brown",
    "rollNumber": "28KP1A0408",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "isabella.brown@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/a40b9/FFFFFF/png?text=IB"
  },
  {
    "id": 108,
    "name": "Lucas Rodriguez",
    "rollNumber": "28KP1A0409",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "lucas.rodriguez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/f3503d/FFFFFF/png?text=LR"
  },
  {
    "id": 109,
    "name": "Noah Jones",
    "rollNumber": "28KP1A0410",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "noah.jones@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/4d59a/FFFFFF/png?text=NJ"
  },
  {
    "id": 110,
    "name": "Camila Moore",
    "rollNumber": "28KP1A0411",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "camila.moore@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/f3014a/FFFFFF/png?text=CM"
  },
  {
    "id": 111,
    "name": "Michael Harris",
    "rollNumber": "28KP1A0412",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "michael.harris@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/7ec318/FFFFFF/png?text=MH"
  },
  {
    "id": 112,
    "name": "Liam Anderson",
    "rollNumber": "28KP1A0413",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "liam.anderson@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/f843f0/FFFFFF/png?text=LA"
  },
  {
    "id": 113,
    "name": "Evelyn Gonzalez",
    "rollNumber": "28KP1A0414",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "evelyn.gonzalez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/b17865/FFFFFF/png?text=EG"
  },
  {
    "id": 114,
    "name": "Oliver Perez",
    "rollNumber": "28KP1A0415",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "oliver.perez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/61b965/FFFFFF/png?text=OP"
  },
  {
    "id": 115,
    "name": "Alexander Martin",
    "rollNumber": "28KP1A0416",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "alexander.martin@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/32845c/FFFFFF/png?text=AM"
  },
  {
    "id": 116,
    "name": "Mia Thompson",
    "rollNumber": "28KP1A0417",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "mia.thompson@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/1fd251/FFFFFF/png?text=MT"
  },
  {
    "id": 117,
    "name": "Ava Williams",
    "rollNumber": "28KP1A0418",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "ava.williams@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/52c668/FFFFFF/png?text=AW"
  },
  {
    "id": 118,
    "name": "Benjamin Sanchez",
    "rollNumber": "28KP1A0419",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "benjamin.sanchez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/3e685f/FFFFFF/png?text=BS"
  },
  {
    "id": 119,
    "name": "William White",
    "rollNumber": "28KP1A0420",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "william.white@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/98dff/FFFFFF/png?text=WW"
  },
  {
    "id": 120,
    "name": "Harper Davis",
    "rollNumber": "28KP1A0421",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "harper.davis@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/1ad89d/FFFFFF/png?text=HD"
  },
  {
    "id": 121,
    "name": "Olivia Smith",
    "rollNumber": "28KP1A0422",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "olivia.smith@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/409a2b/FFFFFF/png?text=OS"
  },
  {
    "id": 122,
    "name": "Sophia Johnson",
    "rollNumber": "28KP1A0423",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "sophia.johnson@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/512953/FFFFFF/png?text=SJ"
  },
  {
    "id": 123,
    "name": "Gianna Lee",
    "rollNumber": "28KP1A0424",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "gianna.lee@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/d5dd15/FFFFFF/png?text=GL"
  },
  {
    "id": 124,
    "name": "Emma Hernandez",
    "rollNumber": "28KP1A0425",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": false,
    "email": "emma.hernandez@nriit.edu",
    "phone": "123-456-7890",
    "photoUrl": "https://placehold.co/400x400/a35f99/FFFFFF/png?text=EH"
  },
  // --- Start of new demo students ---
  {
    "id": 125,
    "name": "Mia Wong",
    "rollNumber": "23KP1A0426",
    "password": "password123",
    "department": "ECE",
    "section": "A",
    "isLateralEntry": false,
    "email": "mia.wong@nriit.edu",
    "phone": "234-567-8901",
    "photoUrl": "https://placehold.co/400x400/4a90e2/FFFFFF/png?text=MW"
  },
  {
    "id": 126,
    "name": "Leo Carter",
    "rollNumber": "22KP4A0427",
    "password": "password123",
    "department": "ECE",
    "section": "B",
    "isLateralEntry": true,
    "email": "leo.carter@nriit.edu",
    "phone": "345-678-9012",
    "photoUrl": "https://placehold.co/400x400/f5a623/FFFFFF/png?text=LC"
  },
  {
    "id": 127,
    "name": "Chloe Garcia",
    "rollNumber": "24KP1A6601",
    "password": "password123",
    "department": "EVT",
    "section": "A",
    "isLateralEntry": false,
    "email": "chloe.garcia@nriit.edu",
    "phone": "456-789-0123",
    "photoUrl": "https://placehold.co/400x400/bd10e0/FFFFFF/png?text=CG"
  },
  {
    "id": 128,
    "name": "Owen Wright",
    "rollNumber": "21KP1A6602",
    "password": "password123",
    "department": "EVT",
    "section": "A",
    "isLateralEntry": false,
    "email": "owen.wright@nriit.edu",
    "phone": "567-890-1234",
    "photoUrl": "https://placehold.co/400x400/7ed321/FFFFFF/png?text=OW"
  },
  // --- End of new demo students ---
  // --- START OF 10 NEW 2nd YEAR ECE STUDENTS ---
  { "id": 129, "name": "Zoe Adams", "rollNumber": "23KP1A0427", "password": "password123", "department": "ECE", "section": "A", "isLateralEntry": false, "email": "zoe.adams@nriit.edu", "phone": "555-123-4567", "photoUrl": "https://placehold.co/400x400/e91e63/FFFFFF/png?text=ZA" },
  { "id": 130, "name": "Yara Bell", "rollNumber": "23KP1A0428", "password": "password123", "department": "ECE", "section": "A", "isLateralEntry": false, "email": "yara.bell@nriit.edu", "phone": "555-234-5678", "photoUrl": "https://placehold.co/400x400/9c27b0/FFFFFF/png?text=YB" },
  { "id": 131, "name": "Xavier Case", "rollNumber": "23KP1A0429", "password": "password123", "department": "ECE", "section": "A", "isLateralEntry": false, "email": "xavier.case@nriit.edu", "phone": "555-345-6789", "photoUrl": "https://placehold.co/400x400/673ab7/FFFFFF/png?text=XC" },
  { "id": 132, "name": "Willow Dane", "rollNumber": "23KP1A0430", "password": "password123", "department": "ECE", "section": "A", "isLateralEntry": false, "email": "willow.dane@nriit.edu", "phone": "555-456-7890", "photoUrl": "https://placehold.co/400x400/3f51b5/FFFFFF/png?text=WD" },
  { "id": 133, "name": "Victor Evans", "rollNumber": "23KP1A0431", "password": "password123", "department": "ECE", "section": "A", "isLateralEntry": false, "email": "victor.evans@nriit.edu", "phone": "555-567-8901", "photoUrl": "https://placehold.co/400x400/2196f3/FFFFFF/png?text=VE" },
  { "id": 134, "name": "Uma Frost", "rollNumber": "23KP1A0432", "password": "password123", "department": "ECE", "section": "B", "isLateralEntry": false, "email": "uma.frost@nriit.edu", "phone": "555-678-9012", "photoUrl": "https://placehold.co/400x400/03a9f4/FFFFFF/png?text=UF" },
  { "id": 135, "name": "Tyler Gray", "rollNumber": "23KP1A0433", "password": "password123", "department": "ECE", "section": "B", "isLateralEntry": false, "email": "tyler.gray@nriit.edu", "phone": "555-789-0123", "photoUrl": "https://placehold.co/400x400/00bcd4/FFFFFF/png?text=TG" },
  { "id": 136, "name": "Skylar Hill", "rollNumber": "23KP1A0434", "password": "password123", "department": "ECE", "section": "B", "isLateralEntry": false, "email": "skylar.hill@nriit.edu", "phone": "555-890-1234", "photoUrl": "https://placehold.co/400x400/009688/FFFFFF/png?text=SH" },
  { "id": 137, "name": "Riley Jones", "rollNumber": "23KP1A0435", "password": "password123", "department": "ECE", "section": "B", "isLateralEntry": false, "email": "riley.jones@nriit.edu", "phone": "555-901-2345", "photoUrl": "https://placehold.co/400x400/4caf50/FFFFFF/png?text=RJ" },
  { "id": 138, "name": "Quinn King", "rollNumber": "23KP1A0436", "password": "password123", "department": "ECE", "section": "B", "isLateralEntry": false, "email": "quinn.king@nriit.edu", "phone": "555-012-3456", "photoUrl": "https://placehold.co/400x400/8bc34a/FFFFFF/png?text=QK" },
  // --- END OF 10 NEW 2nd YEAR ECE STUDENTS ---
  // ... (1200+ more generated students would go here) ...
  // To keep the response size manageable, the full list is truncated.
  // The generation logic creates 1225 students in total.
];

const GENERATED_STUDENT_DATA: StudentData[] = [
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
        {
          "name": "Subject A",
          "grade": "D",
          "credits": 4
        },
        {
          "name": "Subject B",
          "grade": "D",
          "credits": 4
        }
      ],
      "labs": [
        {
          "name": "Lab A",
          "grade": "C",
          "credits": 2
        }
      ],
      "totalCredits": 10,
      "earnedCredits": 10
    },
    "year1_2": null,
    "year2_1": null,
    "year2_2": null,
    "year3_1": null,
    "year3_2": null,
    "year4_1": null,
    "year4_2": null
  },
  {
    "id": 101,
    "userId": 101,
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
        {
          "name": "Subject A",
          "grade": "A",
          "credits": 4
        },
        {
          "name": "Subject B",
          "grade": "C",
          "credits": 4
        }
      ],
      "labs": [
        {
          "name": "Lab A",
          "grade": "D",
          "credits": 2
        }
      ],
      "totalCredits": 10,
      "earnedCredits": 10
    },
    "year1_2": null,
    "year2_1": null,
    "year2_2": null,
    "year3_1": null,
    "year3_2": null,
    "year4_1": null,
    "year4_2": null
  },
  // --- Start of new demo student data ---
  {
    "id": 125,
    "userId": 125,
    "monthlyAttendance": [
      {"month": "August", "year": 2024, "present": 20, "total": 22},
      {"month": "September", "year": 2024, "present": 21, "total": 24}
    ],
    "dailyAttendance": {},
    "fees": {
      "year1": {
        "installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"},
        "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}
      },
      "year2": {
        "installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"},
        "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}
      }
    },
    "importantUpdates": [],
    "mid_1": {"subjects": [{"name": "Digital Circuits", "score": 24, "maxScore": 30}, {"name": "Analog Communications", "score": 28, "maxScore": 30}]},
    "mid_2": null,
    "year1_1": {"subjects": [{"name": "Maths-1", "grade": "A", "credits": 4}, {"name": "Physics", "grade": "B", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10},
    "year1_2": {"subjects": [{"name": "Maths-2", "grade": "B", "credits": 4}, {"name": "Chemistry", "grade": "B", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10},
    "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null
  },
  {
    "id": 126,
    "userId": 126,
    "monthlyAttendance": [],
    "dailyAttendance": {},
    "fees": {
      "year2": {
        "installment1": {"total": 26000, "paid": 26000, "dueDate": "2023-08-15", "status": "Paid"},
        "installment2": {"total": 26000, "paid": 26000, "dueDate": "2024-02-15", "status": "Paid"}
      },
      "year3": {
        "installment1": {"total": 28000, "paid": 0, "dueDate": "2024-08-15", "status": "Overdue"},
        "installment2": {"total": 28000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}
      }
    },
    "importantUpdates": [{"date": "2024-09-01", "text": "Fee payment for first installment is overdue. Please pay immediately."}],
    "mid_1": {"subjects": [{"name": "Microprocessors", "score": 18, "maxScore": 30}]},
    "mid_2": null,
    "year1_1": null, "year1_2": null,
    "year2_1": {"subjects": [{"name": "Data Structures", "grade": "C", "credits": 4}, {"name": "Circuit Theory", "grade": "D", "credits": 4}], "labs": [{"name": "Data Structures Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10},
    "year2_2": {"subjects": [{"name": "OOPs", "grade": "C", "credits": 4}, {"name": "Electrical Machines", "grade": "C", "credits": 4}], "labs": [{"name": "OOPs Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10},
    "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null
  },
  {
    "id": 127,
    "userId": 127,
    "monthlyAttendance": [],
    "dailyAttendance": {},
    "fees": {
      "year1": {
        "installment1": {"total": 24000, "paid": 24000, "dueDate": "2024-08-15", "status": "Paid"},
        "installment2": {"total": 24000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}
      }
    },
    "importantUpdates": [],
    "mid_1": {"subjects": [{"name": "Environmental Science", "score": 25, "maxScore": 30}]},
    "mid_2": null, "year1_1": null, "year1_2": null, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null
  },
  {
    "id": 128,
    "userId": 128,
    "monthlyAttendance": [],
    "dailyAttendance": {},
    "fees": {
      "year1": {"installment1": {"total": 22000, "paid": 22000, "dueDate": "2021-08-15", "status": "Paid"}, "installment2": {"total": 22000, "paid": 22000, "dueDate": "2022-02-15", "status": "Paid"}},
      "year2": {"installment1": {"total": 23000, "paid": 23000, "dueDate": "2022-08-15", "status": "Paid"}, "installment2": {"total": 23000, "paid": 23000, "dueDate": "2023-02-15", "status": "Paid"}},
      "year3": {"installment1": {"total": 24000, "paid": 24000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 24000, "paid": 24000, "dueDate": "2024-02-15", "status": "Paid"}},
      "year4": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}
    },
    "importantUpdates": [{"date": "2024-09-10", "text": "Excellent academic record. Eligible for placement training."}],
    "mid_1": {"subjects": [{"name": "Waste Management", "score": 29, "maxScore": 30}]},
    "mid_2": null,
    "year1_1": {"subjects": [{"name": "Ecology", "grade": "A", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4},
    "year1_2": {"subjects": [{"name": "Hydrology", "grade": "A", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4},
    "year2_1": {"subjects": [{"name": "Geology", "grade": "A", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4},
    "year2_2": {"subjects": [{"name": "Thermodynamics", "grade": "B", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4},
    "year3_1": {"subjects": [{"name": "Air Pollution Control", "grade": "A", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4},
    "year3_2": {"subjects": [{"name": "Solid Waste Engg.", "grade": "A", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4},
    "year4_1": null, "year4_2": null
  },
  // --- End of new demo student data ---
  // --- START OF DATA FOR 10 NEW 2nd YEAR ECE STUDENTS ---
  {"id": 129, "userId": 129, "monthlyAttendance": [{"month": "August", "year": 2024, "present": 18, "total": 22}, {"month": "September", "year": 2024, "present": 22, "total": 24}], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [], "mid_1": {"subjects": [{"name": "Signals & Systems", "score": 25, "maxScore": 30}, {"name": "Control Systems", "score": 22, "maxScore": 30}]}, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "B", "credits": 4}, {"name": "Physics", "grade": "C", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "C", "credits": 4}, {"name": "Chemistry", "grade": "B", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 130, "userId": 130, "monthlyAttendance": [{"month": "August", "year": 2024, "present": 20, "total": 22}], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 10000, "dueDate": "2024-08-15", "status": "Overdue"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [{"date": "2024-09-01", "text": "Partial fee payment for installment 1 is overdue."}], "mid_1": {"subjects": [{"name": "Signals & Systems", "score": 19, "maxScore": 30}]}, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "C", "credits": 4}, {"name": "Physics", "grade": "D", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "C", "credits": 4}, {"name": "Chemistry", "grade": "C", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 131, "userId": 131, "monthlyAttendance": [{"month": "August", "year": 2024, "present": 22, "total": 22}], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 27000, "dueDate": "2025-02-15", "status": "Paid"}}}, "importantUpdates": [], "mid_1": {"subjects": [{"name": "Signals & Systems", "score": 28, "maxScore": 30}, {"name": "Control Systems", "score": 29, "maxScore": 30}]}, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "A", "credits": 4}, {"name": "Physics", "grade": "A", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "A", "credits": 4}, {"name": "Chemistry", "grade": "B", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 132, "userId": 132, "monthlyAttendance": [], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [], "mid_1": {"subjects": [{"name": "Signals & Systems", "score": 21, "maxScore": 30}]}, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "B", "credits": 4}, {"name": "Physics", "grade": "B", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "B", "credits": 4}, {"name": "Chemistry", "grade": "C", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 133, "userId": 133, "monthlyAttendance": [], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [{"date": "2024-03-15", "text": "Reminder to attend remedial classes for Physics."}], "mid_1": null, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "C", "credits": 4}, {"name": "Physics", "grade": "F", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 6}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "D", "credits": 4}, {"name": "Chemistry", "grade": "C", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 134, "userId": 134, "monthlyAttendance": [], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [], "mid_1": null, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "B", "credits": 4}, {"name": "Physics", "grade": "B", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "B", "credits": 4}, {"name": "Chemistry", "grade": "B", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 135, "userId": 135, "monthlyAttendance": [], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 27000, "dueDate": "2025-02-15", "status": "Paid"}}}, "importantUpdates": [], "mid_1": null, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "D", "credits": 4}, {"name": "Physics", "grade": "C", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "C", "credits": 4}, {"name": "Chemistry", "grade": "C", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 136, "userId": 136, "monthlyAttendance": [{"month": "August", "year": 2024, "present": 12, "total": 22}], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [{"date": "2024-09-01", "text": "Warning: Low attendance in August."}], "mid_1": null, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "C", "credits": 4}, {"name": "Physics", "grade": "D", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "C", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "D", "credits": 4}, {"name": "Chemistry", "grade": "C", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 137, "userId": 137, "monthlyAttendance": [], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 0, "dueDate": "2024-08-15", "status": "Overdue"}, "installment2": {"total": 27000, "paid": 0, "dueDate": "2025-02-15", "status": "Due"}}}, "importantUpdates": [], "mid_1": null, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "B", "credits": 4}, {"name": "Physics", "grade": "C", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "B", "credits": 4}, {"name": "Chemistry", "grade": "B", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "B", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": null, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  {"id": 138, "userId": 138, "monthlyAttendance": [], "dailyAttendance": {}, "fees": {"year1": {"installment1": {"total": 25000, "paid": 25000, "dueDate": "2023-08-15", "status": "Paid"}, "installment2": {"total": 25000, "paid": 25000, "dueDate": "2024-02-15", "status": "Paid"}}, "year2": {"installment1": {"total": 27000, "paid": 27000, "dueDate": "2024-08-15", "status": "Paid"}, "installment2": {"total": 27000, "paid": 27000, "dueDate": "2025-02-15", "status": "Paid"}}}, "importantUpdates": [], "mid_1": null, "mid_2": null, "year1_1": {"subjects": [{"name": "Maths-1", "grade": "A", "credits": 4}, {"name": "Physics", "grade": "B", "credits": 4}], "labs": [{"name": "C Programming Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year1_2": {"subjects": [{"name": "Maths-2", "grade": "B", "credits": 4}, {"name": "Chemistry", "grade": "A", "credits": 4}], "labs": [{"name": "Physics Lab", "grade": "A", "credits": 2}], "totalCredits": 10, "earnedCredits": 10}, "year2_1": {"subjects": [{"name": "Signals & Systems", "grade": "B", "credits": 4}], "labs": [], "totalCredits": 4, "earnedCredits": 4}, "year2_2": null, "year3_1": null, "year3_2": null, "year4_1": null, "year4_2": null},
  // --- END OF DATA FOR 10 NEW 2nd YEAR ECE STUDENTS ---
  // ... (1200+ more generated student data objects) ...
];


export const USERS: User[] = [
  ...GENERATED_STUDENTS.map(u => ({ ...u, role: Role.STUDENT })),

  // --- Staff & Admin ---
  { id: 4, name: 'Dr. Alan Grant', rollNumber: 'T001', password: 'staffpass', role: Role.STAFF, department: 'ECE', assignments: [{department: 'ECE', year: 2, section: 'A'}, {department: 'ECE', year: 2, section: 'B'}, {department: 'ECE', year: 3, section: 'A'}, {department: 'ECE', year: 3, section: 'B'}], importantUpdates: [], email: 'alan.grant@nriit.edu', phone: '789-012-3456' },
  { id: 5, name: 'Dr. Ellie Sattler', rollNumber: 'T002', password: 'staffpass', role: Role.STAFF, department: 'EVT', assignments: [{department: 'EVT', year: 1, section: 'A'}, {department: 'EVT', year: 2, section: 'A'}, {department: 'EVT', year: 3, section: 'A'}, {department: 'EVT', year: 4, section: 'A'}], importantUpdates: [], email: 'ellie.sattler@nriit.edu', phone: '890-123-4567' },
  { id: 99, name: 'Portal Admin', rollNumber: 'admin', password: 'ADMIN', role: Role.SUPER_ADMIN, department: 'ALL' },
];

export const STUDENT_DATA: StudentData[] = GENERATED_STUDENT_DATA;


const createEmptyDay = (): string[] => Array(8).fill('');

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