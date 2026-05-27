import * as XLSX from 'xlsx';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedMainsQuestion {
    question: string;
    answer: string;
}

export interface ParsedMainsArticle {
    title: string;
    date: Date;
    order: number;
    tags: string[];
    content: string; // Minimal fallback content for the 'content' required field
    source: string | { name: string; url: string };
    context: string;
    questions: ParsedMainsQuestion[];
    practice: string;
    valueAdditions: string;
    visualSummaryUrl: string;
}

export interface ParseMainsExcelResult {
    articles: ParsedMainsArticle[];
    errors: string[];
    skipped: number;
}

// ─── Hyperlink Extraction ───────────────────────────────────────────────────

/**
 * Extract hyperlink { name, url } from a raw XLSX cell object.
 * Cells with HYPERLINK("url","text") formulas have:
 *   - cell.f  = 'HYPERLINK("url","text")'
 *   - cell.v  = display text (fallback)
 * Returns { name, url } if a HYPERLINK formula is found, plain string otherwise.
 */
function extractHyperlink(cell: XLSX.CellObject | undefined): string | { name: string; url: string } {
    if (!cell) return '';
    const formula = cell.f;
    if (formula) {
        // Match HYPERLINK("url","text") or HYPERLINK("url", "text")
        const match = formula.match(/^HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)$/i);
        if (match) {
            return { name: match[2].trim(), url: match[1].trim() };
        }
    }
    // Fallback: return plain string value
    const val = String(cell.v ?? '').trim();
    return val;
}

// ─── Shared Helpers (aligned with article-excel.service.ts) ─────────────────

/**
 * Convert a Google Drive file ID to a direct-view URL.
 * Requires the file to be shared publicly ("Anyone with the link").
 */
function driveIdToUrl(fileId: string): string {
    return `https://lh3.googleusercontent.com/d/${fileId.trim()}`;
}

/**
 * Strip `<image>...</image>` tags and extract the image reference.
 * Returns { cleanHtml, imageRef } where imageRef may be a URL or Drive ID.
 */
function extractImageFromTags(raw: string): { cleanHtml: string; imageRef: string } {
    let imageRef = '';
    const match = raw.match(/<image>([\s\S]*?)<\/image>/i);
    if (match) {
        imageRef = match[1].trim();
    }
    const cleanHtml = raw.replace(/<image>[\s\S]*?<\/image>/gi, '').trim();
    return { cleanHtml, imageRef };
}

/**
 * Convert bare `<li level="N">...</li>` tags into proper nested `<ul>` HTML.
 * Same function as in article-excel.service.ts — kept in sync.
 */
function normalizeListItems(html: string): string {
    const liRegex = /<li\s+level="(\d+)">([\s\S]*?)<\/li>/gi;
    const matches = [...html.matchAll(liRegex)];
    if (matches.length === 0) return html;

    let result = '';
    let lastIndex = 0;
    const groups: { start: number; end: number; items: { level: number; content: string }[] }[] = [];
    let currentGroup: { start: number; end: number; items: { level: number; content: string }[] } | null = null;

    for (const match of matches) {
        const matchStart = match.index!;
        const matchEnd = matchStart + match[0].length;
        const level = parseInt(match[1], 10);
        const content = match[2];
        const gap = currentGroup ? html.substring(currentGroup.end, matchStart).trim() : '';

        if (currentGroup && gap === '') {
            currentGroup.items.push({ level, content });
            currentGroup.end = matchEnd;
        } else {
            if (currentGroup) groups.push(currentGroup);
            currentGroup = { start: matchStart, end: matchEnd, items: [{ level, content }] };
        }
    }
    if (currentGroup) groups.push(currentGroup);

    for (const group of groups) {
        result += html.substring(lastIndex, group.start);
        result += '<ul>';
        let inSubList = false;
        for (const item of group.items) {
            if (item.level >= 1) {
                if (!inSubList) { result += '<ul>'; inSubList = true; }
                result += `<li>${item.content}</li>`;
            } else {
                if (inSubList) { result += '</ul>'; inSubList = false; }
                result += `<li>${item.content}</li>`;
            }
        }
        if (inSubList) result += '</ul>';
        result += '</ul>';
        lastIndex = group.end;
    }
    result += html.substring(lastIndex);
    return result;
}

