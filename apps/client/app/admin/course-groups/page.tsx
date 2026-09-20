'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

interface CourseGroupForm {
    _id?: string;
    title: string;
    description: string;
    brochureUrl: string;
    brochureKey: string;
    introVideoUrl: string;
    courseIds: string[];
    price: number;
    mentorTags: string;
    isPublished: boolean;
}

const emptyForm: CourseGroupForm = {
    title: '',
    description: '',
    brochureUrl: '',
    brochureKey: '',
    introVideoUrl: '',
    courseIds: [],
    price: 0,
    mentorTags: '',
    isPublished: false,
};

export default function AdminCourseGroupsPage() {
    const { token } = useAuth();
    const [groups, setGroups] = useState<any[]>([]);
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<CourseGroupForm>({ ...emptyForm });
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (token) {
            fetchCourseGroups();
            fetchCourses();
        }
    }, [token]);

    const fetchCourseGroups = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/course-groups/admin`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setGroups(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch course groups:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${API_URL}/api/courses?level=course`);
            const data = await res.json();
            if (data.success) {
                setAvailableCourses(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch root courses:', err);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!form.title.trim()) {
            setErrorMessage('Title is required');
            return;
        }

        const method = form._id ? 'PUT' : 'POST';
        const endpoint = form._id ? `${API_URL}/api/course-groups/${form._id}` : `${API_URL}/api/course-groups`;

        try {
            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    brochureUrl: form.brochureUrl,
                    brochureKey: form.brochureKey,
                    introVideoUrl: form.introVideoUrl,
                    courseIds: form.courseIds,
                    price: Number(form.price) || 0,
                    mentorTags: form.mentorTags
                        ? form.mentorTags.split(',').map((s) => s.trim()).filter(Boolean)
                        : [],
                    isPublished: form.isPublished,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccessMessage(form._id ? 'Course group updated!' : 'Course group created!');
                fetchCourseGroups();
                setIsEditing(false);
            } else {
                setErrorMessage(data.message || 'Failed to save course group');
            }
        } catch (err) {
            console.error('Save error:', err);
            setErrorMessage('An error occurred while saving');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this course group?')) return;
        try {
            const res = await fetch(`${API_URL}/api/course-groups/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setGroups((prev) => prev.filter((g) => g._id !== id));
            } else {
                alert(data.message || 'Delete failed');
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleEdit = (group: any) => {
        setForm({
            _id: group._id,
            title: group.title,
            description: group.description || '',
            brochureUrl: group.brochureUrl || '',
            brochureKey: group.brochureKey || '',
            introVideoUrl: group.introVideoUrl || '',
            courseIds: (group.courseIds || []).map((c: any) => (typeof c === 'object' ? c._id : c)),
            price: group.price || 0,
            mentorTags: Array.isArray(group.mentorTags) ? group.mentorTags.join(', ') : '',
            isPublished: group.isPublished || false,
        });
        setIsEditing(true);
        setErrorMessage('');
        setSuccessMessage('');
    };

    const toggleCourseSelection = (courseId: string) => {
        setForm((prev) => {
            const exists = prev.courseIds.includes(courseId);
            const updated = exists ? prev.courseIds.filter((id) => id !== courseId) : [...prev.courseIds, courseId];
            return { ...prev, courseIds: updated };
        });
    };

    if (isEditing) {
        return (
            <div className="p-8 min-h-screen bg-slate-50 font-body">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setIsEditing(false)} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
                        ← Back to Course Groups
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline mb-6">{form._id ? 'Edit' : 'Create'} Course Group / Bundle</h1>

                    {errorMessage && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 border border-red-200">{errorMessage}</div>}
                    {successMessage && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4 border border-green-200">{successMessage}</div>}

                    <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Group Title *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                placeholder="e.g. GS Foundation Full Course Bundle 2026"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                rows={3}
                                placeholder="Describe what subjects & modules are included in this bundle..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Standalone Price (₹)</label>
                                <input
                                    type="number"
                                    value={form.price || ''}
                                    onChange={(e) => setForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                    placeholder="e.g. 14999"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Mentorship Module Tags (Comma Separated)</label>
                                <input
                                    type="text"
                                    value={form.mentorTags}
                                    onChange={(e) => setForm((p) => ({ ...p, mentorTags: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                    placeholder="e.g. GS Foundation 2026, Prelims Masterclass"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Included Root Courses ({form.courseIds.length})</label>
                            <div className="border border-slate-200 rounded-xl p-4 max-h-56 overflow-y-auto space-y-2 bg-slate-50">
                                {availableCourses.length === 0 ? (
                                    <p className="text-xs text-slate-400">No root courses found.</p>
                                ) : (
                                    availableCourses.map((c) => {
                                        const checked = form.courseIds.includes(c._id);
                                        return (
                                            <label key={c._id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCourseSelection(c._id)}
                                                    className="w-4 h-4 text-[#1E3A5F] rounded"
                                                />
                                                <span>📘 {c.title}</span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Intro Video URL (YouTube)</label>
                            <input
                                type="url"
                                value={form.introVideoUrl}
                                onChange={(e) => setForm((p) => ({ ...p, introVideoUrl: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={form.isPublished}
                                onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
                                id="publishGrp"
                                className="w-4 h-4 rounded border-slate-300 text-[#1E3A5F]"
                            />
                            <label htmlFor="publishGrp" className="text-sm font-semibold text-slate-700">Publish to students</label>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#152C4A]">
                                {form._id ? 'Update' : 'Create'} Course Group
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Course Groups & Bundles</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage bundled course packages, standalone prices, and mentorship tags.</p>
                </div>
                <button
                    onClick={() => {
                        setForm({ ...emptyForm });
                        setIsEditing(true);
                        setErrorMessage('');
                        setSuccessMessage('');
                    }}
                    className="bg-[#1E3A5F] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#152C4A] transition-colors shadow-sm"
                >
                    + Create Course Group
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]" />
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm mb-4">No Course Groups created yet.</p>
                    <button
                        onClick={() => {
                            setForm({ ...emptyForm });
                            setIsEditing(true);
                        }}
                        className="bg-[#1E3A5F] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#152C4A]"
                    >
                        Create First Bundle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {groups.map((group) => (
                        <div key={group._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${group.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {group.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                    {group.price > 0 && <span className="text-xs font-bold text-[#1E3A5F]">₹{group.price}</span>}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 font-headline">{group.title}</h3>
                                {group.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.description}</p>}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                        {group.courseIds?.length || 0} Included Courses
                                    </span>
                                    {group.mentorTags?.map((tag: string, tIdx: number) => (
                                        <span key={tIdx} className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-1 rounded">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 justify-end">
                                <button onClick={() => handleEdit(group)} className="text-xs font-bold text-[#1E3A5F] hover:underline">
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(group._id)} className="text-xs font-bold text-red-500 hover:underline">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
