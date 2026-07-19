import * as XLSX from 'xlsx';

export interface SheetRowData {
    rows: (unknown[])[];
    errors: string[];
}

/**
 * Extract Google Spreadsheet ID from a URL.
 */
export function extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

/**
 * Fetch data from a Google Sheet via GViz API without downloading a binary file.
 * Returns row arrays matching the spreadsheet layout.
 */
export async function fetchGoogleSheetData(
    spreadsheetUrl: string,
    query?: string
): Promise<SheetRowData> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
        throw new Error('Invalid Google Sheet URL. Could not find Spreadsheet ID.');
    }

    // Construct GViz API URL
    let gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
    if (query) {
        gvizUrl += `&tq=${encodeURIComponent(query)}`;
    }

    const response = await fetch(gvizUrl);
    if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
            throw new Error(
                'Access denied to Google Sheet. Please ensure the sheet sharing is set to "Anyone with the link can view".'
            );
        }
        throw new Error(`Failed to fetch Google Sheet data (Status ${response.status})`);
    }

    const text = await response.text();

    // Strip GViz JSON wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Invalid response received from Google Sheets API');
    }

    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch {
        throw new Error('Failed to parse Google Sheets response data');
    }

    if (parsed.status === 'error') {
        const errorMsg = parsed.errors?.[0]?.detailed_message || parsed.errors?.[0]?.message || 'Google Sheet Query Error';
        throw new Error(`Google Sheets Query Error: ${errorMsg}`);
    }

    const table = parsed.table;
    if (!table || !table.rows) {
        return { rows: [], errors: [] };
    }

    // Extract headers (first row if available from cols)
    const headers: string[] = (table.cols || []).map((col: any) => col.label || col.id || '');
    
    // Map rows: for each cell, prefer formatted value 'f' if available, otherwise raw value 'v'
    const rows: (unknown[])[] = [headers];

    for (const rowObj of table.rows) {
        if (!rowObj || !rowObj.c) continue;
        const rowValues = rowObj.c.map((cell: any) => {
            if (!cell) return '';
            // If cell has formatted text (e.g. date string or hyperlink display), use 'f' or 'v'
            if (cell.f !== undefined && cell.f !== null) return cell.f;
            if (cell.v !== undefined && cell.v !== null) return cell.v;
            return '';
        });
        rows.push(rowValues);
    }

    return { rows, errors: [] };
}

/**
 * Fallback helper for direct Excel/CSV URLs (non-Google Sheets).
 * Downloads buffer in memory and parses to row array.
 */
export async function fetchDirectExcelData(url: string): Promise<SheetRowData> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download online Excel file (Status ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (unknown[])[];

    return { rows, errors: [] };
}
