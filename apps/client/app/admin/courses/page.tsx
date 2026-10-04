'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

interface MasterTag {
    _id: string;
    code: string;
    title: string;
    colorHex?: string;
}

interface CourseNode {
    _id: string;
    title: string;
    level: 'course' | 'subject' | 'topic' | 'subtopic';
    isPublished: boolean;
    order: number;
}

interface CourseGroupForm {
    _id?: string;
    title: string;
    description: string;
    brochureUrl: string;
    brochureKey: string;
    introVideoUrl: string;
    courseIds: string[];
    price: number;
    mentorTags: string[];
    ptsGroupCode?: string;
    mtsGroupCode?: string;
    isPublished: boolean;
}

const emptyGroupForm: CourseGroupForm = {
    title: '',
    description: '',
    brochureUrl: '',
    brochureKey: '',
    introVideoUrl: '',
    courseIds: [],
    price: 0,
    mentorTags: [],
    ptsGroupCode: '',
    mtsGroupCode: '',
    isPublished: false,
};

export default function UnifiedCoursesAdminPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'groups' | 'courses'>('groups');

    // Master Tags list for selector
    const [masterTagsList, setMasterTagsList] = useState<MasterTag[]>([]);

    // Courses state
    const [courses, setCourses] = useState<CourseNode[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    const [newCourseTitle, setNewCourseTitle] = useState('');

    // Course Groups state
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupForm, setGroupForm] = useState<CourseGroupForm>({ ...emptyGroupForm });
    const [groupError, setGroupError] = useState('');
    const [groupSuccess, setGroupSuccess] = useState('');

    useEffect(() => {
        if (token) {
            fetchMasterTags();
            fetchCourses();
            fetchCourseGroups();
        }
    }, [token]);

    const fetchMasterTags = async () => {
        try {
            const res = await fetch(`${API_URL}/api/master-tags`);
            const data = await res.json();
            if (data.success) setMasterTagsList(data.data || []);
        } catch (err) {
            console.error('Fetch master tags error:', err);
        }
    };

    const fetchCourses = async () => {
        setIsLoadingCourses(true);
        try {
            const res = await fetch(`${API_URL}/api/courses`);
            const data = await res.json();
            if (data.success) setCourses(data.data || []);
        } catch (err) {
            console.error('Fetch courses error:', err);
        } finally {
            setIsLoadingCourses(false);
        }
    };

    const fetchCourseGroups = async () => {
        setIsLoadingGroups(true);
        try {
            const res = await fetch(`${API_URL}/api/course-groups/admin`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setGroups(data.data || []);
        } catch (err) {
            console.error('Fetch course groups error:', err);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    // Course creation / deletion
    const createCourse = async () => {
        if (!newCourseTitle.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: newCourseTitle.trim(),
                    level: 'course',
                    order: courses.length,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setCourses([...courses, data.data]);
                setNewCourseTitle('');
                setShowCreateCourseModal(false);
            }
        } catch (err) {
            console.error('Create course error:', err);
        }
    };

    const deleteCourse = async (id: string) => {
        if (!confirm('Are you sure? This will delete the course and all its subjects & chapters.')) return;
        try {
            const res = await fetch(`${API_URL}/api/courses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setCourses(courses.filter((c) => c._id !== id));
        } catch (err) {
            console.error('Delete course error:', err);
        }
    };

    // Group creation / editing
    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setGroupError('');
        setGroupSuccess('');

        if (!groupForm.title.trim()) {
            setGroupError('Group title is required');
            return;
        }

        const method = groupForm._id ? 'PUT' : 'POST';
        const endpoint = groupForm._id ? `${API_URL}/api/course-groups/${groupForm._id}` : `${API_URL}/api/course-groups`;

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...groupForm,
                    price: Number(groupForm.price) || 0,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setGroupSuccess(groupForm._id ? 'Course group updated!' : 'Course group created!');
                fetchCourseGroups();
                setIsEditingGroup(false);
            } else {
                setGroupError(data.message || 'Failed to save course group');
            }
        } catch (err) {
            console.error('Save group error:', err);
            setGroupError('Network error');
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Are you sure you want to delete this course group bundle?')) return;
        try {
            const res = await fetch(`${API_URL}/api/course-groups/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setGroups((prev) => prev.filter((g) => g._id !== id));
        } catch (err) {
            console.error('Delete group error:', err);
        }
    };

    const toggleMasterTagSelection = (tagCode: string) => {
        setGroupForm((prev) => {
            const exists = prev.mentorTags.includes(tagCode);
            const updated = exists ? prev.mentorTags.filter((t) => t !== tagCode) : [...prev.mentorTags, tagCode];
            return { ...prev, mentorTags: updated };
        });
    };

    const toggleCourseSelection = (courseId: string) => {
        setGroupForm((prev) => {
            const exists = prev.courseIds.includes(courseId);
            const updated = exists ? prev.courseIds.filter((id) => id !== courseId) : [...prev.courseIds, courseId];
            return { ...prev, courseIds: updated };
        });
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            {/* Header & Sub-Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Courses &amp; Course Bundles</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Unified management for Course Groups (bundles with master mentorship tags) and individual Courses.
                    </p>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
                    <button
                        onClick={() => { setActiveTab('groups'); setIsEditingGroup(false); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'groups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        📦 Course Groups &amp; Bundles ({groups.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('courses'); setIsEditingGroup(false); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'courses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        🎓 Root Courses ({courses.length})
                    </button>
                    <Link
                        href="/admin/task-cards"
                        className="ml-2 px-3 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        <span>🗂️</span> Task Card Sequencer ↗
                    </Link>
                </div>
            </div>

            {/* TAB 1: COURSE GROUPS & BUNDLES */}
            {activeTab === 'groups' && (
                <div>
                    {isEditingGroup ? (
                        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {groupForm._id ? 'Edit Course Group Bundle' : 'Create New Course Group Bundle'}
                                </h2>
                                <button
                                    onClick={() => setIsEditingGroup(false)}
                                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                                >
                                    ✕ Cancel
                                </button>
                            </div>

                            {groupError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">{groupError}</div>}
                            {groupSuccess && <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl border border-green-200">{groupSuccess}</div>}

                            <form onSubmit={handleSaveGroup} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Group Title *</label>
                                    <input
                                        type="text"
                                        value={groupForm.title}
                                        onChange={(e) => setGroupForm((p) => ({ ...p, title: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                                        placeholder="e.g. GS Foundation Full Course Bundle 2027"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        value={groupForm.description}
                                        onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                                        placeholder="Describe what subjects &amp; modules are included in this bundle..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Standalone Price (₹)</label>
                                        <input
                                            type="number"
                                            value={groupForm.price || ''}
                                            onChange={(e) => setGroupForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                                            placeholder="e.g. 14999"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Intro Video URL (YouTube)</label>
                                        <input
                                            type="url"
                                            value={groupForm.introVideoUrl}
                                            onChange={(e) => setGroupForm((p) => ({ ...p, introVideoUrl: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                                            placeholder="https://youtube.com/watch?v=..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">PTS Group Code (Prelims Test Series)</label>
                                        <input
                                            type="text"
                                            value={groupForm.ptsGroupCode || ''}
                                            onChange={(e) => setGroupForm((p) => ({ ...p, ptsGroupCode: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                                            placeholder="e.g. PTS-2026-01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">MTS Group Code (Mains Test Series)</label>
                                        <input
                                            type="text"
                                            value={groupForm.mtsGroupCode || ''}
                                            onChange={(e) => setGroupForm((p) => ({ ...p, mtsGroupCode: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                                            placeholder="e.g. MTS-2026-01"
                                        />
                                    </div>
                                </div>

                                {/* Centralized Master Tags Selector at GROUP level */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            🏷️ Assign Centralized Master Mentorship Tags (Group Level)
                                        </label>
                                        <Link href="/admin/master-tags" className="text-xs text-teal-600 font-bold hover:underline">
                                            + Manage Master Tags Repository
                                        </Link>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                        {masterTagsList.length === 0 ? (
                                            <p className="text-xs text-slate-400">No master tags found in repository.</p>
                                        ) : (
                                            masterTagsList.map((tag) => {
                                                const selected = groupForm.mentorTags.includes(tag.code);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={tag._id}
                                                        onClick={() => toggleMasterTagSelection(tag.code)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                                            selected
                                                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {selected ? '✓ ' : '+ '}#{tag.code} ({tag.title})
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Included Root Courses Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                        Included Root Courses ({groupForm.courseIds.length} Selected)
                                    </label>
                                    <div className="border border-slate-200 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
                                        {courses.length === 0 ? (
                                            <p className="text-xs text-slate-400">No root courses found.</p>
                                        ) : (
                                            courses.map((c) => {
                                                const checked = groupForm.courseIds.includes(c._id);
                                                return (
                                                    <label key={c._id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleCourseSelection(c._id)}
                                                            className="w-4 h-4 text-teal-600 rounded"
                                                        />
                                                        <span>📘 {c.title}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={groupForm.isPublished}
                                        onChange={(e) => setGroupForm((p) => ({ ...p, isPublished: e.target.checked }))}
                                        id="pubGroup"
                                        className="w-4 h-4 rounded border-slate-300 text-teal-600"
                                    />
                                    <label htmlFor="pubGroup" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                        Publish Course Group to Students
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingGroup(false)}
                                        className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
                                    >
                                        {groupForm._id ? 'Update' : 'Create'} Course Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">Course Groups &amp; Bundles</h3>
                                <button
                                    onClick={() => {
                                        setGroupForm({ ...emptyGroupForm });
                                        setIsEditingGroup(true);
                                        setGroupError('');
                                        setGroupSuccess('');
                                    }}
                                    className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm"
                                >
                                    + Create Course Group
                                </button>
                            </div>

                            {isLoadingGroups ? (
                                <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600" />
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                                    <p className="text-slate-500 text-sm mb-4">No Course Groups created yet.</p>
                                    <button
                                        onClick={() => {
                                            setGroupForm({ ...emptyGroupForm });
                                            setIsEditingGroup(true);
                                        }}
                                        className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700"
                                    >
                                        Create First Bundle
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {groups.map((g) => (
                                        <div key={g._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${g.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                        {g.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                    {g.price > 0 && <span className="text-xs font-bold text-teal-700">₹{g.price}</span>}
                                                </div>
                                                <h3 className="text-base font-bold text-slate-800">{g.title}</h3>
                                                {g.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description}</p>}

                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                                                        📘 {g.courseIds?.length || 0} Root Courses
                                                    </span>
                                                    {g.mentorTags?.map((tag: string, tIdx: number) => (
                                                        <span key={tIdx} className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-md">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100 justify-end text-xs font-bold">
                                                <button
                                                    onClick={() => {
                                                        setGroupForm({
                                                            _id: g._id,
                                                            title: g.title,
                                                            description: g.description || '',
                                                            brochureUrl: g.brochureUrl || '',
                                                            brochureKey: g.brochureKey || '',
                                                            introVideoUrl: g.introVideoUrl || '',
                                                            courseIds: (g.courseIds || []).map((c: any) => (typeof c === 'object' ? c._id : c)),
                                                            price: g.price || 0,
                                                            mentorTags: Array.isArray(g.mentorTags) ? g.mentorTags : [],
                                                            ptsGroupCode: g.ptsGroupCode || '',
                                                            mtsGroupCode: g.mtsGroupCode || '',
                                                            isPublished: g.isPublished || false,
                                                        });
                                                        setIsEditingGroup(true);
                                                    }}
                                                    className="text-teal-600 hover:underline"
                                                >
                                                    ✏️ Edit Group
                                                </button>
                                                <button onClick={() => handleDeleteGroup(g._id)} className="text-red-500 hover:underline">
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ROOT COURSES HIERARCHY */}
            {activeTab === 'courses' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Root Courses &amp; Lecture Hierarchy</h3>
                        <button
                            onClick={() => setShowCreateCourseModal(true)}
                            className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm"
                        >
                            + Create Root Course
                        </button>
                    </div>

                    {isLoadingCourses ? (
                        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600" />
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                            <p className="text-slate-500 text-sm mb-4">No root courses created yet.</p>
                            <button
                                onClick={() => setShowCreateCourseModal(true)}
                                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold"
                            >
                                Create First Course
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {courses.map((course) => (
                                <div
                                    key={course._id}
                                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl font-bold">
                                            📘
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">{course.title}</h3>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    course.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {course.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/admin/task-cards?courseId=${course._id}`}
                                            className="px-3 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 border border-amber-200"
                                        >
                                            <span>🗂️</span> Sequence Cards
                                        </Link>
                                        <Link
                                            href={`/admin/courses/${course._id}`}
                                            className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold rounded-xl transition-colors"
                                        >
                                            Manage Hierarchy &amp; Lectures ↗
                                        </Link>
                                        <button
                                            onClick={() => deleteCourse(course._id)}
                                            className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Root Course Modal */}
            {showCreateCourseModal && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowCreateCourseModal(false)}
                >
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800">Create Root Course</h3>
                        <input
                            type="text"
                            value={newCourseTitle}
                            onChange={(e) => setNewCourseTitle(e.target.value)}
                            placeholder="e.g. Modern Indian History"
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateCourseModal(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createCourse}
                                className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
                            >
                                Create Course
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
