'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MentorshipCourse {
    _id: string;
    title: string;
    tagline: string;
    price: string;
    audience: 'Beginner' | 'Veteran' | 'Both';
    stages: ('Prelims' | 'Mains' | 'Both')[];
    levels: ('Beginner' | 'Veteran')[];
    coverage: string;
    deliverables: string[];
    availability: string;
    bundleNote?: string;
    description: string;
    order: number;
    isPublished: boolean;
}

export default function AdminMentorshipPage() {
    const { token } = useAuth();
    const [courses, setCourses] = useState<MentorshipCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state for Create / Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<MentorshipCourse | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        tagline: '',
        price: '',
        audience: 'Both' as 'Beginner' | 'Veteran' | 'Both',
        stages: ['Mains'] as ('Prelims' | 'Mains' | 'Both')[],
        levels: ['Beginner'] as ('Beginner' | 'Veteran')[],
        coverage: '',
        deliverablesInput: '',
        availability: 'Start Now',
        bundleNote: '',
        description: '',
        order: 0,
        isPublished: true,
    });

    useEffect(() => {
        fetchCourses();
    }, [token]);

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/api/mentorship-courses/admin`, { headers });
            const data = await response.json();

            if (data.success) {
                setCourses(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch mentorship courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingCourse(null);
        setFormData({
            title: '',
            tagline: '',
            price: '',
            audience: 'Both',
            stages: ['Mains'],
            levels: ['Beginner'],
            coverage: '',
            deliverablesInput: '',
            availability: 'Start Now',
            bundleNote: '',
            description: '',
            order: courses.length + 1,
            isPublished: true,
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (course: MentorshipCourse) => {
        setEditingCourse(course);
        setFormData({
            title: course.title,
            tagline: course.tagline,
            price: course.price,
            audience: course.audience,
            stages: course.stages,
            levels: course.levels,
            coverage: course.coverage,
            deliverablesInput: course.deliverables ? course.deliverables.join(', ') : '',
            availability: course.availability,
            bundleNote: course.bundleNote || '',
            description: course.description,
            order: course.order || 0,
            isPublished: course.isPublished,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const deliverables = formData.deliverablesInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const payload = {
            title: formData.title,
            tagline: formData.tagline,
            price: formData.price,
            audience: formData.audience,
            stages: formData.stages,
            levels: formData.levels,
            coverage: formData.coverage,
            deliverables,
            availability: formData.availability,
            bundleNote: formData.bundleNote,
            description: formData.description,
            order: Number(formData.order),
            isPublished: formData.isPublished,
        };

        try {
            const url = editingCourse
                ? `${API_URL}/api/mentorship-courses/${editingCourse._id}`
                : `${API_URL}/api/mentorship-courses`;

            const method = editingCourse ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                setIsModalOpen(false);
                fetchCourses();
            } else {
                alert(data.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving mentorship course:', error);
            alert('Failed to save mentorship course card');
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            const response = await fetch(`${API_URL}/api/mentorship-courses/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                fetchCourses();
            } else {
                alert(data.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting mentorship course:', error);
            alert('Failed to delete course');
        }
    };

    const handleTogglePublish = async (course: MentorshipCourse) => {
        try {
            const response = await fetch(`${API_URL}/api/mentorship-courses/${course._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isPublished: !course.isPublished }),
            });

            const data = await response.json();

            if (data.success) {
                fetchCourses();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md">
                <div>
                    <h1 className="text-2xl font-bold font-serif">Mentorship Cards Management</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Add, update, or remove course cards displayed on the Mentorship landing page.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow transition-all hover:scale-[1.02]"
                >
                    + Add Mentorship Card
                </button>
            </div>

            {/* Courses Table / Cards List */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-500 font-medium">Loading mentorship cards...</div>
            ) : courses.length === 0 ? (
                <div className="bg-white p-12 text-center border border-dashed border-slate-300 rounded-2xl space-y-3">
                    <p className="text-slate-600 font-medium">No mentorship cards found.</p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl"
                    >
                        Create First Card
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.map(course => (
                        <div
                            key={course._id}
                            className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between space-y-4 ${
                                course.isPublished ? 'border-slate-200' : 'border-amber-300 bg-amber-50/20'
                            }`}
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                        {course.audience}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTogglePublish(course)}
                                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                course.isPublished
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-100 text-gray-500 border-gray-300'
                                            }`}
                                        >
                                            {course.isPublished ? '● Published' : '○ Draft'}
                                        </button>
                                        <span className="text-xs font-mono text-slate-400">Order: {course.order}</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{course.title}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{course.tagline}</p>
                                </div>

                                <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div><strong className="text-slate-700">Fee:</strong> {course.price}</div>
                                    <div><strong className="text-slate-700">Coverage:</strong> {course.coverage}</div>
                                    <div><strong className="text-slate-700">Availability:</strong> {course.availability}</div>
                                    {course.bundleNote && (
                                        <div className="text-emerald-700 font-medium"><strong className="text-slate-700">Bundle Note:</strong> {course.bundleNote}</div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {course.deliverables.map((d, i) => (
                                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => handleOpenEditModal(course)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Edit Card
                                </button>
                                <button
                                    onClick={() => handleDelete(course._id, course.title)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
                        {/* Modal Header */}
                        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold font-serif">
                                {editingCourse ? 'Edit Mentorship Card' : 'Add Mentorship Card'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Course Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. GS Foundation Mentorship"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Tagline *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. For freshers"
                                        value={formData.tagline}
                                        onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Price Fee *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. ₹9,999"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Audience Tag *</label>
                                    <select
                                        value={formData.audience}
                                        onChange={e => setFormData({ ...formData, audience: e.target.value as any })}
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Veteran">Veteran</option>
                                        <option value="Both">Both</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Availability *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Start Now / Opens December"
                                        value={formData.availability}
                                        onChange={e => setFormData({ ...formData, availability: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Coverage Syllabus *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. GS1-4 & Essay / Prelims — full syllabus revision"
                                    value={formData.coverage}
                                    onChange={e => setFormData({ ...formData, coverage: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Deliverable Tags (Comma-separated) *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 35 Tests, Daily Practice, Weekly review"
                                    value={formData.deliverablesInput}
                                    onChange={e => setFormData({ ...formData, deliverablesInput: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Bundle Note / Savings Tag (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Bundles Advanced Revision Mains + Prelims Crash Course · saves ₹99"
                                    value={formData.bundleNote}
                                    onChange={e => setFormData({ ...formData, bundleNote: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Detailed Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Complete guidance for aspirants..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Display Order</label>
                                    <input
                                        type="number"
                                        value={formData.order}
                                        onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-4">
                                    <input
                                        type="checkbox"
                                        id="isPublished"
                                        checked={formData.isPublished}
                                        onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                                    />
                                    <label htmlFor="isPublished" className="text-xs font-bold text-slate-700">
                                        Publish Immediately
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow"
                                >
                                    {editingCourse ? 'Save Changes' : 'Create Card'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
