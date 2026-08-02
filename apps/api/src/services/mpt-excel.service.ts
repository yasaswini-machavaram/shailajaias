import * as XLSX from 'xlsx';
import type { IMainsQuestionItem } from '../models/MainsPracticeTest.js';

export interface ParsedMptExcelData {
    questions: IMainsQuestionItem[];
    errors: string[];
}

/**
 * Parse Excel file for Mains Practice Test questions bulk import
 *
 * Expected columns:
 * Col A (0): Question Text (Required)
 * Col B (1): Marks (Optional, e.g. 10, 15)
 * Col C (2): Word Limit (Optional, e.g. 150, 250)
 * Col D (3): Difficulty Level (Optional: 'Easy', 'Moderate', 'Difficult' — default 'Moderate')
 * Col E (4): Model Answer (Required)
 * Col F (5): Approach / Structuring Guidelines (Optional)
 * Col G (6): Tags (Optional, comma-separated)
 */
export const parseMptExcel = (buffer: Buffer): ParsedMptExcelData => {
    const questions: IMainsQuestionItem[] = [];
    const errors: string[] = [];

    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (!data || data.length < 2) {
            return { questions: [], errors: ['Excel file is empty or missing data rows'] };
        }

        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            // Skip empty rows
            if (!row || !row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
                continue;
            }

            const questionText = row[0] ? String(row[0]).trim() : '';
            const marksStr = row[1] ? String(row[1]).trim() : '';
            const wordLimitStr = row[2] ? String(row[2]).trim() : '';
            const difficultyStr = row[3] ? String(row[3]).trim() : '';
            const modelAnswer = row[4] ? String(row[4]).trim() : '';
            const approach = row[5] ? String(row[5]).trim() : '';
            const tagsStr = row[6] ? String(row[6]).trim() : '';

            if (!questionText) {
                errors.push(`Row ${i + 1}: Question text is missing`);
                continue;
            }

            if (!modelAnswer) {
                errors.push(`Row ${i + 1}: Model answer is missing`);
                continue;
            }

            // Parse marks
            let marks: number | undefined = undefined;
            if (marksStr) {
                const parsed = parseInt(marksStr, 10);
                if (!isNaN(parsed) && parsed > 0) marks = parsed;
            }

            // Parse word limit
            let wordLimit: number | undefined = undefined;
            if (wordLimitStr) {
                const parsed = parseInt(wordLimitStr, 10);
                if (!isNaN(parsed) && parsed > 0) wordLimit = parsed;
            }

            // Parse difficulty
            let difficultyLevel: 'Easy' | 'Moderate' | 'Difficult' = 'Moderate';
            const diffLower = difficultyStr.toLowerCase();
            if (diffLower.includes('easy')) difficultyLevel = 'Easy';
            else if (diffLower.includes('hard') || diffLower.includes('difficult')) difficultyLevel = 'Difficult';
            else if (diffLower.includes('mod')) difficultyLevel = 'Moderate';

            // Parse tags
            const topicTags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

            questions.push({
                questionText,
                marks,
                wordLimit,
                difficultyLevel,
                modelAnswer,
                approach: approach || undefined,
                topicTags,
            });
        }
    } catch (error) {
        console.error('Error parsing MPT Excel:', error);
        errors.push('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
    }

    return { questions, errors };
};
