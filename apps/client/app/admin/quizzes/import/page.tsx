'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ImportQuizPage() {
    const { token } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [setName, setSetName] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [customTagInput, setCustomTagInput] = useState('');

    const tagOptions = [
        'polity', 'economy', 'history', 'geography', 'science', 'environment', 
        'current affairs', 'international relations', 'society'
    ];

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter((t) => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const addCustomTag = () => {
        const val = customTagInput.trim().toLowerCase();
        if (val && !tags.includes(val)) {
            setTags([...tags, val]);
        }
        setCustomTagInput('');
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
    const [error, setError] = useState('');



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (!excelFile) {
            setError('Please select an Excel file');
            return;
        }

        // Validate date is valid and within reasonable range
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            setError('Please enter a valid date.');
            return;
        }
        const dateYear = parsedDate.getFullYear();
        if (dateYear < 2020 || dateYear > 2030) {
            setError('Date must be between 2020 and 2030.');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('file', excelFile);
            formData.append('title', title);
            formData.append('date', date);
            if (setName) formData.append('setName', setName);
            if (tags.length > 0) formData.append('tags', tags.join(','));

            const response = await fetch(`${API_URL}/api/quizzes/import-excel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setResult({
                    success: true,
                    message: data.message,
                    count: data.data?.questions?.length,
                });
                setTimeout(() => router.push('/admin/quizzes'), 2000);
            } else {
                setError(data.message || 'Failed to import quiz');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-headline">Import Quiz from Excel</h1>
                <p className="text-gray-600 mt-1">Upload an Excel file with quiz questions</p>
            </div>

            {/* Excel Format Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Excel Format Requirements</h3>
                <p className="text-sm text-blue-700 mb-3">Your Excel file should have these columns in order:</p>
                <div className="bg-white rounded-lg p-3 text-xs font-mono">
                    <table className="w-full">
                        <thead className="text-left text-gray-500">
                            <tr>
                                <th className="pb-2">A</th>
                                <th className="pb-2">B</th>
                                <th className="pb-2">C</th>
                                <th className="pb-2">D</th>
                                <th className="pb-2">E</th>
                                <th className="pb-2">F</th>
                                <th className="pb-2">G</th>
                                <th className="pb-2">H</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            <tr>
                                <td>Question</td>
                                <td>Option A</td>
                                <td>Option B</td>
                                <td>Option C</td>
                                <td>Option D</td>
                                <td>Answer</td>
                                <td>Explanation</td>
                                <td>Subject</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-sm text-blue-700 mt-3">Answer column should contain A, B, C, or D</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {result?.success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        ✓ {result.message}
                        <p className="text-sm mt-1">Redirecting to quizzes list...</p>
                    </div>
                )}

                {/* Title, Date & Set Name */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quiz Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={200}
                            placeholder="e.g., Daily Quiz - Feb 1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/200</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date *
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Set Name
                        </label>
                        <input
                            type="text"
                            value={setName}
                            onChange={(e) => setSetName(e.target.value)}
                            maxLength={100}
                            placeholder="e.g., Set A"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{setName.length}/100</p>
                    </div>
                </div>

                {/* Subject Tags Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Subject Tags</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tagOptions.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    tags.includes(tag)
                                        ? 'bg-amber-500 text-white border-transparent'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                                }`}
                            >
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </button>
                        ))}
                    </div>
                    {/* Custom tag input */}
                    <div className="flex gap-2 max-w-md">
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                            placeholder="Add custom tag…"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            maxLength={30}
                        />
                        <button
                            type="button"
                            onClick={addCustomTag}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            + Add
                        </button>
                    </div>
                    {/* Removable chips */}
                    {tags.filter(t => !tagOptions.includes(t)).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500 self-center">Custom:</span>
                            {tags.filter(t => !tagOptions.includes(t)).map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="text-blue-400 hover:text-blue-600 ml-0.5">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Excel Upload */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Excel File *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Importing...' : 'Import Quiz'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/quizzes')}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
