

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatAuthor, User, StudentData, YearMarks, AttendanceRecord, MidTermMarks, YearlyFee } from '../types';
import { generateChatResponse } from '../services/geminiService';
import ChatMessageBubble from './ChatMessageBubble';

interface ChatbotProps {
  user: User;
  studentData: StudentData | undefined;
}

const calculateOverallAttendance = (records: AttendanceRecord[]): number => {
    if (!records || records.length === 0) return 0;
    const totalPresent = records.reduce((acc, r) => acc + r.present, 0);
    const totalWorkingDays = records.reduce((acc, r) => acc + r.total, 0);
    if (totalWorkingDays === 0) return 0;
    return Math.round((totalPresent / totalWorkingDays) * 100);
};

const Chatbot: React.FC<ChatbotProps> = ({ user, studentData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { author: ChatAuthor.AI, text: "Hello! How can I help you today? Ask me about your marks, attendance, fees or recent updates." },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = { author: ChatAuthor.USER, text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    let prompt = currentInput;
    if (user.role === 'student' && studentData) {
      const academicPeriods = {
        mid_1: "Mid-Term 1", mid_2: "Mid-Term 2",
        year1_1: "YEAR(1-1)", year1_2: "YEAR(1-2)",
        year2_1: "YEAR(2-1)", year2_2: "YEAR(2-2)",
        year3_1: "YEAR(3-1)", year3_2: "YEAR(3-2)",
        year4_1: "YEAR(4-1)", year4_2: "YEAR(4-2)",
      };

      const formatYearMarks = (periodData: YearMarks | null, title: string) => {
        if (!periodData) return `${title}:\nNo data available yet.`;
        
        const subjects = periodData.subjects.filter(s => s.name).map(s => `- ${s.name}: Grade ${s.grade} (${s.credits} credits)`).join('\n');
        const labs = periodData.labs.filter(l => l.name).map(l => `- ${l.name}: Grade ${l.grade} (${l.credits} credits)`).join('\n');
        
        return `${title}:\nTheory Subjects:\n${subjects || 'N/A'}\nLabs:\n${labs || 'N/A'}\nResult: Earned ${periodData.earnedCredits} out of ${periodData.totalCredits} total credits.`;
      };

      const formatMidTermMarks = (periodData: MidTermMarks | null, title: string) => {
        if (!periodData) return `${title}:\nNo data available yet.`;
        const subjects = periodData.subjects.filter(s => s.name).map(s => `- ${s.name}: ${s.score}/${s.maxScore} marks`).join('\n');
        return `${title}:\nSubjects:\n${subjects || 'N/A'}`;
      };

      const academicRecords = (Object.keys(academicPeriods) as Array<keyof typeof academicPeriods>)
        .map(key => {
            if (key === 'mid_1' || key === 'mid_2') {
                return formatMidTermMarks(studentData[key], academicPeriods[key]);
            }
            return formatYearMarks(studentData[key as keyof StudentData] as YearMarks | null, academicPeriods[key]);
        })
        .join('\n\n');
      
      const overallAttendance = calculateOverallAttendance(studentData.monthlyAttendance);
      const monthlyAttendanceSummary = studentData.monthlyAttendance
        .slice(-3) // Get last 3 months
        .map(r => `- ${r.month} ${r.year}: ${r.present}/${r.total} days (${Math.round((r.present/r.total)*100)}%)`)
        .join('\n');
      
      const importantUpdatesSummary = studentData.importantUpdates.length > 0
        ? studentData.importantUpdates.map(u => `- ${u.date}: ${u.text}`).join('\n')
        : 'No important updates available.';
        
      const feeSummary = Object.entries(studentData.fees).map(([yearKey, yearData]: [string, YearlyFee]) => {
          const yearNum = yearKey.replace('year', '');
          const inst1 = yearData.installment1;
          const inst2 = yearData.installment2;
          return `Year ${yearNum} Fees:
- Installment 1: Paid ₹${inst1.paid.toLocaleString()} of ₹${inst1.total.toLocaleString()}. Status: ${inst1.status}. Due: ${inst1.dueDate}.
- Installment 2: Paid ₹${inst2.paid.toLocaleString()} of ₹${inst2.total.toLocaleString()}. Status: ${inst2.status}. Due: ${inst2.dueDate}.
`;
      }).join('\n');

      // Fix: Explicitly type 'year' as YearlyFee in the reduce callback to avoid operating on an 'unknown' type.
      const totalFees = (Object.values(studentData.fees) as YearlyFee[]).reduce((sum, year) => sum + year.installment1.total + year.installment2.total, 0);
      const totalPaid = (Object.values(studentData.fees) as YearlyFee[]).reduce((sum, year) => sum + year.installment1.paid + year.installment2.paid, 0);

      prompt = `
        You are an academic assistant AI integrated into a student portal.
        You are speaking to ${user.name} (Roll No: ${user.rollNumber}, Email: ${user.email || 'Not provided'}, Phone: ${user.phone || 'Not provided'}).
        Your goal is to answer their questions based ONLY on the academic data provided below.
        Be friendly, encouraging, and present the information clearly.
        For academic records, if a student has an 'F' grade, mention it clearly as a failed subject.
        For Mid-Terms, report the marks as they are given.
        If the answer is not in the data, state that you do not have access to that specific information. Do not make up any data.

        ACADEMIC DATA FOR ${user.name.toUpperCase()}:
        =========================
        ATTENDANCE:
        - Overall Percentage: ${overallAttendance}%
        - Recent Monthly Records:
        ${monthlyAttendanceSummary || 'No monthly records available.'}

        FEE STATUS:
        - Overall Total Fees (All Years): ₹${totalFees.toLocaleString()}
        - Overall Fees Paid (All Years): ₹${totalPaid.toLocaleString()}
        - Overall Amount Due (All Years): ₹${(totalFees - totalPaid).toLocaleString()}
        
        Detailed Breakdown by Year:
        ${feeSummary}

        ACADEMIC RECORDS (MARKS, GRADES & CREDITS):
        ${academicRecords}

        IMPORTANT UPDATES & REMARKS:
        ${importantUpdatesSummary}
        =========================

        Now, please answer this question from the student: "${currentInput}"
      `;
    }

    try {
      const aiResponseText = await generateChatResponse(prompt, isThinkingMode);
      const aiMessage: ChatMessage = { author: ChatAuthor.AI, text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { author: ChatAuthor.SYSTEM, text: "Sorry, I couldn't get a response. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const ThinkingModeToggle = () => (
    <div className="flex items-center justify-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-colors ${isThinkingMode ? 'text-purple-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.75 2.75a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM9.25 3.5a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5zM6.75 5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM5 6a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0V6zM13.25 5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM15 6a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0V6zM9 10a1 1 0 011-1h.008a1 1 0 110 2H10a1 1 0 01-1-1zM5.5 10a1 1 0 011-1h.008a1 1 0 110 2H6.5a1 1 0 01-1-1zm8.5 0a1 1 0 011-1h.008a1 1 0 110 2H15a1 1 0 01-1-1zM10 12.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
      </svg>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Deep Thinking</span>
      <label htmlFor="thinking-toggle" className="flex items-center cursor-pointer">
        <div className="relative">
          <input type="checkbox" id="thinking-toggle" className="sr-only" checked={isThinkingMode} onChange={() => setIsThinkingMode(!isThinkingMode)} />
          <div className="block bg-gray-300 dark:bg-gray-600 w-12 h-6 rounded-full"></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isThinkingMode ? 'translate-x-6 bg-purple-400' : ''}`}></div>
        </div>
      </label>
    </div>
  );

  return (
    <>
      <div className={`fixed bottom-0 right-0 m-4 md:m-8 ${isOpen ? 'hidden' : ''}`}>
        <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-transform hover:scale-110 btn-interactive">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>

      <div className={`fixed bottom-0 right-0 m-0 md:m-8 w-full md:w-[440px] h-full md:h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col ${isOpen ? 'anim-chat-window' : 'hidden'}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">AI Assistant</h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white btn-interactive">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 space-y-4">
          {messages.map((msg, index) => <ChatMessageBubble key={index} message={msg} />)}
          {isLoading && <ChatMessageBubble message={{ author: ChatAuthor.AI, text: "Thinking..." }} isLoading={true} />}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <ThinkingModeToggle />
          <div className="flex items-center mt-3">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-l-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-600 text-white p-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 btn-interactive"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;