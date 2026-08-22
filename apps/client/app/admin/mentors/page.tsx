'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

interface Mentor {
    _id: string;
    name: string;
    email: string;
    status: 'active' | 'suspended';
    assignedMtsGroups?: any[];
    assignedStudents?: any[];
    createdAt: string;
}

export default function AdminMentorsPage() {
    const { token } = useAuth();
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search and filter
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
    const [createError, setCreateError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<{ _id: string; name: string; email: string; password: string; status: string }>({ _id: '', name: '', email: '', password: '', status: 'active' });
    const [editError, setEditError] = useState('');

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

    // Assign Batch modal
    const [showAssignModal, setShowAssignModal] = useState<Mentor | null>(null);
    const [mtsList, setMtsList] = useState<any[]>([]);
    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

    // Assign Students modal
    const [showAssignStudentsModal, setShowAssignStudentsModal] = useState<Mentor | null>(null);
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    useEffect(() => { if (token) { fetchMentors(); fetchMtsList(); fetchStudents(); } }, [token]);

    const fetchMentors = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/mentors`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setMentors(data.data);
        } catch (e) { console.error('Fetch mentors error:', e); }
        finally { setIsLoading(false); }
    };

    const fetchMtsList = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mts/series?includeUnpublished=true`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setMtsList(data.data);
        } catch (e) { console.error('Fetch MTS error:', e); }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users?limit=300`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setStudentsList(data.data || []);
        } catch (e) { console.error('Fetch students error:', e); }
    };

    const handleCreate = async () => {
        setCreateError('');
        if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
            setCreateError('All fields are required'); return;
        }
        if (createForm.password.length < 6) { setCreateError('Password must be at least 6 characters'); return; }

        setIsCreating(true);
        try {
            const res = await fetch(`${API_URL}/api/mentors`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(createForm),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateModal(false); setCreateForm({ name: '', email: '', password: '' });
                fetchMentors();
            } else { setCreateError(data.message || 'Failed to create mentor'); }
        } catch { setCreateError('Network error'); }
        finally { setIsCreating(false); }
    };

    const handleUpdate = async () => {
        setEditError('');
        try {
            const res = await fetch(`${API_URL}/api/mentors/${editForm._id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: editForm.name, email: editForm.email, status: editForm.status,
                    ...(editForm.password ? { password: editForm.password } : {}),
                }),
            });
            const data = await res.json();
            if (data.success) { setShowEditModal(false); fetchMentors(); }
            else { setEditError(data.message || 'Update failed'); }
        } catch { setEditError('Network error'); }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mentors/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) { setShowDeleteModal(null); fetchMentors(); }
        } catch { console.error('Delete error'); }
    };

    const handleAssignBatch = async () => {
        if (!showAssignModal) return;
        try {
            const res = await fetch(`${API_URL}/api/mentors/${showAssignModal._id}/assign-batch`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mtsGroupIds: selectedBatches }),
            });
            const data = await res.json();
            if (data.success) { setShowAssignModal(null); fetchMentors(); }
        } catch { console.error('Assign error'); }
    };

    const handleAssignStudents = async () => {
        if (!showAssignStudentsModal) return;
        try {
            const res = await fetch(`${API_URL}/api/mentors/${showAssignStudentsModal._id}/assign-students`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ studentIds: selectedStudents }),
            });
            const data = await res.json();
            if (data.success) { setShowAssignStudentsModal(null); fetchMentors(); }
        } catch { console.error('Assign students error'); }
    };

    const filteredStudents = studentsList.filter(s =>
        !studentSearchTerm ||
        s.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        s.phone?.includes(studentSearchTerm) ||
        s.email?.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );

    const filteredMentors = mentors.filter(m => {
        const matchesSearch = !searchTerm ||
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            {/* Header & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Mentor Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage mentor accounts, assigned test series batches, and student allocations.</p>
                </div>
                <button
                    onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateForm({ name: '', email: '', password: '' }); }}
                    className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
                >
                    <span>+ Create Mentor</span>
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <input
                        type="text"
                        placeholder="Search mentor by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-slate-500 font-semibold">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="suspended">Suspended Only</option>
                    </select>
                </div>
            </div>

            {/* Excel-style Mentors Table View */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600" />
                </div>
            ) : filteredMentors.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm mb-4">No mentors found.</p>
                    <button onClick={() => setShowCreateModal(true)} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold">
                        Create First Mentor
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-6">Mentor Name & Email</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-6">Assigned Batches</th>
                                    <th className="py-3.5 px-6">Assigned Students</th>
                                    <th className="py-3.5 px-6 text-center">Actions (CTA)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {filteredMentors.map((m, idx) => (
                                    <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Sl No */}
                                        <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">
                                            {idx + 1}
                                        </td>

                                        {/* Mentor Info */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                                    {m.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{m.name}</h3>
                                                    <p className="text-xs text-slate-500">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                m.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${m.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {m.status === 'active' ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>

                                        {/* Assigned Batches */}
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 px-3 py-1 rounded-lg text-xs font-bold border border-teal-100">
                                                <span>📚</span> {m.assignedMtsGroups?.length || 0} Batches
                                            </span>
                                        </td>

                                        {/* Assigned Students */}
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                                                <span>🎓</span> {m.assignedStudents?.length || 0} Students
                                            </span>
                                        </td>

                                        {/* Actions Column (4 CTA Buttons) */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                                {/* Edit CTA */}
                                                <button
                                                    onClick={() => {
                                                        setEditForm({ _id: m._id, name: m.name, email: m.email, password: '', status: m.status });
                                                        setShowEditModal(true);
                                                        setEditError('');
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all shadow-2xs border border-slate-200"
                                                    title="Edit mentor details"
                                                >
                                                    ✏️ Edit
                                                </button>

                                                {/* Assign Batch CTA */}
                                                <button
                                                    onClick={() => {
                                                        setShowAssignModal(m);
                                                        setSelectedBatches(m.assignedMtsGroups?.map((g: any) => g._id || g) || []);
                                                    }}
                                                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg transition-all shadow-2xs border border-teal-200"
                                                    title="Assign Mains Test Series Batches"
                                                >
                                                    📚 Assign Batch
                                                </button>

                                                {/* Assign Student CTA */}
                                                <button
                                                    onClick={() => {
                                                        setShowAssignStudentsModal(m);
                                                        setSelectedStudents(m.assignedStudents?.map((s: any) => s._id || s) || []);
                                                        setStudentSearchTerm('');
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-all shadow-2xs border border-indigo-200"
                                                    title="Assign specific students to mentor"
                                                >
                                                    🎓 Assign Student
                                                </button>

                                                {/* Delete CTA */}
                                                <button
                                                    onClick={() => setShowDeleteModal(m._id)}
                                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-all shadow-2xs border border-red-200"
                                                    title="Delete mentor account"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Create Mentor Account</h3>
                        {createError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-3 border border-red-200">{createError}</div>}
                        <div className="space-y-3">
                            <input type="text" placeholder="Full Name" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500" />
                            <input type="email" placeholder="Email Address" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500" />
                            <input type="text" placeholder="Password (min 6 chars)" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500" />
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={handleCreate} disabled={isCreating} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Mentor</h3>
                        {editError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-3 border border-red-200">{editError}</div>}
                        <div className="space-y-3">
                            <input type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500" />
                            <input type="email" placeholder="Email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500" />
                            <input type="text" placeholder="New Password (leave blank to keep)" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500" />
                            <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500">
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={handleUpdate} className="flex-1 py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#152C4A]">Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Batch Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Assign MTS Batches</h3>
                        <p className="text-xs text-slate-500 mb-4">Select MTS groups to assign to <strong>{showAssignModal.name}</strong></p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {mtsList.map(mts => (
                                <label key={mts._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={selectedBatches.includes(mts._id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedBatches(p => [...p, mts._id]);
                                            else setSelectedBatches(p => p.filter(id => id !== mts._id));
                                        }} className="w-4 h-4 rounded text-teal-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">{mts.title}</p>
                                        {mts.uniqueId && <span className="text-[10px] text-amber-600 font-bold">{mts.uniqueId}</span>}
                                    </div>
                                </label>
                            ))}
                            {mtsList.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No MTS groups available</p>}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowAssignModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={handleAssignBatch} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700">Save Assignments</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Students Modal */}
            {showAssignStudentsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignStudentsModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Assign Students</h3>
                        <p className="text-xs text-slate-500 mb-3">
                            Assign specific students to <strong>{showAssignStudentsModal.name}</strong>. Student assignments take priority over batch assignments.
                        </p>

                        <input
                            type="text"
                            placeholder="Search by name, phone, email..."
                            value={studentSearchTerm}
                            onChange={e => setStudentSearchTerm(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-indigo-500"
                        />

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {filteredStudents.map(student => (
                                <label key={student._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.includes(student._id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedStudents(p => [...p, student._id]);
                                            else setSelectedStudents(p => p.filter(id => id !== student._id));
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                                        <p className="text-[10px] text-slate-500">{student.phone || student.email || 'No contact'}</p>
                                    </div>
                                </label>
                            ))}
                            {filteredStudents.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No students found</p>}
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowAssignStudentsModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={handleAssignStudents} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">Save Student Assignments</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Mentor?</h3>
                        <p className="text-sm text-slate-500 mb-4">This will permanently delete this mentor account.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => handleDelete(showDeleteModal)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
