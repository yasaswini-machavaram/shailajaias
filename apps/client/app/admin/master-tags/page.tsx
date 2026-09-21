'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

interface MasterTag {
    _id: string;
    title: string;
    code: string;
    description?: string;
    colorHex?: string;
    createdAt?: string;
}

interface LinkedItemsResponse {
    tag: MasterTag;
    linkedItems: {
        courseGroups: any[];
        courseNodes: any[];
        ptsGroups: any[];
        mtsGroups: any[];
        mentorshipCourses: any[];
    };
    totalLinkedCount: number;
}

export default function MasterTagsPage() {
    const { token } = useAuth();
    const [tags, setTags] = useState<MasterTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state for Create / Edit
    const [showModal, setShowModal] = useState(false);
    const [editingTag, setEditingTag] = useState<MasterTag | null>(null);
    const [form, setForm] = useState({ title: '', code: '', description: '', colorHex: '#b8502a' });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Inspector Visualizer State
    const [selectedTagForInspector, setSelectedTagForInspector] = useState<MasterTag | null>(null);
    const [inspectorData, setInspectorData] = useState<LinkedItemsResponse | null>(null);
    const [loadingInspector, setLoadingInspector] = useState(false);

    useEffect(() => {
        if (token) fetchTags();
    }, [token]);

    const fetchTags = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/master-tags`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setTags(data.data || []);
        } catch (e) {
            console.error('Fetch tags error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInspector = async (tag: MasterTag) => {
        setSelectedTagForInspector(tag);
        setLoadingInspector(true);
        try {
            const res = await fetch(`${API_URL}/api/master-tags/${tag._id}/linked-items`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setInspectorData(data.data);
        } catch (e) {
            console.error('Fetch inspector error:', e);
        } finally {
            setLoadingInspector(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!form.title.trim() || !form.code.trim()) {
            setFormError('Title and Tag Code are required');
            return;
        }

        setIsSaving(true);
        try {
            const url = editingTag ? `${API_URL}/api/master-tags/${editingTag._id}` : `${API_URL}/api/master-tags`;
            const method = editingTag ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.success) {
                setShowModal(false);
                setEditingTag(null);
                setForm({ title: '', code: '', description: '', colorHex: '#b8502a' });
                fetchTags();
            } else {
                setFormError(data.message || 'Failed to save master tag');
            }
        } catch {
            setFormError('Network error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this master tag?')) return;
        try {
            const res = await fetch(`${API_URL}/api/master-tags/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                if (selectedTagForInspector?._id === id) {
                    setSelectedTagForInspector(null);
                    setInspectorData(null);
                }
                fetchTags();
            }
        } catch (e) {
            console.error('Delete tag error:', e);
        }
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Master Mentorship Tags</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Centralized repository for all mentorship tags. Derived across Course Groups, PTS, and MTS.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingTag(null);
                        setForm({ title: '', code: '', description: '', colorHex: '#b8502a' });
                        setFormError('');
                        setShowModal(true);
                    }}
                    className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
                >
                    <span>+ Create Master Tag</span>
                </button>
            </div>

            {/* Main Content Layout: Tags Grid + Inspector Drawer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Master Tags Cards List */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600" />
                        </div>
                    ) : tags.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                            <p className="text-slate-500 text-sm mb-4">No master tags found.</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold"
                            >
                                Create First Tag
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tags.map((t) => {
                                const isInspecting = selectedTagForInspector?._id === t._id;
                                return (
                                    <div
                                        key={t._id}
                                        onClick={() => fetchInspector(t)}
                                        className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer shadow-sm flex flex-col justify-between space-y-4 ${
                                            isInspecting
                                                ? 'border-teal-600 ring-2 ring-teal-500/20 shadow-md'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-2xs"
                                                    style={{ backgroundColor: t.colorHex || '#b8502a' }}
                                                >
                                                    #{t.code}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTag(t);
                                                            setForm({
                                                                title: t.title,
                                                                code: t.code,
                                                                description: t.description || '',
                                                                colorHex: t.colorHex || '#b8502a',
                                                            });
                                                            setFormError('');
                                                            setShowModal(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold rounded"
                                                        title="Edit Tag"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(t._id);
                                                        }}
                                                        className="p-1.5 text-red-400 hover:text-red-600 text-xs font-bold rounded"
                                                        title="Delete Tag"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm leading-snug">{t.title}</h3>
                                            {t.description && (
                                                <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                            <span>Click to inspect connections 🔍</span>
                                            <span className="text-teal-600 font-bold">View Linked Items →</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Deep-Link Visualizer Inspector Panel */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 h-fit sticky top-6">
                    <div>
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                            🔍 Tag Link Inspector
                        </span>
                        <h2 className="text-lg font-bold text-slate-800">
                            {selectedTagForInspector ? `#${selectedTagForInspector.code}` : 'Select a Tag to Inspect'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {selectedTagForInspector
                                ? selectedTagForInspector.title
                                : 'Click on any master tag on the left to see everywhere it is linked across Course Groups, PTS, and MTS.'}
                        </p>
                    </div>

                    {loadingInspector ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600" />
                        </div>
                    ) : inspectorData ? (
                        <div className="space-y-6 text-xs divide-y divide-slate-100">
                            {/* Summary Badge */}
                            <div className="pb-2 flex items-center justify-between">
                                <span className="font-bold text-slate-600">Total Linked Items</span>
                                <span className="px-2.5 py-1 bg-teal-100 text-teal-800 font-bold text-xs rounded-full">
                                    {inspectorData.totalLinkedCount} Items
                                </span>
                            </div>

                            {/* Linked Course Groups */}
                            <div className="pt-4 space-y-2">
                                <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>🎓 Course Groups &amp; Courses</span>
                                    <span className="text-slate-400">({inspectorData.linkedItems.courseGroups.length + inspectorData.linkedItems.courseNodes.length})</span>
                                </h4>
                                {inspectorData.linkedItems.courseGroups.length === 0 && inspectorData.linkedItems.courseNodes.length === 0 ? (
                                    <p className="text-slate-400 italic">No Course Groups linked to this tag.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {inspectorData.linkedItems.courseGroups.map((cg) => (
                                            <li key={cg._id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <span className="font-semibold text-slate-800">{cg.title}</span>
                                                <Link href="/admin/courses" className="text-teal-600 hover:underline font-bold">Edit Group</Link>
                                            </li>
                                        ))}
                                        {inspectorData.linkedItems.courseNodes.map((cn) => (
                                            <li key={cn._id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <span className="font-semibold text-slate-800">{cn.title}</span>
                                                <Link href={`/admin/courses/${cn._id}`} className="text-teal-600 hover:underline font-bold">Edit Course</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Linked Prelims Test Series */}
                            <div className="pt-4 space-y-2">
                                <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>📝 Prelims Test Series (PTS)</span>
                                    <span className="text-slate-400">({inspectorData.linkedItems.ptsGroups.length})</span>
                                </h4>
                                {inspectorData.linkedItems.ptsGroups.length === 0 ? (
                                    <p className="text-slate-400 italic">No PTS Groups linked to this tag.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {inspectorData.linkedItems.ptsGroups.map((pts) => (
                                            <li key={pts._id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <span className="font-semibold text-slate-800">{pts.title}</span>
                                                <Link href="/admin/test-series/prelims-test-series" className="text-teal-600 hover:underline font-bold">Edit PTS</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Linked Mains Test Series */}
                            <div className="pt-4 space-y-2">
                                <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>✍️ Mains Test Series (MTS)</span>
                                    <span className="text-slate-400">({inspectorData.linkedItems.mtsGroups.length})</span>
                                </h4>
                                {inspectorData.linkedItems.mtsGroups.length === 0 ? (
                                    <p className="text-slate-400 italic">No MTS Groups linked to this tag.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {inspectorData.linkedItems.mtsGroups.map((mts) => (
                                            <li key={mts._id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <span className="font-semibold text-slate-800">{mts.title}</span>
                                                <Link href="/admin/test-series/mains-test-series" className="text-teal-600 hover:underline font-bold">Edit MTS</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Linked Mentorship Cards */}
                            <div className="pt-4 space-y-2">
                                <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>🌟 Mentorship Cards &amp; Programs</span>
                                    <span className="text-slate-400">({inspectorData.linkedItems.mentorshipCourses?.length || 0})</span>
                                </h4>
                                {!inspectorData.linkedItems.mentorshipCourses || inspectorData.linkedItems.mentorshipCourses.length === 0 ? (
                                    <p className="text-slate-400 italic">No Mentorship Cards linked to this tag.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {inspectorData.linkedItems.mentorshipCourses.map((mc) => (
                                            <li key={mc._id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <span className="font-semibold text-slate-800">{mc.title}</span>
                                                <Link href="/admin/mentorship" className="text-teal-600 hover:underline font-bold">Edit Card</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 italic text-xs">
                            No tag selected. Click a tag card to open inspector.
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-slate-800">
                            {editingTag ? 'Edit Master Tag' : 'Create Master Tag'}
                        </h3>

                        {formError && (
                            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                    Tag Code * (Unique e.g. GS-1, ETHICS, PRELIMS-2027)
                                </label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                                    placeholder="e.g. GS-1"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold uppercase focus:outline-none focus:border-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. GS Paper I — History &amp; Geography"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="Brief details about what syllabus this tag covers..."
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                    Badge Accent Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={form.colorHex}
                                        onChange={(e) => setForm((p) => ({ ...p, colorHex: e.target.value }))}
                                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                                    />
                                    <span className="text-xs font-mono text-slate-600">{form.colorHex}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Master Tag'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
