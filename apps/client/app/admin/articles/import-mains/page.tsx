'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ImportMainsArticlesPage() {
    const { token } = useAuth();
    const router = useRouter();

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        imported?: number;
        skipped?: number;
        warnings?: string[];
    } | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (!excelFile) {
            setError('Please select an Excel file');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('file', excelFile);

            const response = await fetch(`${API_URL}/api/articles/import-mains-excel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setResult({
                    success: true,
                    message: data.message,
                    imported: data.data?.imported,
                    skipped: data.data?.skipped,
                    warnings: data.warnings,
                });
                setTimeout(() => router.push('/admin/articles'), 3000);
            } else {
                setError(data.message || 'Failed to import mains articles');
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
                <h1 className="text-3xl font-bold text-gray-900">Import Mains Articles from Excel</h1>
                <p className="text-gray-600 mt-1">Upload an Excel file to bulk-import Daily Mains articles with structured Q&A</p>
            </div>

            {/* Excel Format Guide */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-purple-900 mb-2">📋 Mains Excel Format</h3>
                <p className="text-sm text-purple-700 mb-3">Your Excel file should have these columns in Row 1 (header):</p>
                <div className="bg-white rounded-lg p-4 overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                        <thead className="text-left text-gray-500 border-b">
                            <tr>
                                {['A','B','C','D','E','F','G','H','I','J','K','L','M'].map(c => (
                                    <th key={c} className="pb-2 pr-2">{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            <tr>
                                <td className="pt-2 pr-2 whitespace-nowrap">Date</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Title</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Subject</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Tags</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Source</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Practice</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Value</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Context</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Q1</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">A1</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Q2</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">A2</td>
                                <td className="pt-2 pr-2 whitespace-nowrap">Q3…</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 space-y-1">
                    <p className="text-sm text-purple-700">• Columns continue: <strong>N</strong>=A3, <strong>O</strong>=Q4, <strong>P</strong>=A4, <strong>Q</strong>=Q5, <strong>R</strong>=A5, <strong>S</strong>=Q6, <strong>T</strong>=A6</p>
                    <p className="text-sm text-purple-700">• <strong>U</strong> = Image (Google Drive ID, direct URL, or <code>&lt;image&gt;...&lt;/image&gt;</code> tag)</p>
                    <p className="text-sm text-purple-700">• <strong>Subject</strong> → Primary tag (e.g. GS-2: Governance)</p>
                    <p className="text-sm text-purple-700">• <strong>Tags</strong> → Comma-separated additional tags</p>
                    <p className="text-sm text-purple-700">• <strong>Q/A pairs</strong> → Up to 6 question-answer pairs. Empty pairs are skipped.</p>
                    <p className="text-sm text-purple-700">• <strong>Practice, Value, Context</strong> → HTML content is supported</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-line">
                        {error}
                    </div>
                )}

                {result?.success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        <p className="font-semibold">✓ {result.message}</p>
                        <div className="flex gap-6 mt-2 text-sm">
                            <span>📥 Imported: <strong>{result.imported}</strong></span>
                            <span>⏭ Skipped: <strong>{result.skipped}</strong></span>
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
                        <p className="text-sm mt-2">Redirecting to articles list...</p>
                    </div>
                )}

                {/* Excel Upload */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Excel File *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="mains-excel-upload"
                        />
                        <label htmlFor="mains-excel-upload" className="cursor-pointer">
                            {excelFile ? (
                                <div className="text-green-600">
                                    <span className="text-3xl">✓</span>
                                    <p className="mt-2 font-medium">{excelFile.name}</p>
                                    <p className="text-sm text-gray-500">{(excelFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <span className="text-5xl">📊</span>
                                    <p className="mt-3 font-medium">Click to upload Mains Excel file</p>
                                    <p className="text-sm">.xlsx or .xls (max 10MB)</p>
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-sm text-purple-800">
                        <strong>ℹ️ Note:</strong> All imported articles will be created as <strong>Mains</strong> type
                        with structured Q&A fields. Empty rows and rows without a title are automatically skipped.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting || !excelFile}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Importing...' : 'Import Mains Articles'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/articles')}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
