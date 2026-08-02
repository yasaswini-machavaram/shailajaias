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
            const res = await fetch(`${API_URL}/api/admin/users?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
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

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Mentor Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Create and manage mentor accounts for Mains Test Series evaluation.</p>
                </div>
                <button onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateForm({ name: '', email: '', password: '' }); }}
                    className="bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
                    + Create Mentor
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600" />
                </div>
            ) : mentors.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm mb-4">No mentors created yet. Create a mentor to start assigning evaluations.</p>
                    <button onClick={() => setShowCreateModal(true)} className="bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-bold">Create First Mentor</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mentors.map(m => (
                        <div key={m._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{m.name}</h3>
                                            <p className="text-xs text-slate-500">{m.email}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {m.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold">
                                        {m.assignedMtsGroups?.length || 0} batches assigned
                                    </span>
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                        {m.assignedStudents?.length || 0} students assigned
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs pt-3 border-t border-slate-100">
                                <button onClick={() => { setEditForm({ _id: m._id, name: m.name, email: m.email, password: '', status: m.status }); setShowEditModal(true); setEditError(''); }}
                                    className="font-bold text-[#1E3A5F] hover:underline">Edit</button>
                                <button onClick={() => {
                                    setShowAssignModal(m);
                                    setSelectedBatches(m.assignedMtsGroups?.map((g: any) => g._id || g) || []);
                                }} className="font-bold text-teal-600 hover:underline">Assign Batches</button>
                                <button onClick={() => {
                                    setShowAssignStudentsModal(m);
                                    setSelectedStudents(m.assignedStudents?.map((s: any) => s._id || s) || []);
                                    setStudentSearchTerm('');
                                }} className="font-bold text-blue-600 hover:underline">Assign Students</button>
                                <button onClick={() => setShowDeleteModal(m._id)} className="font-bold text-red-500 hover:underline ml-auto">Delete</button>
                            </div>
                        </div>
                    ))}
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
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm" />
                            <input type="email" placeholder="Email Address" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm" />
                            <input type="text" placeholder="Password (min 6 chars)" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm" />
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
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
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm" />
                            <input type="email" placeholder="Email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm" />
                            <input type="text" placeholder="New Password (leave blank to keep)" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm" />
                            <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm">
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={handleUpdate} className="flex-1 py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold">Update</button>
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
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {mtsList.map(mts => (
                                <label key={mts._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={selectedBatches.includes(mts._id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedBatches(p => [...p, mts._id]);
                                            else setSelectedBatches(p => p.filter(id => id !== mts._id));
                                        }} className="w-4 h-4 rounded" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">{mts.title}</p>
                                        {mts.uniqueId && <span className="text-[10px] text-amber-600 font-bold">{mts.uniqueId}</span>}
                                    </div>
                                </label>
                            ))}
                            {mtsList.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No MTS groups available</p>}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowAssignModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={handleAssignBatch} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold">Save Assignments</button>
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
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm mb-3"
                        />

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredStudents.map(student => (
                                <label key={student._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.includes(student._id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedStudents(p => [...p, student._id]);
                                            else setSelectedStudents(p => p.filter(id => id !== student._id));
                                        }}
                                        className="w-4 h-4 rounded"
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
                            <button onClick={() => setShowAssignStudentsModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={handleAssignStudents} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold">Save Student Assignments</button>
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
                            <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={() => handleDelete(showDeleteModal)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
