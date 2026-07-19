'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ImportMode = 'file' | 'url';

export default function ImportArticlesPage() {
    const { token } = useAuth();
    const router = useRouter();

    const [importMode, setImportMode] = useState<ImportMode>('url');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelUrl, setExcelUrl] = useState('');
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        imported?: number;
        updated?: number;
        skipped?: number;
        warnings?: string[];
    } | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (importMode === 'file' && !excelFile) {
            setError('Please select an Excel file');
            return;
        }

        if (importMode === 'url' && !excelUrl.trim()) {
            setError('Please enter an online Google Sheet or Excel URL');
            return;
        }

        setIsSubmitting(true);

        try {
            let response: Response;

            if (importMode === 'url') {
                response = await fetch(`${API_URL}/api/articles/import-excel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        excelUrl: excelUrl.trim(),
                        targetDate,
                    }),
                });
            } else {
                const formData = new FormData();
                formData.append('file', excelFile as File);
                if (targetDate) formData.append('targetDate', targetDate);

                response = await fetch(`${API_URL}/api/articles/import-excel`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
            }

            const data = await response.json();

            if (data.success) {
                setResult({
                    success: true,
                    message: data.message,
                    imported: data.data?.imported,
                    updated: data.data?.updated,
                    skipped: data.data?.skipped,
                    warnings: data.warnings,
                });
                setTimeout(() => router.push('/admin/articles'), 3000);
            } else {
                setError(data.message || 'Failed to import articles');
                if (data.errors?.length) {
                    setError(prev => prev + '\n\nDetails:\n' + data.errors.join('\n'));
                }
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-headline">Import Prelims Articles</h1>
                <p className="text-gray-600 mt-1">Bulk-import or update Daily Prelims articles from Online Google Sheets or local Excel files</p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    type="button"
                    onClick={() => { setImportMode('url'); setError(''); }}
                    className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        importMode === 'url'
                            ? 'border-amber-500 text-amber-600 bg-amber-50/50 rounded-t-lg'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <span>🌐</span> Online Google Sheet (Filtered by Date)
                </button>
                <button
                    type="button"
                    onClick={() => { setImportMode('file'); setError(''); }}
                    className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        importMode === 'file'
                            ? 'border-amber-500 text-amber-600 bg-amber-50/50 rounded-t-lg'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <span>📁</span> Upload Excel File
                </button>
            </div>

            {/* Excel Format Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Excel Format Requirements</h3>
                <p className="text-sm text-blue-700 mb-3">Your Excel sheet should have these columns in Row 1 (header):</p>
                <div className="bg-white rounded-lg p-4 overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                        <thead className="text-left text-gray-500 border-b">
                            <tr>
                                <th className="pb-2 pr-3">A</th>
                                <th className="pb-2 pr-3">B (Date Filter)</th>
                                <th className="pb-2 pr-3">C</th>
                                <th className="pb-2 pr-3">D</th>
                                <th className="pb-2 pr-3">E</th>
                                <th className="pb-2 pr-3">F</th>
                                <th className="pb-2 pr-3">G</th>
                                <th className="pb-2 pr-3">H</th>
                                <th className="pb-2 pr-3">I</th>
                                <th className="pb-2 pr-3">J</th>
                                <th className="pb-2">K</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 font-semibold">
                            <tr>
                                <td className="pt-2 pr-3 whitespace-nowrap">S.No</td>
                                <td className="pt-2 pr-3 whitespace-nowrap text-amber-700 bg-amber-50 px-1 rounded">Date</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Subject</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Title</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">In News</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Content</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Source</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Ext. Image URL</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Image ID</td>
                                <td className="pt-2 pr-3 whitespace-nowrap">Tags</td>
                                <td className="pt-2 whitespace-nowrap">Additional Info</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 space-y-1 text-xs text-blue-700">
                    <p>• <strong>Date Filter</strong> → Column B is used to filter matching rows for the selected target date.</p>
                    <p>• <strong>Smart Update</strong> → Matching articles (same title & date) will be updated; non-existing ones created.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-line text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                {result?.success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        <p className="font-semibold">✓ {result.message}</p>
                        <div className="flex gap-6 mt-2 text-sm">
                            <span>📥 New: <strong>{result.imported || 0}</strong></span>
                            <span>🔄 Updated: <strong>{result.updated || 0}</strong></span>
                            <span>⏭ Skipped: <strong>{result.skipped || 0}</strong></span>
                        </div>
                        {result.warnings && result.warnings.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                                <p className="text-sm font-medium text-amber-700">⚠ Warnings:</p>
                                <ul className="text-sm text-amber-600 mt-1 list-disc list-inside">
                                    {result.warnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <p className="text-xs text-green-600 mt-2">Redirecting to articles list...</p>
                    </div>
                )}

                {/* Target Date Picker */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Target Date for Import *
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Only rows matching this date in <strong>Column B</strong> will be fetched and processed.
                    </p>
                    <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        required
                        className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-medium"
                    />
                </div>

                {/* Online URL Input Mode */}
                {importMode === 'url' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
                        <label className="block text-sm font-semibold text-gray-700">
                            Google Sheet or Online Excel URL *
                        </label>
                        <input
                            type="url"
                            value={excelUrl}
                            onChange={(e) => setExcelUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-medium text-sm"
                        />
                        <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                            💡 <strong>Tip:</strong> Ensure Google Sheet access is set to <em>"Anyone with the link can view"</em>. The system will run a query against Column B for target date <strong>{targetDate}</strong> without downloading the entire binary sheet.
                        </p>
                    </div>
                )}

                {/* File Upload Mode */}
                {importMode === 'file' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Excel File (.xlsx / .xls) *
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-400 transition-colors">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="excel-upload"
                            />
                            <label htmlFor="excel-upload" className="cursor-pointer">
                                {excelFile ? (
                                    <div className="text-green-600">
                                        <span className="text-3xl">✓</span>
                                        <p className="mt-2 font-medium">{excelFile.name}</p>
                                        <p className="text-sm text-gray-500">{(excelFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="text-gray-500">
                                        <span className="text-5xl">📊</span>
                                        <p className="mt-3 font-medium">Click to upload Excel file</p>
                                        <p className="text-sm">.xlsx or .xls</p>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting || (importMode === 'file' && !excelFile) || (importMode === 'url' && !excelUrl.trim())}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting
                            ? 'Processing & Syncing...'
                            : importMode === 'url'
                            ? `Fetch & Sync Prelims Articles for ${targetDate}`
                            : `Import Prelims Articles for ${targetDate}`}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/articles')}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
