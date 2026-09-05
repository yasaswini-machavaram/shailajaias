'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CourseNode {
    _id: string;
    title: string;
    description?: string;
    level: string;
    isPublished: boolean;
    isLocked: boolean;
    order: number;
}

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<CourseNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${API_URL}/api/courses`);
            const data = await res.json();
            if (data.success) {
                // Filter only published root courses for students
                const published = (data.data || []).filter((c: CourseNode) => c.isPublished);
                setCourses(published);
            }
        } catch (err) {
            console.error('Failed to fetch student courses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Banner */}
                <div className="bg-[#1E3A5F] text-white rounded-3xl p-8 mb-10 shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <span className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold rounded-full mb-3 uppercase tracking-widest">
                            UPSC CSE Comprehensive Video Courses
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">
                            Video Lecture Series &amp; Study Modules
                        </h1>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Structured subject lectures, class notes, Prelims practice tests, and Mains answer writing modules tailored for UPSC Civil Services Preparation.
                        </p>
                    </div>
                </div>

                {/* Course Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
                        <div className="text-6xl mb-4">🎓</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No Video Courses Available Yet</h3>
                        <p className="text-sm text-gray-600">
                            Check back soon as new video lecture modules are published by our faculty.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div
                                key={course._id}
                                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group"
                            >
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-[#1E3A5F] text-amber-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition-transform">
                                        📖
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 font-serif group-hover:text-[#1E3A5F] transition-colors">
                                        {course.title}
                                    </h3>
                                    <p className="text-gray-600 text-xs line-clamp-3 mb-6 leading-relaxed">
                                        {course.description || 'Comprehensive video lectures, notes, and practice tests.'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                        Full Course Access
                                    </span>
                                    <Link
                                        href={`/courses/${course._id}`}
                                        className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1"
                                    >
                                        Start Learning ↗
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
