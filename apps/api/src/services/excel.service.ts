import * as XLSX from 'xlsx';
import type { IQuestion } from '../models/Quiz.js';

export interface ParsedQuizData {
    questions: IQuestion[];
    errors: string[];
}

/**
 * Parse Excel file for quiz import
 * Expected columns: Question, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D), Explanation
 */
export const parseQuizExcel = (buffer: Buffer): ParsedQuizData => {
    const questions: IQuestion[] = [];
    const errors: string[] = [];

    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header mapping
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        // Skip header row
        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            if (!row || row.length < 7) {
                if (row && row.some(cell => cell)) {
                    errors.push(`Row ${i + 1}: Incomplete data`);
                }
                continue;
            }

            const [question, optionA, optionB, optionC, optionD, correctAnswer, explanation] = row;

            if (!question?.trim()) {
                continue; // Skip empty rows
            }

            // Map correct answer letter to index
            const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const correctIndex = answerMap[correctAnswer?.toString().toUpperCase().trim()];

            if (correctIndex === undefined) {
                errors.push(`Row ${i + 1}: Invalid correct answer "${correctAnswer}". Must be A, B, C, or D`);
                continue;
            }

            questions.push({
                question: question.toString().trim(),
                options: [
                    optionA?.toString().trim() || '',
                    optionB?.toString().trim() || '',
                    optionC?.toString().trim() || '',
                    optionD?.toString().trim() || '',
                ],
                correctIndex,
                explanation: explanation?.toString().trim() || '',
            });
        }

        return { questions, errors };
    } catch (error) {
        return {
            questions: [],
            errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        };
    }
};

export default { parseQuizExcel };
