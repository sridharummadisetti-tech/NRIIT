import { GoogleGenAI, Type } from "@google/genai";
import { ParsedStudent, ParsedAttendanceRecord } from '../types';

declare const pdfjsLib: any;
declare const mammoth: any;

// Helper function to read text from PDF/DOCX
const readFileAsText = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ');
    }
    return fullText;
  } else if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  return Promise.reject('Unsupported text file type');
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generateChatResponse = async (prompt: string, isThinkingMode: boolean): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const modelName = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const config = isThinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    if (error instanceof Error) {
        return `An error occurred while contacting the AI: ${error.message}. Please check your API key and network connection.`;
    }
    return "An unknown error occurred while contacting the AI.";
  }
};

export const extractStudentsFromFileContent = async (fileContent: string): Promise<ParsedStudent[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an intelligent data extraction assistant.
    Your task is to analyze the following text content and extract a list of students.
    Each student record should contain their full name, roll number (if available), department, academic year, section, email, and phone number.
    Also extract fee information if available (totalFees, paidFees).
    Crucially, determine if a student is a 'lateral entry' student, which typically means they are joining in their 2nd year. Set 'isLateralEntry' to true if they are.
    If roll number, fees, email, phone, section, or lateral entry status are not mentioned, you can omit those fields.
    The system will generate a standardized roll number if one is not provided, so focus on accuracy for other fields.
    Years should be a single digit (1, 2, 3, or 4).
    Return the data in a valid JSON array format. If the text is empty or has no student data, return an empty array.

    Here is the text content:
    ---
    ${fileContent}
    ---
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Student's full name" },
        rollNumber: { type: Type.STRING, description: "Student's unique roll number (if present in the text)" },
        department: { type: Type.STRING, description: "Student's department (e.g., ECE, EVT)" },
        year: { type: Type.STRING, description: "Student's academic year as a single digit string (e.g., '1', '2')" },
        section: { type: Type.STRING, description: "Student's class section (e.g., A, B)" },
        isLateralEntry: { type: Type.BOOLEAN, description: "True if the student is a lateral entry candidate" },
        email: { type: Type.STRING, description: "Student's email address" },
        phone: { type: Type.STRING, description: "Student's phone number" },
        totalFees: { type: Type.NUMBER, description: "Student's total fees for the year" },
        paidFees: { type: Type.NUMBER, description: "The amount of fees the student has paid" },
      },
      required: ["name", "department", "year"],
    },
  };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      return [];
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting student data with Gemini:", error);
    throw new Error("Failed to parse student data from the file. Please ensure the file is clear and contains student details.");
  }
};

export const extractAttendanceFromFile = async (file: File): Promise<ParsedAttendanceRecord[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an intelligent data extraction assistant for an academic portal.
    Your task is to analyze the provided file (which could be text or an image) and extract monthly attendance records for students.
    Each record must contain a student's roll number, the month, the year, the number of days they were present, and the total number of working days for that month.
    - Roll numbers can be complex (e.g., 23KP1A6601). Be sure to extract them fully.
    - The month should be a full month name (e.g., "January", "February").
    - The year should be a four-digit number. If the year is not specified, assume the current year.
    - 'Present' and 'Total' days must be numbers.

    The data might be in a table, a list, or paragraphs. Be robust to different formats. For images, perform OCR to read the text.
    Return the data in a valid JSON array format according to the provided schema. If the file is empty or contains no valid attendance data, return an empty array.
  `;
  
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        rollNumber: { type: Type.STRING, description: "Student's unique roll number" },
        month: { type: Type.STRING, description: "The full name of the month (e.g., 'January')" },
        year: { type: Type.NUMBER, description: "The four-digit year (e.g., 2024)" },
        present: { type: Type.NUMBER, description: "Number of days the student was present" },
        total: { type: Type.NUMBER, description: "Total number of working days in the month" },
      },
      required: ["rollNumber", "month", "year", "present", "total"],
    },
  };
  
  try {
      const parts: any[] = [{ text: prompt }];

      if (file.type.startsWith('image/')) {
        const base64Data = await blobToBase64(file);
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else {
        const textContent = await readFileAsText(file);
        parts.push({ text: `\n\nHere is the text content from the document:\n---\n${textContent}\n---` });
      }

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
          config: {
              responseMimeType: 'application/json',
              responseSchema: schema,
          },
      });

      const jsonText = response.text.trim();
      if (!jsonText) return [];
      
      return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error extracting attendance data with Gemini:", error);
    throw new Error("Failed to parse attendance data from the file. Please ensure the file is clear and contains valid details.");
  }
};