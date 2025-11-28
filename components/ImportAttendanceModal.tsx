import React, { useState, useCallback } from 'react';
import { User, StudentData, ParsedAttendanceRecord } from '../types';
import { extractAttendanceFromFile } from '../services/geminiService';

interface ImportAttendanceModalProps {
  onClose: () => void;
  onImport: (allParsedRecords: ParsedAttendanceRecord[]) => void;
  students: User[];
  allStudentData: StudentData[];
}

type ImportStage = 'upload' | 'parsing' | 'review';

const ImportAttendanceModal: React.FC<ImportAttendanceModalProps> = ({ onClose, onImport, students, allStudentData }) => {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [error, setError] = useState<string | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedAttendanceRecord[]>([]);

  const studentMap = new Map(students.map(s => [s.rollNumber, s.name]));
  const studentDataMap = new Map<string, StudentData>(
    allStudentData.reduce((acc, sd) => {
        const user = students.find(u => u.id === sd.userId);
        if (user) {
            acc.push([user.rollNumber, sd]);
        }
        return acc;
    }, [] as [string, StudentData][])
  );

  const handleFileDrop = useCallback(async (file: File | null) => {
    if (!file) return;
    setError(null);
    setStage('parsing');
    try {
      const records = await extractAttendanceFromFile(file);
      if (records.length === 0) {
        throw new Error("The AI could not find any valid attendance records in the uploaded file. Please check the file content and try again.");
      }
      setParsedRecords(records);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during parsing.');
      setStage('upload');
    }
  }, [students]);

  const handleFileChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileDrop(e.target.files ? e.target.files[0] : null);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileDrop(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const handleConfirmImport = () => {
    onImport(parsedRecords);
    onClose();
  };

  const getRecordStatus = (record: ParsedAttendanceRecord): { text: string; className: string } => {
    if (!studentMap.has(record.rollNumber)) {
      return { text: 'Not Found', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
    }
    
    const studentData = studentDataMap.get(record.rollNumber);
    if (studentData) {
      const existing = studentData.monthlyAttendance.find(
        att => att.month.toLowerCase() === record.month.toLowerCase() && att.year === record.year
      );
      if (existing) {
        return { text: 'Update', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' };
      }
    }
    return { text: 'New', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
  };
  
  const renderContent = () => {
    switch (stage) {
      case 'parsing':
        return (
          <div className="text-center p-8">
            <div className="mx-auto w-12 h-12 border-4 border-t-blue-500 border-gray-200 dark:border-gray-600 rounded-full animate-spin"></div>
            <h3 className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-200">Parsing File...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">The AI is analyzing your document. This may take a moment.</p>
          </div>
        );
      case 'review':
        const validRecords = parsedRecords.filter(r => studentMap.has(r.rollNumber)).length;
        const invalidRecords = parsedRecords.length - validRecords;
        return (
          <div>
            <h2 className="text-xl font-bold mb-2">Review Extracted Attendance Data</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Found {parsedRecords.length} record(s). {validRecords} can be imported. {invalidRecords > 0 ? `${invalidRecords} will be skipped as they belong to unknown students.` : ''}
            </p>
            <div className="max-h-80 overflow-y-auto border dark:border-gray-600 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Roll No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Year</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Present</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Days</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {parsedRecords.map((record, index) => {
                    const status = getRecordStatus(record);
                    const studentName = studentMap.get(record.rollNumber);
                    return (
                      <tr key={index} className={status.text === 'Not Found' ? 'bg-red-50 dark:bg-red-900/30' : ''}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}>{status.text}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.rollNumber}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{studentName || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{record.month}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{record.year}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{record.present}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{record.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'upload':
      default:
        return (
          <>
            <h2 className="text-xl font-bold mb-2">Import Attendance from File</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload a PDF, Word document (.docx), or Image file containing attendance details.</p>
            <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('attendance-file-upload')?.click()}
            >
                <input type="file" id="attendance-file-upload" className="hidden" accept=".pdf,.docx,image/*" onChange={handleFileChangeEvent} />
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-3-3m0 0l3-3m-3 3h12" /></svg>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">PDF, DOCX, PNG, JPG, etc.</p>
            </div>
          </>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-4xl">
        {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300" role="alert">{error}</div>}
        {renderContent()}
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
          {stage === 'review' && (
            <button
                onClick={handleConfirmImport}
                disabled={parsedRecords.filter(r => studentMap.has(r.rollNumber)).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
            >
                Confirm & Import {parsedRecords.filter(r => studentMap.has(r.rollNumber)).length} Record(s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportAttendanceModal;