/**
 * Resolve image URL from a raw cell value.
 * Supports: direct HTTP URL, Google Drive file ID, or <image>...</image> tag content.
 */
function resolveImageUrl(raw: unknown): string {
    const str = String(raw || '').trim();
    if (!str) return '';

    // Check for <image>...</image> tag
    const { imageRef } = extractImageFromTags(str);
    const target = imageRef || str;

    // Direct URL
    if (target.startsWith('http://') || target.startsWith('https://')) {
        return target;
    }

    // Looks like a Drive file ID (alphanumeric, no spaces, reasonable length)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(target)) {
        return driveIdToUrl(target);
    }

    return '';
}

/**
 * Parse Excel date value. XLSX returns dates as:
 * - JS Date objects (when cellDates option is used)
 * - Serial numbers (default)
 * - Date strings
 *
 * IMPORTANT: Always produces UTC midnight dates to avoid timezone drift.
 */
function parseExcelDate(value: unknown): Date | null {
    if (!value) return null;

    // Already a Date
    if (value instanceof Date) {
        return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    }

    // Number → Excel serial date
    if (typeof value === 'number') {
        const excelEpochMs = Date.UTC(1899, 11, 30); // Dec 30, 1899 UTC
        const date = new Date(excelEpochMs + value * 86400000);
        return date;
    }

    // String → try to parse various formats
    if (typeof value === 'string') {
        const trimmed = value.trim();

        // DD Month YYYY format (e.g. "17 April 2026")
        const dMonthY = trimmed.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
        if (dMonthY) {
            const parsed = new Date(`${dMonthY[2]} ${dMonthY[1]}, ${dMonthY[3]}`);
            if (!isNaN(parsed.getTime())) {
                return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
            }
        }

        // DD/MM/YYYY or DD-MM-YYYY
        const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy;
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            if (!isNaN(date.getTime())) return date;
        }

        // YYYY-MM-DD
        const yyyymmdd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
        if (yyyymmdd) {
            const [, y, m, d] = yyyymmdd;
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            if (!isNaN(date.getTime())) return date;
        }

        // Generic parse fallback
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
        }
    }

    return null;
}

/**
 * Validate that a parsed date is reasonable (not in the far past or future).
 */
function isReasonableDate(date: Date): boolean {
    const year = date.getUTCFullYear();
    return year >= 2020 && year <= 2030;
}

/**
 * Parse tags from Subject (Column C) and Tags (Column D).
 * Subject becomes the first tag, then Column D is split by comma.
 */
function buildTags(subject: unknown, tagsCell: unknown): string[] {
    const tags: string[] = [];

    const subjectStr = String(subject || '').trim();
    if (subjectStr) {
        tags.push(subjectStr);
    }

    const tagsStr = String(tagsCell || '').trim();
    if (tagsStr) {
        const splitTags = tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean);
        for (const tag of splitTags) {
            if (!tags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
                tags.push(tag);
            }
        }
    }

    return tags;
}

/**
 * Safely extract string content from a cell value.
 */
function cellToString(value: unknown): string {
    return String(value || '').trim();
}

/**
 * Check if a row is a separator/template row that should be skipped.
 */
function isSeparatorRow(title: unknown): boolean {
    const titleStr = String(title || '').trim();
    if (!titleStr || titleStr.toLowerCase() === 'check') return true;
    if (titleStr.toLowerCase() === 'title') return true; // Duplicate header
    return false;
}

// ─── Main Parser ────────────────────────────────────────────────────────────

/**
 * Parse an Excel file buffer containing Mains articles.
 *
 * Expected columns (0-indexed):
 *   A(0): Date  |  B(1): Title  |  C(2): Subject  |  D(3): Tags
 *   E(4): Source  |  F(5): Practice  |  G(6): Value Additions
 *   H(7): Context  |  I(8): Q1  |  J(9): A1  |  K(10): Q2  |  L(11): A2
 *   M(12): Q3  |  N(13): A3  |  O(14): Q4  |  P(15): A4
 *   Q(16): Q5  |  R(17): A5  |  S(18): Q6  |  T(19): A6
 *   U(20): Image
 */
