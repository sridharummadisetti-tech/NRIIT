import React, { useState, useCallback } from 'react';
import { ParsedStudent } from '../types';
import { extractStudentsFromFileContent } from '../services/geminiService';

declare const pdfjsLib: any;
declare const mammoth: any;

interface ImportStudentsModalProps {
  onClose: () => void;
  onImport: (allParsedStudents: ParsedStudent[]) => void;
  existingRollNumbers: string[];
}

type ImportStage = 'upload' | 'parsing' | 'review' | 'importing';

const readFileContent = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const numPages = pdf.numPages;
    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ');
    }
    return fullText;
  } else if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or .docx file.');
  }
};

const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({ onClose, onImport, existingRollNumbers }) => {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [error, setError] = useState<string | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);

  const handleFileDrop = useCallback(async (file: File | null) => {
    if (!file) return;
    setError(null);
    setStage('parsing');
    try {
      const content = await readFileContent(file);
      if (!content.trim()) {
        throw new Error("The uploaded file appears to be empty or could not be read.");
      }
      const students = await extractStudentsFromFileContent(content);
      setParsedStudents(students);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during parsing.');
      setStage('upload');
    }
  }, []);
  
  const handleFileChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileDrop(e.target.files ? e.target.files[0] : null);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileDrop(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const handleConfirmImport = () => {
    onImport(parsedStudents);
    onClose();
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
        const validStudents = parsedStudents.filter(s => !existingRollNumbers.includes(s.rollNumber)).length;
        const duplicateStudents = parsedStudents.length - validStudents;
        return (
          <div>
            <h2 className="text-xl font-bold mb-2">Review Extracted Data</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Found {parsedStudents.length} student(s). {validStudents} can be imported. {duplicateStudents > 0 ? `${duplicateStudents} are duplicates and will be skipped.` : ''}
            </p>
            <div className="max-h-80 overflow-y-auto border dark:border-gray-600 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Roll No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dept</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Year</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Section</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Fees</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Paid Fees</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {parsedStudents.map((student, index) => {
                    const isDuplicate = existingRollNumbers.includes(student.rollNumber);
                    return (
                      <tr key={index} className={isDuplicate ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {isDuplicate ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">Duplicate</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Ready</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.rollNumber}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.email ?? 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.phone ?? 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.year}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.section ?? 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.totalFees?.toLocaleString() ?? 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.paidFees?.toLocaleString() ?? 'N/A'}</td>
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
            <h2 className="text-xl font-bold mb-2">Import Students from File</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload a PDF or Word document (.docx) containing student details.</p>
            <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input type="file" id="file-upload" className="hidden" accept=".pdf,.docx" onChange={handleFileChangeEvent} />
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-3-3m0 0l3-3m-3 3h12" /></svg>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">PDF or DOCX</p>
            </div>
          </>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-5xl anim-modal-content">
        {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300" role="alert">{error}</div>}
        {renderContent()}
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
          {stage === 'review' && (
            <button
                onClick={handleConfirmImport}
                disabled={parsedStudents.filter(s => !existingRollNumbers.includes(s.rollNumber)).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
            >
                Confirm & Import {parsedStudents.filter(s => !existingRollNumbers.includes(s.rollNumber)).length} Student(s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportStudentsModal;
