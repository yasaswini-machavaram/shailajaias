'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

interface Student {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    status: 'active' | 'suspended';
    enrolledCourses: string[];
    enrolledTestSeries: string[];
    createdAt: string;
}

interface Course {
    _id: string;
    title: string;
    level: string;
}

interface TestSeries {
    _id: string;
    title: string;
}

export default function AdminUsersPage() {
    const { token } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
    
    // Pagination & Filter state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // Edit modal state
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [selectedTestSeries, setSelectedTestSeries] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Fetch lists
    const fetchStudents = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(page),
                limit: '20',
                search,
                status: statusFilter,
                _t: String(Date.now()),
            });
            const response = await fetch(`${API_URL}/api/admin/users?${queryParams}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await response.json();
            if (data.success) {
                setStudents(data.data);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token, page, search, statusFilter, API_URL]);

    const fetchCoursesAndTestSeries = useCallback(async () => {
        try {
            const [coursesRes, testSeriesRes] = await Promise.all([
                fetch(`${API_URL}/api/courses?_t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }),
                fetch(`${API_URL}/api/tests/series?_t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }),
            ]);

            const coursesData = await coursesRes.json();
            const testSeriesData = await testSeriesRes.json();

            if (coursesData.success) {
                // Only show root level or main course nodes for enrollment mapping
                setCourses(coursesData.data.filter((c: Course) => c.level === 'course'));
            }
            if (testSeriesData.success) {
                setTestSeries(testSeriesData.data);
            }
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        }
    }, [API_URL]);

    useEffect(() => {
        if (token) {
            fetchStudents();
        }
    }, [fetchStudents, token]);

    useEffect(() => {
        fetchCoursesAndTestSeries();
    }, [fetchCoursesAndTestSeries]);

    // Handle student edit click
    const handleEditClick = async (student: Student) => {
        setSaveError('');
        setSaveSuccess('');
        try {
            // Fetch detailed student info (with populated enrollments)
            const response = await fetch(`${API_URL}/api/admin/users/${student._id}?_t=${Date.now()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                },
            });
            const data = await response.json();
            if (data.success) {
                const detailedStudent = data.data;
                setSelectedStudent(detailedStudent);
                setEditName(detailedStudent.name || '');
                setEditEmail(detailedStudent.email || '');
                setEditPhone(detailedStudent.phone || '');
                setEditStatus(detailedStudent.status || 'active');
                
                // Set initial course and test series arrays
                setSelectedCourses(detailedStudent.enrolledCourses?.map((c: any) => typeof c === 'object' ? c._id : c) || []);
                setSelectedTestSeries(detailedStudent.enrolledTestSeries?.map((t: any) => typeof t === 'object' ? t._id : t) || []);
            }
        } catch (error) {
            console.error('Failed to load student details:', error);
        }
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !token) return;

        setIsSaving(true);
        setSaveError('');
        setSaveSuccess('');

        try {
            const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: editName,
                    email: editEmail || '',
                    phone: editPhone || '',
                    status: editStatus,
                    enrolledCourses: selectedCourses,
                    enrolledTestSeries: selectedTestSeries,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setSaveSuccess('Student updated successfully!');
                fetchStudents();
                // Close after a brief delay
                setTimeout(() => setSelectedStudent(null), 1000);
            } else {
                setSaveError(data.message || 'Failed to update student');
            }
        } catch (error) {
            setSaveError('Server connection error. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this student account? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                alert('Student deleted successfully');
                fetchStudents();
            } else {
                alert(data.message || 'Failed to delete student');
            }
        } catch (error) {
            alert('Failed to delete student');
        }
    };

    const toggleCourse = (id: string) => {
        setSelectedCourses(prev => 
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const toggleTestSeries = (id: string) => {
        setSelectedTestSeries(prev => 
            prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
        );
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Profiles</h1>
                    <p className="text-sm text-slate-500">Manage registered students, subscriptions, and security status</p>
                </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone number..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all text-sm"
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all text-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="suspended">Suspended Only</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="text-4xl">👥</span>
                        <p className="text-slate-500 font-medium mt-3">No students found matching your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-6">Name</th>
                                    <th className="py-3 px-6">Phone</th>
                                    <th className="py-3 px-6">Email</th>
                                    <th className="py-3 px-6">Registered Date</th>
                                    <th className="py-3 px-6">Status</th>
                                    <th className="py-3 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {students.map((student) => (
                                    <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3.5 px-6 font-semibold text-slate-900">{student.name}</td>
                                        <td className="py-3.5 px-6 font-mono text-xs">{student.phone || 'N/A'}</td>
                                        <td className="py-3.5 px-6 text-slate-500">{student.email || 'N/A'}</td>
                                        <td className="py-3.5 px-6 text-slate-500">
                                            {new Date(student.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                student.status === 'suspended'
                                                    ? 'bg-red-50 text-red-700'
                                                    : 'bg-green-50 text-green-700'
                                            }`}>
                                                {student.status === 'suspended' ? 'Suspended' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(student)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 text-xs font-semibold transition-colors"
                                            >
                                                Edit / Access
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStudent(student._id)}
                                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-md transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-md transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Drawer Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50 animate-fade-in">
                    <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in overflow-hidden">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Edit Student Profile</h2>
                                <p className="text-xs text-slate-500">Configure credentials, account lock state, and enrolments</p>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Drawer Body Form */}
                        <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {saveError && (
                                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span>{saveError}</span>
                                </div>
                            )}

                            {saveSuccess && (
                                <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-start gap-2">
                                    <span>✓</span>
                                    <span>{saveSuccess}</span>
                                </div>
                            )}

                            {/* Section: Profile Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Credentials</h3>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-amber-500 text-sm font-medium"
                                        required
                                        disabled={isSaving}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                                        <input
                                            type="text"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-amber-500 text-sm font-medium"
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-amber-500 text-sm font-medium"
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Status</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-center gap-2 h-10 border rounded-lg cursor-pointer text-sm font-semibold transition-all ${
                                            editStatus === 'active'
                                                ? 'border-green-500 bg-green-50/50 text-green-700'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={editStatus === 'active'}
                                                onChange={() => setEditStatus('active')}
                                                className="sr-only"
                                            />
                                            🟢 Active
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center gap-2 h-10 border rounded-lg cursor-pointer text-sm font-semibold transition-all ${
                                            editStatus === 'suspended'
                                                ? 'border-red-500 bg-red-50/50 text-red-700'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={editStatus === 'suspended'}
                                                onChange={() => setEditStatus('suspended')}
                                                className="sr-only"
                                            />
                                            🔴 Suspended
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Courses Access */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manual Course Enrollments</h3>
                                {courses.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No root courses available. Create a Course first.</p>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50">
                                        {courses.map((course) => (
                                            <div
                                                key={course._id}
                                                onClick={() => toggleCourse(course._id)}
                                                className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCourses.includes(course._id)}
                                                    readOnly
                                                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-500 pointer-events-none"
                                                />
                                                <span className="text-xs font-semibold text-slate-800">{course.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section: Test Series Access */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manual Test Series Access</h3>
                                {testSeries.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No test series programs available. Create a Test Series first.</p>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50">
                                        {testSeries.map((series) => (
                                            <div
                                                key={series._id}
                                                onClick={() => toggleTestSeries(series._id)}
                                                className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTestSeries.includes(series._id)}
                                                    readOnly
                                                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-500 pointer-events-none"
                                                />
                                                <span className="text-xs font-semibold text-slate-800">{series.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Drawer Footer Buttons */}
                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudent(null)}
                                    className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            <span>Saving Changes...</span>
                                        </>
                                    ) : (
                                        <span>Save Profile</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
