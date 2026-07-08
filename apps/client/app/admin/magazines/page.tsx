'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

type MagazineCategory = 'prelims_monthly' | 'mains_monthly' | 'mcq_monthly' | 'quarterly';

interface Magazine {
    _id: string;
    title: string;
    pdfUrl: string;
    pdfKey: string;
    category: MagazineCategory;
    year: number;
    month: string;
    isPublished: boolean;
    createdAt: string;
}

const CATEGORIES: { value: MagazineCategory; label: string }[] = [
    { value: 'prelims_monthly', label: 'Prelims Monthly' },
    { value: 'mains_monthly', label: 'Mains Monthly' },
    { value: 'mcq_monthly', label: 'MCQ Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const QUARTERS = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function AdminMagazinesPage() {
    const { token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // List state
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MagazineCategory>('prelims_monthly');
    const [filterYear, setFilterYear] = useState<number | ''>('');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formCategory, setFormCategory] = useState<MagazineCategory>('prelims_monthly');
    const [formYear, setFormYear] = useState(currentYear);
    const [formMonth, setFormMonth] = useState(MONTHS[0]);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editId, setEditId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (token) fetchMagazines();
    }, [token, activeTab, filterYear]);

    const fetchMagazines = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // Only append year param when a specific year is selected
            const yearParam = filterYear !== '' ? `&year=${filterYear}` : '';
            const response = await fetch(
                `${API_URL}/api/magazines/admin?category=${activeTab}${yearParam}&limit=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setMagazines(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch magazines:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormTitle('');
        setFormCategory(activeTab);
        setFormYear(typeof filterYear === 'number' ? filterYear : currentYear);
        setFormMonth(activeTab === 'quarterly' ? QUARTERS[0] : MONTHS[0]);
        setPdfFile(null);
        setError('');
        setEditId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const openForm = (magazine?: Magazine) => {
        if (magazine) {
            setEditId(magazine._id);
            setFormTitle(magazine.title);
            setFormCategory(magazine.category);
            setFormYear(magazine.year);
            setFormMonth(magazine.month);
        } else {
            resetForm();
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formTitle.trim()) {
            setError('Title is required');
            return;
        }

        if (!editId && !pdfFile) {
            setError('Please upload a PDF file');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('title', formTitle);
            formData.append('category', formCategory);
            formData.append('year', formYear.toString());
            formData.append('month', formMonth);

            if (pdfFile) {
                formData.append('pdf', pdfFile);
            }

            const response = await fetch(`${API_URL}/api/magazines${editId ? `/${editId}` : ''}`, {
                method: editId ? 'PUT' : 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();
            if (!data.success) {
                setError(data.message || `Failed to ${editId ? 'update' : 'create'} magazine`);
                setIsSubmitting(false);
                return;
            }

            setShowForm(false);
            resetForm();
            fetchMagazines();
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`${API_URL}/api/magazines/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setMagazines(magazines.filter((m) => m._id !== deleteTarget.id));
            }
        } catch (error) {
            console.error('Failed to delete magazine:', error);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const monthOptions = formCategory === 'quarterly' ? QUARTERS : MONTHS;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Magazines</h1>
                    <p className="text-gray-600 mt-1">Manage PDF magazine uploads by category and year</p>
                </div>
                <button
                    onClick={() => openForm()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    + Upload Magazine
                </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.value}
                        onClick={() => setActiveTab(cat.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === cat.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-medium text-gray-600">Year:</span>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterYear('')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterYear === ''
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All Years
                    </button>
                    {YEARS.map((year) => (
                        <button
                            key={year}
                            onClick={() => setFilterYear(year)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterYear === year
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {/* Magazine List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : magazines.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    <p className="text-4xl mb-3">📚</p>
                    <p>No magazines found for {CATEGORIES.find(c => c.value === activeTab)?.label} - {filterYear}</p>
                    <button
                        onClick={() => openForm()}
                        className="text-blue-600 hover:underline mt-2 inline-block"
                    >
                        Upload your first magazine
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ width: '40%' }}>Title</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ width: '20%' }}>Month/Quarter</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ width: '15%' }}>Status</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ width: '25%' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {magazines.map((mag) => (
                                <tr key={mag._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4" style={{ maxWidth: '300px' }}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">📄</span>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{mag.title}</p>
                                                <a
                                                    href={getFullUrl(mag.pdfUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-500 hover:underline"
                                                >
                                                    View PDF ↗
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{mag.month}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${mag.isPublished
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {mag.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openForm(mag)}
                                                className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget({ id: mag._id, title: mag.title })}
                                                className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Upload/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editId ? 'Edit Magazine' : 'Upload Magazine'}
                            </h2>
                            <button
                                onClick={() => { setShowForm(false); resetForm(); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="e.g., October 2025 Monthly Current Affairs Magazine"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                    maxLength={200}
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{formTitle.length}/200</p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                <select
                                    value={formCategory}
                                    onChange={(e) => {
                                        const cat = e.target.value as MagazineCategory;
                                        setFormCategory(cat);
                                        setFormMonth(cat === 'quarterly' ? QUARTERS[0] : MONTHS[0]);
                                    }}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Year & Month/Quarter */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                                    <input
                                        type="number"
                                        value={formYear}
                                        onChange={(e) => setFormYear(Number(e.target.value))}
                                        placeholder="e.g., 2026"
                                        min={2000}
                                        max={2100}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {formCategory === 'quarterly' ? 'Quarter *' : 'Month *'}
                                    </label>
                                    <select
                                        value={formMonth}
                                        onChange={(e) => setFormMonth(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {monthOptions.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* PDF Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    PDF Document {editId ? '(optional - leave empty to keep current)' : '*'}
                                </label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    {pdfFile ? (
                                        <div className="text-blue-600">
                                            <span className="text-3xl">📄</span>
                                            <p className="mt-2 font-medium">{pdfFile.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">
                                            <span className="text-3xl">📎</span>
                                            <p className="mt-2 font-medium">Click to select PDF</p>
                                            <p className="text-xs">PDF format only</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting
                                        ? (editId ? 'Updating...' : 'Uploading...')
                                        : (editId ? 'Update Magazine' : 'Upload Magazine')
                                    }
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => !isDeleting && setDeleteTarget(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Magazine</h3>
                        <p className="text-gray-600 text-sm mb-1">Are you sure you want to delete:</p>
                        <p className="text-gray-900 font-medium text-sm mb-4 break-words whitespace-pre-wrap">&quot;{deleteTarget.title}&quot;</p>
                        <p className="text-red-600 text-xs mb-5">This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
