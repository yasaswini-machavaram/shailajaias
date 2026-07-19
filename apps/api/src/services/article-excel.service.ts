import * as XLSX from 'xlsx';

export interface ParsedArticle {
    title: string;
    date: Date;
    order: number;
    tags: string[];
    content: string; // Constructed HTML
    source: string | { name: string; url: string };
    imageUrl: string;
}

export interface ParseArticleExcelResult {
    articles: ParsedArticle[];
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

function parseSourceValue(val: unknown): string | { name: string; url: string } {
    if (!val) return '';
    if (typeof val === 'object' && val !== null && 'url' in val) {
        return val as { name: string; url: string };
    }
    const str = String(val).trim();
    if (str.startsWith('http://') || str.startsWith('https://')) {
        return { name: 'Source', url: str };
    }
    return str;
}

/**
 * Convert a Google Drive file ID to a direct-view URL.
 * Requires the file to be shared publicly ("Anyone with the link").
 */
function driveIdToUrl(fileId: string): string {
    return `https://lh3.googleusercontent.com/d/${fileId.trim()}`;
}

/**
 * Strip `<image>...</image>` tags from HTML content.
 * These are template markers in the Excel, not real image tags.
 */
function stripImageTags(html: string): string {
    return html.replace(/<image>[\s\S]*?<\/image>/gi, '').trim();
}

/**
 * Check if a row is a separator/template row that should be skipped.
 */
function isSeparatorRow(title: unknown, content: unknown): boolean {
    const titleStr = String(title || '').trim();
    const contentStr = String(content || '').trim();

    // Skip if title is empty or "Check"
    if (!titleStr || titleStr.toLowerCase() === 'check') return true;

    // Skip if content is empty
    if (!contentStr) return true;

    // Skip separator template rows
    if (contentStr.includes('Use ; for separators')) return true;
    if (contentStr.match(/^<p>\s*<table>\s*<\/p>/i) && contentStr.includes('for separators')) return true;

    return false;
}

/**
 * Convert bare `<li level="N">...</li>` tags into proper nested `<ul>` HTML.
 *
 * The Excel content column uses `<li level="0">` for top-level bullets and
 * `<li level="1">` for sub-bullets, but they're NOT wrapped in `<ul>`.
 * This function wraps consecutive `<li>` sequences in `<ul>` and nests
 * level="1" items as sub-lists under the previous level="0" item.
 *
 * Also strips the `level` attribute from the output since it's non-standard.
 *
 * NOTE: HTML `<table>` content is passed through untouched.
 */
function normalizeListItems(html: string): string {
    // Split the HTML by <li level="..."> tags while preserving them
    // Pattern: match <li level="N"> ... </li> blocks
    const liRegex = /<li\s+level="(\d+)">([\s\S]*?)<\/li>/gi;
    const matches = [...html.matchAll(liRegex)];

    if (matches.length === 0) {
        // No <li level="..."> tags — return as-is (handles <table> and other HTML)
        return html;
    }

    // Get text before, between, and after the <li> blocks
    let result = '';
    let lastIndex = 0;

    // Group consecutive <li> items into list blocks
    const groups: { start: number; end: number; items: { level: number; content: string }[] }[] = [];
    let currentGroup: { start: number; end: number; items: { level: number; content: string }[] } | null = null;

    for (const match of matches) {
        const matchStart = match.index!;
        const matchEnd = matchStart + match[0].length;
        const level = parseInt(match[1], 10);
        const content = match[2];

        // Check if this <li> is close to the previous one (only whitespace between)
        const gap = currentGroup ? html.substring(currentGroup.end, matchStart).trim() : '';

        if (currentGroup && gap === '') {
            // Continue the current group
            currentGroup.items.push({ level, content });
            currentGroup.end = matchEnd;
        } else {
            // Start a new group
            if (currentGroup) groups.push(currentGroup);
            currentGroup = { start: matchStart, end: matchEnd, items: [{ level, content }] };
        }
    }
    if (currentGroup) groups.push(currentGroup);

    // Build output
    for (const group of groups) {
        // Add text before this group
        result += html.substring(lastIndex, group.start);

        // Build proper nested <ul> from the items
        result += '<ul>';
        let inSubList = false;

        for (const item of group.items) {
            if (item.level >= 1) {
                // Sub-bullet
                if (!inSubList) {
                    result += '<ul>';
                    inSubList = true;
                }
                result += `<li>${item.content}</li>`;
            } else {
                // Top-level bullet
                if (inSubList) {
                    result += '</ul>';
                    inSubList = false;
                }
                result += `<li>${item.content}</li>`;
            }
        }

        if (inSubList) result += '</ul>';
        result += '</ul>';

        lastIndex = group.end;
    }

    // Add any remaining text after the last group
    result += html.substring(lastIndex);

    return result;
}

/**
 * Build the article content HTML from the three content sources.
 * Structure: blockquote (In News) + body (Content) + subheading (Additional Info)
 */
function buildContentHtml(inNews: unknown, rawContent: unknown, additionalInfo: unknown): string {
    const parts: string[] = [];

    // 1. "In News" → Context blockquote
    const inNewsStr = String(inNews || '').trim();
    if (inNewsStr) {
        parts.push(`<blockquote>${inNewsStr}</blockquote>`);
    }

    // 2. Main content body — strip <image> tags, normalize <li level="N"> → nested <ul>
    const contentStr = String(rawContent || '').trim();
    if (contentStr) {
        let cleanContent = stripImageTags(contentStr);
        cleanContent = normalizeListItems(cleanContent);
        if (cleanContent) {
            parts.push(cleanContent);
        }
    }

    // 3. "Additional Info" → subheading section
    const additionalStr = String(additionalInfo || '').trim();
    if (additionalStr) {
        // Also normalize lists in additional info
        const normalizedInfo = normalizeListItems(additionalStr);
        parts.push(`<h3>Additional Information</h3>\n${normalizedInfo}`);
    }

    return parts.join('\n');
}

/**
 * Parse tags from Subject (Column C) and Tags (Column J).
 * Subject becomes the first tag, then Column J is split by comma.
 */
function buildTags(subject: unknown, tagsCell: unknown): string[] {
    const tags: string[] = [];

    // Subject as primary tag
    const subjectStr = String(subject || '').trim();
    if (subjectStr) {
        tags.push(subjectStr);
    }

    // Column J tags — split by comma
    const tagsStr = String(tagsCell || '').trim();
    if (tagsStr) {
        const splitTags = tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean);
        for (const tag of splitTags) {
            // Avoid duplicates (case-insensitive)
            if (!tags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
                tags.push(tag);
            }
        }
    }

