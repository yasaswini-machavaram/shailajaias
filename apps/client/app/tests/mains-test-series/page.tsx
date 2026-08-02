'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getMainsTestSeriesList, getMainsTestSeriesById, API_URL, type MainsTestSeries, type MainsTestSeriesItem, type MainsSubmission } from '@/lib/api';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

const SUBJECT_CATEGORIES = ['All', 'GS-1', 'GS-2', 'GS-3', 'GS-4', 'Essay', 'Optional'];

// Convert youtube watch URL to embed URL
function getYoutubeEmbedUrl(url?: string) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
}

// Subject category color styles
function getCategoryStyles(cat: string) {
    switch (cat) {
        case 'GS-1': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' };
        case 'GS-2': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' };
        case 'GS-3': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' };
        case 'GS-4': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' };
        case 'Essay': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' };
        case 'Optional': return { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' };
        default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' };
    }
}

export default function MainsTestSeriesPage() {
    const { user, token, isLoggedIn } = useStudentAuth();

    // Data state
    const [seriesList, setSeriesList] = useState<MainsTestSeries[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<MainsTestSeries | null>(null);
    const [submissions, setSubmissions] = useState<MainsSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI state
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    // Upload modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadTestIndex, setUploadTestIndex] = useState<number | null>(null);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Video modal
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');

    // Fetch initial data
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch submissions when series is selected and user is logged in
    useEffect(() => {
        if (selectedSeries && isLoggedIn && token) {
            fetchMySubmissions(selectedSeries._id);
        }
    }, [selectedSeries, isLoggedIn, token]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const list = await getMainsTestSeriesList();
            setSeriesList(list);
            if (list.length === 1) {
                const full = await getMainsTestSeriesById(list[0]._id);
                if (full) setSelectedSeries(full);
            }
        } catch (error) {
            console.error('Failed to fetch MTS data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMySubmissions = async (mtsId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mts/submissions/my?mainsTestSeriesId=${mtsId}`, {
                headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
            });
            const data = await res.json();
            if (data.success) {
                setSubmissions(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        }
    };

    const handleSelectSeries = async (series: MainsTestSeries) => {
        setIsLoading(true);
        try {
            const full = await getMainsTestSeriesById(series._id);
            if (full) {
                setSelectedSeries(full);
                setExpandedIndex(null);
                setSelectedSubject('All');
            }
        } catch (error) {
            console.error('Failed to fetch series:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get submission for a specific test
    const getSubmission = (testIndex: number): MainsSubmission | undefined => {
        return submissions.find(s => s.testIndex === testIndex);
    };

    // Filter tests by subject
    const filteredTests = selectedSeries?.tests?.filter(t =>
        selectedSubject === 'All' || t.subjectCategory === selectedSubject
    ) || [];

    // Open upload modal
    const openUploadModal = (testIndex: number) => {
        if (!isLoggedIn) {
            window.location.href = '/login';
            return;
        }
        setUploadTestIndex(testIndex);
        setUploadFiles([]);
        setUploadError('');
        setUploadSuccess('');
        setShowUploadModal(true);
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const valid = files.filter(f => {
            const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowed.includes(f.type)) return false;
            if (f.size > 20 * 1024 * 1024) return false;
            return true;
        });
        if (valid.length !== files.length) {
            setUploadError('Some files were skipped. Only PDF, JPG, PNG, WebP under 20MB allowed.');
        }
        setUploadFiles(prev => [...prev, ...valid].slice(0, 10));
    };

    // Submit answer sheets
    const handleSubmitAnswerSheet = async () => {
        if (uploadFiles.length === 0 || uploadTestIndex === null || !selectedSeries) return;

        setIsUploading(true);
        setUploadError('');
        setUploadSuccess('');

        const test = selectedSeries.tests[uploadTestIndex];
        const formData = new FormData();
        uploadFiles.forEach(f => formData.append('answerSheets', f));
        formData.append('mainsTestSeriesId', selectedSeries._id);
        formData.append('testIndex', String(uploadTestIndex));
        formData.append('testTitle', test.title);
        formData.append('seriesUniqueId', selectedSeries.uniqueId || '');

        try {
            const res = await fetch(`${API_URL}/api/mts/submissions`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                setUploadSuccess('Answer sheet uploaded successfully! Your submission is now being tracked.');
                setUploadFiles([]);
                // Refresh submissions
                fetchMySubmissions(selectedSeries._id);
            } else {
                setUploadError(data.message || 'Failed to upload answer sheet');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError('An error occurred while uploading');
        } finally {
            setIsUploading(false);
        }
    };

    // Status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'submitted': return { label: 'Submitted', color: 'bg-blue-100 text-blue-800' };
            case 'assigned': return { label: 'Under Assignment', color: 'bg-yellow-100 text-yellow-800' };
            case 'under_review': return { label: 'Under Review', color: 'bg-orange-100 text-orange-800' };
            case 'evaluated': return { label: 'Evaluated', color: 'bg-green-100 text-green-800' };
            default: return { label: status, color: 'bg-gray-100 text-gray-800' };
        }
    };

    // Format date
    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        } catch { return dateStr; }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D97706]" />
            </div>
        );
    }

    // Empty state
    if (seriesList.length === 0) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
                <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">
                    <section className="animate-fade-in-up">
                        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100 text-center">
                            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E65100] to-[#FF9800] flex items-center justify-center mb-6 shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] font-headline mb-3">MAINS Tests Series</h1>
                            <p className="text-[#64748B] text-sm mb-8">No test series are currently available. Please check back later.</p>
                            <Link href="/tests" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back to Tests
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    // Multi-group landing (show cards when > 1 series)
    if (seriesList.length > 1 && !selectedSeries) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
                <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">
                    <div className="mb-6">
                        <Link href="/tests" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to Tests
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold text-[#1E3A5F] font-headline mb-6">MAINS Tests Series</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {seriesList.map(series => (
                            <button
                                key={series._id}
                                onClick={() => handleSelectSeries(series)}
                                className="text-left bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E65100] to-[#FF9800] flex items-center justify-center shadow">
                                        <span className="text-white text-lg">📝</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#1E3A5F] font-headline">{series.title}</h3>
                                        {series.uniqueId && <span className="text-[10px] font-bold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded">{series.uniqueId}</span>}
                                    </div>
                                </div>
                                {series.description && <p className="text-xs text-[#64748B] mb-3 line-clamp-2">{series.description}</p>}
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">{series.sectionalCount} Sectional</span>
                                    <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded">{series.fullLengthCount} Full Length</span>
                                </div>
                                <div className="mt-3 text-xs font-bold text-[#D97706]">View Tests →</div>
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // Main detail view
    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-3xl mx-auto">
                {/* Back nav */}
                <div className="mb-4">
                    {seriesList.length > 1 ? (
                        <button onClick={() => { setSelectedSeries(null); setExpandedIndex(null); }} className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            ← Back to All Series
                        </button>
                    ) : (
                        <Link href="/tests" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to Tests
                        </Link>
                    )}
                </div>

                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4 animate-fade-in-up">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#E65100] to-[#FF9800] flex items-center justify-center shadow-lg flex-shrink-0">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-[#1E3A5F] font-headline">MAINS Tests Series</h1>
                            {selectedSeries?.uniqueId && <span className="text-xs font-bold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded">{selectedSeries.uniqueId}</span>}
                        </div>
                    </div>

                    {/* Brochure & Intro Video */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        {selectedSeries?.brochureUrl && (
                            <a
                                href={`${API_URL}${selectedSeries.brochureUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-[#1E3A5F] text-white text-sm font-bold py-3 px-4 rounded-xl hover:bg-[#152C4A] transition-colors"
                            >
                                📄 Download Brochure
                                <span className="text-[10px] opacity-75">Schedule & Syllabus</span>
                            </a>
                        )}
                        {selectedSeries?.introVideoUrl && (
                            <button
                                onClick={() => { setVideoUrl(selectedSeries.introVideoUrl!); setShowVideoModal(true); }}
                                className="flex items-center justify-center gap-2 bg-red-500 text-white text-sm font-bold py-3 px-4 rounded-xl hover:bg-red-600 transition-colors"
                            >
                                ▶ INTRO Video
                            </button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-xl py-3 px-4 text-center border border-blue-100">
                            <span className="text-lg font-bold text-blue-700">{selectedSeries?.sectionalCount || 0}</span>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Sectional Tests</p>
                        </div>
                        <div className="bg-green-50 rounded-xl py-3 px-4 text-center border border-green-100">
                            <span className="text-lg font-bold text-green-700">{selectedSeries?.fullLengthCount || 0}</span>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Full Length Tests</p>
                        </div>
                    </div>
                </div>

                {/* Subject Filter Bar */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <svg className="w-5 h-5 text-[#64748B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {SUBJECT_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedSubject(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedSubject === cat
                                        ? 'bg-[#1E3A5F] text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Test Cards */}
                <div className="space-y-3">
                    {filteredTests.map((test, idx) => {
                        // Find original index in unfiltered array
                        const originalIndex = selectedSeries!.tests.indexOf(test);
                        const isExpanded = expandedIndex === originalIndex;
                        const styles = getCategoryStyles(test.subjectCategory);
                        const submission = getSubmission(originalIndex);
                        const statusBadge = submission ? getStatusBadge(submission.status) : null;

                        return (
                            <div
                                key={originalIndex}
                                className={`${styles.bg} ${styles.border} border rounded-2xl overflow-hidden shadow-sm transition-all animate-fade-in-up`}
                                style={{ animationDelay: `${0.05 * idx}s` }}
                            >
                                {/* Card Header */}
                                <button
                                    onClick={() => setExpandedIndex(isExpanded ? null : originalIndex)}
                                    className="w-full text-left p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-[10px] font-bold text-[#D97706] mb-1">{formatDate(test.date)}</p>
                                        <h3 className={`text-base font-bold ${styles.text} font-headline`}>{test.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${styles.badge}`}>{test.subjectCategory}</span>
                                            {statusBadge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusBadge.color}`}>{statusBadge.label}</span>}
                                        </div>
                                    </div>
                                    <svg className={`w-5 h-5 ${styles.text} transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-200/50">
                                        {/* Action Buttons Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 mb-3">
                                            {/* Download Question Booklet */}
                                            <a
                                                href={test.questionPaperUrl ? `${API_URL}${test.questionPaperUrl}` : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                                                    test.questionPaperUrl ? 'bg-white border-gray-200 hover:shadow-sm cursor-pointer' : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                                }`}
                                                onClick={e => { if (!test.questionPaperUrl) e.preventDefault(); }}
                                            >
                                                <span className="text-2xl">📄</span>
                                                <span className="text-[10px] font-bold text-gray-700 leading-tight">Download Question Booklet</span>
                                            </a>

                                            {/* Download Detailed Solution */}
                                            <a
                                                href={test.solutionPaperUrl ? `${API_URL}${test.solutionPaperUrl}` : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                                                    test.solutionPaperUrl ? 'bg-white border-gray-200 hover:shadow-sm cursor-pointer' : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                                }`}
                                                onClick={e => { if (!test.solutionPaperUrl) e.preventDefault(); }}
                                            >
                                                <span className="text-2xl">📋</span>
                                                <span className="text-[10px] font-bold text-gray-700 leading-tight">Download Detailed Solution</span>
                                            </a>

                                            {/* Ask Doubt */}
                                            <Link
                                                href="/profile"
                                                className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-white border-gray-200 hover:shadow-sm text-center transition-all"
                                            >
                                                <span className="text-2xl">❓</span>
                                                <span className="text-[10px] font-bold text-gray-700 leading-tight">Ask Doubt</span>
                                            </Link>

                                            {/* Test Discussion Video */}
                                            <button
                                                onClick={() => { if (test.discussionVideoUrl) { setVideoUrl(test.discussionVideoUrl); setShowVideoModal(true); } }}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                                                    test.discussionVideoUrl ? 'bg-white border-gray-200 hover:shadow-sm cursor-pointer' : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                                }`}
                                                disabled={!test.discussionVideoUrl}
                                            >
                                                <span className="text-2xl">🎬</span>
                                                <span className="text-[10px] font-bold text-gray-700 leading-tight">Test Discussion Video</span>
                                            </button>
                                        </div>

                                        {/* Upload & Evaluated Copy Buttons */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Upload Your Answers */}
                                            <button
                                                onClick={() => {
                                                    if (test.isLocked || submission) return;
                                                    openUploadModal(originalIndex);
                                                }}
                                                disabled={test.isLocked || !!submission}
                                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                                                    test.isLocked || submission
                                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                                                }`}
                                            >
                                                Upload Your Answers
                                                {(test.isLocked || submission) && <span>🔒</span>}
                                            </button>

                                            {/* Evaluated Copy */}
                                            <a
                                                href={submission?.evaluatedCopyUrl ? `${API_URL}${submission.evaluatedCopyUrl}` : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                                                    submission?.status === 'evaluated' && submission.evaluatedCopyUrl
                                                        ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                                onClick={e => { if (submission?.status !== 'evaluated' || !submission?.evaluatedCopyUrl) e.preventDefault(); }}
                                            >
                                                Evaluated Copy
                                                {(submission?.status !== 'evaluated' || !submission?.evaluatedCopyUrl) && <span>🔒</span>}
                                            </a>
                                        </div>

                                        {/* Submission status details */}
                                        {submission && (
                                            <div className="mt-3 bg-white rounded-xl p-3 border border-gray-200 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-gray-500">Submitted on:</span>
                                                    <span className="font-semibold">{formatDate(submission.submittedAt)}</span>
                                                </div>
                                                {submission.score !== undefined && submission.maxScore !== undefined && (
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-gray-500">Score:</span>
                                                        <span className="font-bold text-green-700">{submission.score} / {submission.maxScore}</span>
                                                    </div>
                                                )}
                                                {submission.feedback && (
                                                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                        <p className="text-[10px] font-bold text-amber-700 mb-1">Mentor Feedback:</p>
                                                        <p className="text-gray-700">{submission.feedback}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredTests.length === 0 && selectedSeries && (
                    <div className="text-center py-12">
                        <p className="text-[#64748B] text-sm">No tests found for &quot;{selectedSubject}&quot; category.</p>
                    </div>
                )}
            </main>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-[#1E3A5F] font-headline mb-1">Upload Answer Sheets</h3>
                        <p className="text-xs text-[#64748B] mb-4">
                            Upload scanned copies of your written answers (PDF, JPG, PNG). Max 10 files, 20MB each.
                        </p>

                        {uploadError && (
                            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-3 border border-red-200">{uploadError}</div>
                        )}
                        {uploadSuccess && (
                            <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl mb-3 border border-green-200">{uploadSuccess}</div>
                        )}

                        {!uploadSuccess && (
                            <>
                                {/* File picker */}
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#D97706] transition-colors mb-3"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-sm text-gray-500">Tap to select files</p>
                                    <p className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG, WebP</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {/* Selected files list */}
                                {uploadFiles.length > 0 && (
                                    <div className="mb-3 space-y-1">
                                        {uploadFiles.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                                <span className="truncate flex-1">{f.name}</span>
                                                <button onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 ml-2 font-bold">✕</button>
                                            </div>
                                        ))}
                                        <p className="text-[10px] text-gray-400">{uploadFiles.length}/10 files selected</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitAnswerSheet}
                                        disabled={uploadFiles.length === 0 || isUploading}
                                        className="flex-1 py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#152C4A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isUploading ? 'Uploading...' : 'Submit'}
                                    </button>
                                </div>
                            </>
                        )}

                        {uploadSuccess && (
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#152C4A] transition-colors"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {showVideoModal && videoUrl && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => { setShowVideoModal(false); setVideoUrl(''); }}>
                    <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end mb-2">
                            <button onClick={() => { setShowVideoModal(false); setVideoUrl(''); }} className="text-white text-2xl font-bold">✕</button>
                        </div>
                        <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden">
                            <iframe
                                src={getYoutubeEmbedUrl(videoUrl)}
                                className="absolute top-0 left-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