export const parseMainsExcel = (buffer: Buffer): ParseMainsExcelResult => {
    const articles: ParsedMainsArticle[] = [];
    const errors: string[] = [];
    let skipped = 0;

    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to raw array rows (header as first row)
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (data.length < 2) {
            errors.push('Excel file has no data rows (only header or empty)');
            return { articles, errors, skipped };
        }

        // Skip header row (index 0), process data rows
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) {
                skipped++;
                continue;
            }

            const [
                dateVal,     // 0: Date (A)
                title,       // 1: Title (B)
                subject,     // 2: Subject (C)
                tagsCell,    // 3: Tags (D)
                sourceVal,   // 4: Source (E)
                practiceVal, // 5: Practice (F)
                valueVal,    // 6: Value Additions (G)
                contextVal,  // 7: Context (H)
                q1, a1,      // 8-9: Q1/A1 (I,J)
                q2, a2,      // 10-11: Q2/A2 (K,L)
                q3, a3,      // 12-13: Q3/A3 (M,N)
                q4, a4,      // 14-15: Q4/A4 (O,P)
                q5, a5,      // 16-17: Q5/A5 (Q,R)
                q6, a6,      // 18-19: Q6/A6 (S,T)
                imageVal,    // 20: Image (U)
            ] = row;

            // Skip separator/template rows
            if (isSeparatorRow(title)) {
                skipped++;
                continue;
            }

            // Parse date — strict validation
            const date = parseExcelDate(dateVal);
            if (!date) {
                errors.push(`Row ${i + 1}: Invalid or missing date "${dateVal}" — article "${cellToString(title)}" skipped`);
                continue;
            }

            if (!isReasonableDate(date)) {
                errors.push(`Row ${i + 1}: Date "${date.toISOString().split('T')[0]}" is outside valid range (2020-2030) — article "${cellToString(title)}" skipped`);
                continue;
            }

            // Title is required
            const titleStr = cellToString(title);
            if (!titleStr) {
                errors.push(`Row ${i + 1}: Missing title`);
                continue;
            }

            // Build Q&A pairs (skip empty ones)
            const questions: ParsedMainsQuestion[] = [];
            const qaPairs: [unknown, unknown][] = [
                [q1, a1], [q2, a2], [q3, a3],
                [q4, a4], [q5, a5], [q6, a6],
            ];
            for (const [q, a] of qaPairs) {
                const qStr = cellToString(q);
                const aStr = normalizeListItems(cellToString(a));
                if (qStr && aStr) {
                    questions.push({ question: qStr, answer: aStr });
                }
            }

            // Build tags
            const tags = buildTags(subject, tagsCell);

            // Context, source, practice, value additions — normalize list items
            const context = normalizeListItems(cellToString(contextVal));

            // Source — extract hyperlink { name, url } from raw worksheet cell
            const sourceColLetter = XLSX.utils.encode_col(4); // Column E
            const sourceCell = worksheet[`${sourceColLetter}${i + 1}`] as XLSX.CellObject | undefined;
            const source = extractHyperlink(sourceCell);

            const practice = normalizeListItems(cellToString(practiceVal));
            const valueAdditions = normalizeListItems(cellToString(valueVal));

            // Resolve image
            const visualSummaryUrl = resolveImageUrl(imageVal);

            // Build minimal 'content' field (required by schema)
            // Compose from context + first Q&A as a fallback representation
            const contentParts: string[] = [];
            if (context) contentParts.push(`<blockquote>${context}</blockquote>`);
            if (questions.length > 0) {
                contentParts.push(`<h3>${questions[0].question}</h3>`);
                contentParts.push(questions[0].answer);
            }
            const content = contentParts.length > 0 ? contentParts.join('\n') : `<p>${titleStr}</p>`;

            articles.push({
                title: titleStr,
                date,
                order: i,
                tags,
                content,
                source,
                context,
                questions,
                practice,
                valueAdditions,
                visualSummaryUrl,
            });
        }

        return { articles, errors, skipped };
    } catch (error) {
        return {
            articles: [],
            errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
            skipped: 0,
        };
    }
};

export default { parseMainsExcel };
