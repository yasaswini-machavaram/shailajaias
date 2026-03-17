'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CourseNode {
    _id: string;
    title: string;
    level: 'course' | 'subject' | 'topic' | 'subtopic';
    isPublished: boolean;
    order: number;
}

export default function CoursesPage() {
    const { token } = useAuth();
    const [courses, setCourses] = useState<CourseNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newCourseTitle, setNewCourseTitle] = useState('');

    useEffect(() => {
        fetchCourses();
    }, [token]);

    const fetchCourses = async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/courses`);
            const data = await response.json();

            if (data.success) {
                setCourses(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createCourse = async () => {
        if (!newCourseTitle.trim()) return;

        try {
            const response = await fetch(`${API_URL}/api/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: newCourseTitle,
                    level: 'course',
                    order: courses.length,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setCourses([...courses, data.data]);
                setNewCourseTitle('');
                setShowModal(false);
            }
        } catch (error) {
            console.error('Failed to create course:', error);
        }
    };

    const deleteCourse = async (id: string) => {
        if (!confirm('Are you sure? This will delete the course and all its children.')) return;

        try {
            const response = await fetch(`${API_URL}/api/courses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setCourses(courses.filter((c) => c._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete course:', error);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
                    <p className="text-gray-600 mt-1">Manage course hierarchy and content</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                    + Create Course
                </button>
            </div>

            {/* Courses List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    <div className="text-5xl mb-4">📚</div>
                    <p>No courses created yet.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-amber-500 hover:underline mt-2 inline-block"
                    >
                        Create your first course
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {courses.map((course) => (
                        <div
                            key={course._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-white text-xl">
                                    📚
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{course.title}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${course.isPublished
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {course.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/admin/courses/${course._id}`}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Manage
                                </Link>
                                <button
                                    onClick={() => deleteCourse(course._id)}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Course</h2>
                        <input
                            type="text"
                            value={newCourseTitle}
                            onChange={(e) => setNewCourseTitle(e.target.value)}
                            placeholder="Course title..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={createCourse}
                                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