    return tags;
}

/**
 * Resolve the image URL from Column H (External URL) and Column I (Drive Image ID).
 * Column H takes priority; Column I is converted from Drive file ID to URL.
 */
function resolveImageUrl(externalUrl: unknown, imageId: unknown): string {
    const urlStr = String(externalUrl || '').trim();
    if (urlStr && (urlStr.startsWith('http://') || urlStr.startsWith('https://'))) {
        return urlStr;
    }

    const idStr = String(imageId || '').trim();
    if (idStr) {
        return driveIdToUrl(idStr);
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
        // Normalize to UTC midnight
        return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    }

    // Number → Excel serial date
    if (typeof value === 'number') {
        // Excel date serial: days since 1900-01-01 (with Feb 29 1900 bug)
        // Use UTC epoch to avoid timezone drift
        const excelEpochMs = Date.UTC(1899, 11, 30); // Dec 30, 1899 UTC
        const date = new Date(excelEpochMs + value * 86400000);
        return date;
    }

    // String → try to parse as YYYY-MM-DD (common format)
    if (typeof value === 'string') {
        const trimmed = value.trim();

        // Check for DD/MM/YYYY or DD-MM-YYYY format
        const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy;
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            if (!isNaN(date.getTime())) return date;
        }

        // Check for YYYY-MM-DD format
        const yyyymmdd = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
        if (yyyymmdd) {
            const [, y, m, d] = yyyymmdd;
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            if (!isNaN(date.getTime())) return date;
        }

        // Generic parse as fallback, normalized to UTC midnight
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
 * Parse an Excel file buffer containing Daily Prelims articles.
 *
 * Expected columns (0-indexed):
 *   0: S.No  |  1: Date  |  2: Subject  |  3: Title  |  4: In News
 *   5: Content  |  6: Source Link  |  7: External Image URL  |  8: Image ID
 *   9: Tags  |  10: Additional Info
 *
 * Columns after 10 (PYQ Score, PYQ Reference, MCQ Type, etc.) are ignored.
 */
export const parseArticleExcelRows = (
    data: unknown[][],
    options?: { targetDate?: string }
): ParseArticleExcelResult => {
    const articles: ParsedArticle[] = [];
    const errors: string[] = [];
    let skipped = 0;

    try {
        if (!data || data.length < 2) {
            errors.push('Excel file has no data rows (only header or empty)');
            return { articles, errors, skipped };
        }

    const targetDateFormatted = options?.targetDate ? options.targetDate.trim() : null;

    // Skip header row (index 0), process data rows
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) {
            skipped++;
            continue;
        }

        const [
            sNo,       // 0: S.No
            dateVal,   // 1: Date
            subject,   // 2: Subject
            title,     // 3: Title
            inNews,    // 4: In News
            content,   // 5: Content
            sourceLink,// 6: Source Link
            extImgUrl, // 7: External Image URL
            imageId,   // 8: Image ID
            tagsCell,  // 9: Tags
            addlInfo,  // 10: Additional Info
        ] = row;

        // Skip separator/template rows
        if (isSeparatorRow(title, content)) {
            skipped++;
            continue;
        }

        // Parse date — strict validation
        const date = parseExcelDate(dateVal);
        if (!date) {
            errors.push(`Row ${i + 1}: Invalid or missing date "${dateVal}" — article "${String(title || '').trim()}" skipped`);
            continue;
        }

        // Validate date is reasonable
        if (!isReasonableDate(date)) {
            errors.push(`Row ${i + 1}: Date "${date.toISOString().split('T')[0]}" is outside valid range (2020-2030) — article "${String(title || '').trim()}" skipped`);
            continue;
        }

        // Filter by targetDate if specified (Column B / index 1)
        if (targetDateFormatted) {
            const rowDateStr = date.toISOString().split('T')[0];
            if (rowDateStr !== targetDateFormatted) {
                skipped++;
                continue;
            }
        }

            // Title is required
            const titleStr = String(title || '').trim();
            if (!titleStr) {
                errors.push(`Row ${i + 1}: Missing title`);
                continue;
            }

            // Build content HTML
            const contentHtml = buildContentHtml(inNews, content, addlInfo);
            if (!contentHtml) {
                errors.push(`Row ${i + 1}: No content generated for "${titleStr}"`);
                continue;
            }

            // Resolve image
            const imageUrl = resolveImageUrl(extImgUrl, imageId);

            // Build tags
            const tags = buildTags(subject, tagsCell);

            // Parse order
            const order = typeof sNo === 'number' ? sNo : parseInt(String(sNo || '0'), 10) || 0;

            // Source — parse link string or object
            const source = parseSourceValue(sourceLink);

            articles.push({
                title: titleStr,
                date,
                order,
                tags,
                content: contentHtml,
                source,
                imageUrl,
            });
        }

        return { articles, errors, skipped };
    } catch (error) {
        return {
            articles: [],
            errors: [`Failed to parse Excel data: ${error instanceof Error ? error.message : 'Unknown error'}`],
            skipped: 0,
        };
    }
};

export const parseArticleExcel = (
    buffer: Buffer,
    options?: { targetDate?: string }
): ParseArticleExcelResult => {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        return parseArticleExcelRows(data, options);
    } catch (error) {
        return {
            articles: [],
            errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
            skipped: 0,
        };
    }
};

export default { parseArticleExcel, parseArticleExcelRows };
