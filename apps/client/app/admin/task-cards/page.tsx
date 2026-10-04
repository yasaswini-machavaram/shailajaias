'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

type VideoProviderType = 'youtube' | 'bunny' | 'custom';
type CardType = 'video' | 'pts_test' | 'mts_test';

interface PdfFile {
    title: string;
    pdfUrl: string;
    pdfKey?: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

interface TaskCard {
    _id?: string;
    cardType: CardType;
    order: number;
    title: string;
    description?: string;
    dayNumber?: number;

    // Video Card fields
    videoProvider?: VideoProviderType;
    videoUrl?: string;
    notesText?: string;
    pdfFiles?: PdfFile[];
    prelimsQuizId?: string | null;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProviderType;
    mainsPracticeTestId?: string | null;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProviderType;
    helpContactInfo?: string;
    faqs?: FaqItem[];

    // PTS Test Card fields
    ptsSeriesId?: string | null;
    ptsTestIndex?: number;
    ptsTestTitle?: string;
    ptsQuizId?: string | null;
    ptsQuestionPaperUrl?: string;
    ptsSolutionPaperUrl?: string;
    ptsDiscussionVideoUrl?: string;
    ptsSyllabus?: string;

    // MTS Test Card fields
    mtsSeriesId?: string | null;
    mtsTestIndex?: number;
    mtsTestTitle?: string;
    mtsSubjectCategory?: string;
    mtsQuestionPaperUrl?: string;
    mtsSolutionPaperUrl?: string;
    mtsDiscussionVideoUrl?: string;
    mtsSyllabus?: string;
}

interface CourseOption {
    _id: string;
    title: string;
    level: string;
    mentorTags?: string[];
    isPublished: boolean;
}

interface PtsSeriesOption {
    _id: string;
    uniqueId?: string;
    title: string;
    tests: {
        index: number;
        title: string;
        date: string;
        quizId?: string;
        syllabus?: string;
        questionPaperUrl?: string;
        solutionPaperUrl?: string;
        discussionVideoUrl?: string;
        subjectTags?: string[];
    }[];
}

interface MtsSeriesOption {
    _id: string;
    uniqueId?: string;
    title: string;
    tests: {
        index: number;
        title: string;
        date: string;
        subjectCategory?: string;
        syllabus?: string;
        questionPaperUrl?: string;
        solutionPaperUrl?: string;
        discussionVideoUrl?: string;
    }[];
}

interface QuizOption {
    _id: string;
    title: string;
    date?: string;
}

function TaskCardsManagerContent() {
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId') || '';
    const { token } = useAuth();

    // Data lists
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
    const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);

    const [taskCards, setTaskCards] = useState<TaskCard[]>([]);
    const [isLoadingCards, setIsLoadingCards] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Catalogs for insertion dropdowns
    const [ptsCatalog, setPtsCatalog] = useState<PtsSeriesOption[]>([]);
    const [mtsCatalog, setMtsCatalog] = useState<MtsSeriesOption[]>([]);
    const [quizzesList, setQuizzesList] = useState<QuizOption[]>([]);

    // Modals
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
    const [videoForm, setVideoForm] = useState<Partial<TaskCard>>({});

    const [showPtsModal, setShowPtsModal] = useState(false);
    const [ptsSelectedSeriesId, setPtsSelectedSeriesId] = useState('');
    const [ptsSelectedTestIdx, setPtsSelectedTestIdx] = useState(0);

    const [showMtsModal, setShowMtsModal] = useState(false);
    const [mtsSelectedSeriesId, setMtsSelectedSeriesId] = useState('');
    const [mtsSelectedTestIdx, setMtsSelectedTestIdx] = useState(0);

    // Excel import modal inside video card
    const [showPrelimsExcelModal, setShowPrelimsExcelModal] = useState(false);
    const [prelimsQuizTitle, setPrelimsQuizTitle] = useState('');
    const [prelimsQuizDate, setPrelimsQuizDate] = useState('');
    const [prelimsExcelFile, setPrelimsExcelFile] = useState<File | null>(null);
    const [prelimsImporting, setPrelimsImporting] = useState(false);
    const [prelimsImportError, setPrelimsImportError] = useState('');

    useEffect(() => {
        if (token) {
            fetchCourses();
            fetchCatalogs();
            fetchQuizzes();
        }
    }, [token]);

    useEffect(() => {
        if (selectedCourseId && token) {
            fetchTaskCards(selectedCourseId);
            const found = courses.find((c) => c._id === selectedCourseId);
            if (found) setSelectedCourse(found);
        }
    }, [selectedCourseId, courses, token]);

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${API_URL}/api/courses`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setCourses(data.data);
                if (!selectedCourseId && data.data.length > 0) {
                    setSelectedCourseId(data.data[0]._id);
                }
            }
        } catch (err) {
            console.error('Fetch courses error:', err);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/courses/tests-catalog`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setPtsCatalog(data.data.pts || []);
                setMtsCatalog(data.data.mts || []);
            }
        } catch (err) {
            console.error('Fetch tests catalog error:', err);
        }
    };

    const fetchQuizzes = async () => {
        try {
            const res = await fetch(`${API_URL}/api/quizzes`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setQuizzesList(data.data);
            }
        } catch (err) {
            console.error('Fetch quizzes error:', err);
        }
    };

    const fetchTaskCards = async (courseId: string) => {
        setIsLoadingCards(true);
        setStatusMsg('');
        setErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/api/courses/${courseId}/task-cards`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setTaskCards(data.data.taskCards || []);
            }
        } catch (err) {
            console.error('Fetch task cards error:', err);
            setErrorMsg('Failed to load task cards sequence.');
        } finally {
            setIsLoadingCards(false);
        }
    };

    const handleSaveSequence = async () => {
        if (!selectedCourseId || !token) return;
        setIsSaving(true);
        setStatusMsg('');
        setErrorMsg('');

        try {
            const res = await fetch(`${API_URL}/api/courses/${selectedCourseId}/task-cards`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ taskCards }),
            });
            const data = await res.json();
            if (data.success) {
                setStatusMsg('Task cards sequence saved successfully!');
                setTimeout(() => setStatusMsg(''), 4000);
            } else {
                setErrorMsg(data.message || 'Failed to save task cards sequence.');
            }
        } catch (err) {
            console.error('Save task cards error:', err);
            setErrorMsg('Server error while saving task cards.');
        } finally {
            setIsSaving(false);
        }
    };

    // Reorder Cards
    const handleMoveUp = (index: number) => {
        if (index <= 0) return;
        const updated = [...taskCards];
        const temp = updated[index - 1];
        updated[index - 1] = updated[index];
        updated[index] = temp;
        setTaskCards(updated);
    };

    const handleMoveDown = (index: number) => {
        if (index >= taskCards.length - 1) return;
        const updated = [...taskCards];
        const temp = updated[index + 1];
        updated[index + 1] = updated[index];
        updated[index] = temp;
        setTaskCards(updated);
    };

    const handleDeleteCard = (index: number) => {
        if (!confirm('Are you sure you want to remove this card from the sequence?')) return;
        const updated = taskCards.filter((_, idx) => idx !== index);
        setTaskCards(updated);
    };

    // Video Card Editor Helpers
    const handleOpenAddVideo = () => {
        setEditingCardIndex(null);
        setVideoForm({
            cardType: 'video',
            title: `Task #${taskCards.length + 1} — Video Lecture`,
            videoProvider: 'youtube',
            videoUrl: '',
            notesText: '',
            pdfFiles: [],
            prelimsQuizId: null,
            prelimsDiscussionVideoUrl: '',
            mainsPracticeTestId: null,
            mainsQuestionText: '',
            mainsModelAnswer: '',
            mainsDiscussionVideoUrl: '',
            helpContactInfo: '',
            faqs: [],
        });
        setShowVideoModal(true);
    };

    const handleOpenEditVideo = (index: number) => {
        setEditingCardIndex(index);
        setVideoForm({ ...taskCards[index] });
        setShowVideoModal(true);
    };

    const handleSaveVideoModal = () => {
        if (!videoForm.title?.trim()) {
            alert('Please enter a card title.');
            return;
        }

        const newCard: TaskCard = {
            cardType: 'video',
            order: editingCardIndex !== null ? editingCardIndex : taskCards.length,
            dayNumber: (editingCardIndex !== null ? editingCardIndex : taskCards.length) + 1,
            title: videoForm.title.trim(),
            description: videoForm.description || '',
            videoProvider: videoForm.videoProvider || 'youtube',
            videoUrl: videoForm.videoUrl || '',
            notesText: videoForm.notesText || '',
            pdfFiles: videoForm.pdfFiles || [],
            prelimsQuizId: videoForm.prelimsQuizId || null,
            prelimsDiscussionVideoUrl: videoForm.prelimsDiscussionVideoUrl || '',
            mainsQuestionText: videoForm.mainsQuestionText || '',
            mainsModelAnswer: videoForm.mainsModelAnswer || '',
            mainsDiscussionVideoUrl: videoForm.mainsDiscussionVideoUrl || '',
            helpContactInfo: videoForm.helpContactInfo || '',
            faqs: videoForm.faqs || [],
        };

        if (editingCardIndex !== null) {
            const updated = [...taskCards];
            updated[editingCardIndex] = newCard;
            setTaskCards(updated);
        } else {
            setTaskCards([...taskCards, newCard]);
        }

        setShowVideoModal(false);
    };

    // PDF Handouts Helpers
    const handleAddPdf = () => {
        const currentPdfs = videoForm.pdfFiles || [];
        setVideoForm({
            ...videoForm,
            pdfFiles: [...currentPdfs, { title: 'Reference Material', pdfUrl: '' }],
        });
    };

    const handleUpdatePdf = (idx: number, field: keyof PdfFile, val: string) => {
        const currentPdfs = [...(videoForm.pdfFiles || [])];
        currentPdfs[idx] = { ...currentPdfs[idx], [field]: val };
        setVideoForm({ ...videoForm, pdfFiles: currentPdfs });
    };

    const handleRemovePdf = (idx: number) => {
        const currentPdfs = (videoForm.pdfFiles || []).filter((_, i) => i !== idx);
        setVideoForm({ ...videoForm, pdfFiles: currentPdfs });
    };

    // FAQ Helpers
    const handleAddFaq = () => {
        const currentFaqs = videoForm.faqs || [];
        setVideoForm({
            ...videoForm,
            faqs: [...currentFaqs, { question: '', answer: '' }],
        });
    };

    const handleUpdateFaq = (idx: number, field: keyof FaqItem, val: string) => {
        const currentFaqs = [...(videoForm.faqs || [])];
        currentFaqs[idx] = { ...currentFaqs[idx], [field]: val };
        setVideoForm({ ...videoForm, faqs: currentFaqs });
    };

    const handleRemoveFaq = (idx: number) => {
        const currentFaqs = (videoForm.faqs || []).filter((_, i) => i !== idx);
        setVideoForm({ ...videoForm, faqs: currentFaqs });
    };

    // PTS Test Card Insertion
    const handleOpenInsertPts = () => {
        if (ptsCatalog.length > 0) {
            setPtsSelectedSeriesId(ptsCatalog[0]._id);
            setPtsSelectedTestIdx(0);
        }
        setShowPtsModal(true);
    };

    const handleConfirmInsertPts = () => {
        const series = ptsCatalog.find((s) => s._id === ptsSelectedSeriesId);
        if (!series) {
            alert('Please select a valid PTS series.');
            return;
        }

        const test = series.tests?.[ptsSelectedTestIdx];
        if (!test) {
            alert('Please select a valid test from this series.');
            return;
        }

        const newCard: TaskCard = {
            cardType: 'pts_test',
            order: taskCards.length,
            dayNumber: taskCards.length + 1,
            title: `Prelims Test: ${test.title}`,
            ptsSeriesId: series._id,
            ptsTestIndex: ptsSelectedTestIdx,
            ptsTestTitle: test.title,
            ptsQuizId: test.quizId || null,
            ptsQuestionPaperUrl: test.questionPaperUrl || '',
            ptsSolutionPaperUrl: test.solutionPaperUrl || '',
            ptsDiscussionVideoUrl: test.discussionVideoUrl || '',
            ptsSyllabus: test.syllabus || '',
        };

        setTaskCards([...taskCards, newCard]);
        setShowPtsModal(false);
    };

    // MTS Test Card Insertion
    const handleOpenInsertMts = () => {
        if (mtsCatalog.length > 0) {
            setMtsSelectedSeriesId(mtsCatalog[0]._id);
            setMtsSelectedTestIdx(0);
        }
        setShowMtsModal(true);
    };

    const handleConfirmInsertMts = () => {
        const series = mtsCatalog.find((s) => s._id === mtsSelectedSeriesId);
        if (!series) {
            alert('Please select a valid MTS series.');
            return;
        }

        const test = series.tests?.[mtsSelectedTestIdx];
        if (!test) {
            alert('Please select a valid test from this series.');
            return;
        }

        const newCard: TaskCard = {
            cardType: 'mts_test',
            order: taskCards.length,
            dayNumber: taskCards.length + 1,
            title: `Mains Test: ${test.title}`,
            mtsSeriesId: series._id,
            mtsTestIndex: ptsSelectedTestIdx,
            mtsTestTitle: test.title,
            mtsSubjectCategory: test.subjectCategory || 'General Studies',
            mtsQuestionPaperUrl: test.questionPaperUrl || '',
            mtsSolutionPaperUrl: test.solutionPaperUrl || '',
            mtsDiscussionVideoUrl: test.discussionVideoUrl || '',
            mtsSyllabus: test.syllabus || '',
        };

        setTaskCards([...taskCards, newCard]);
        setShowMtsModal(false);
    };

    // Excel import submit
    const handleImportPrelimsExcel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prelimsExcelFile) {
            setPrelimsImportError('Please choose an Excel file.');
            return;
        }
        setPrelimsImporting(true);
        setPrelimsImportError('');

        try {
            const formData = new FormData();
            formData.append('file', prelimsExcelFile);
            formData.append('title', prelimsQuizTitle || 'Practice Quiz');
            formData.append('date', prelimsQuizDate || new Date().toISOString().split('T')[0]);

            const res = await fetch(`${API_URL}/api/quizzes/import-excel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?._id) {
                // Link created quiz into videoForm
                setVideoForm((prev) => ({ ...prev, prelimsQuizId: data.data._id }));
                fetchQuizzes();
                setShowPrelimsExcelModal(false);
                setPrelimsExcelFile(null);
            } else {
                setPrelimsImportError(data.message || 'Import failed. Check Excel format.');
            }
        } catch (err) {
            console.error('Excel import error:', err);
            setPrelimsImportError('Failed to upload Excel.');
        } finally {
            setPrelimsImporting(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-[#F8FAFC]">
            {/* Header Banner */}
            <div className="bg-[#1E3A5F] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold mb-1">
                        <Link href="/admin/courses" className="hover:underline">
                            Courses
                        </Link>
                        <span>/</span>
                        <span>Mentorship Task Card Sequencer</span>
                    </div>
                    <h1 className="text-2xl font-bold font-serif">🗂️ Mentorship Task Card Sequencer</h1>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                        Arrange custom task cards for each course, insert specific PTS and MTS tests anywhere in between video lectures, and sync practice and doubts directly into the student dashboard.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSaveSequence}
                        disabled={isSaving || !selectedCourseId}
                        className="px-6 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isSaving ? 'Saving Sequence...' : '💾 Save Sequence Order'}
                    </button>
                </div>
            </div>

            {/* Course Selector & Status Banner */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                        Select Course:
                    </label>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-[#1E3A5F] flex-1 max-w-md"
                    >
                        {courses.map((c) => (
                            <option key={c._id} value={c._id}>
                                📘 {c.title} {c.mentorTags?.length ? `(${c.mentorTags.join(', ')})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    {selectedCourse && (
                        <div className="flex items-center gap-2">
                            {selectedCourse.mentorTags?.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold"
                                >
                                    🏷️ {tag}
                                </span>
                            ))}
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                                Total Cards: {taskCards.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Banners */}
            {statusMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>✅ {statusMsg}</span>
                    <button onClick={() => setStatusMsg('')} className="text-emerald-600 hover:text-emerald-900">
                        ×
                    </button>
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>⚠️ {errorMsg}</span>
                    <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-900">
                        ×
                    </button>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenAddVideo}
                        className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>🎥</span> + Add Video Card
                    </button>
                    <button
                        onClick={handleOpenInsertPts}
                        className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>📝</span> + Insert PTS Test Card
                    </button>
                    <button
                        onClick={handleOpenInsertMts}
                        className="px-4 py-2 bg-[#0D9488] hover:bg-[#0A746B] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>✍️</span> + Insert MTS Test Card
                    </button>
                </div>

                <div className="text-xs text-slate-500 italic">
                    Use ▲ and ▼ to order cards. The student carousel displays this exact sequence!
                </div>
            </div>

            {/* Task Card Timeline Sequencer */}
            {isLoadingCards ? (
                <div className="p-12 text-center text-slate-500 font-medium">Loading task cards sequence...</div>
            ) : taskCards.length === 0 ? (
                <div className="bg-white p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-4">
                    <span className="text-4xl">🗂️</span>
                    <h3 className="text-base font-bold text-slate-800">No task cards in sequence yet</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Start assembling the daily task sequence for this course by adding a Video Card or inserting relevant PTS and MTS test cards.
                    </p>
                    <div className="flex justify-center gap-3 pt-2">
                        <button
                            onClick={handleOpenAddVideo}
                            className="px-4 py-2 bg-[#1E3A5F] text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                            + Add First Video Card
                        </button>
                        <button
                            onClick={handleOpenInsertPts}
                            className="px-4 py-2 bg-[#D97706] text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                            + Insert PTS Test Card
                        </button>
                        <button
                            onClick={handleOpenInsertMts}
                            className="px-4 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                            + Insert MTS Test Card
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {taskCards.map((card, idx) => {
                        const isVideo = card.cardType === 'video';
                        const isPts = card.cardType === 'pts_test';
                        const isMts = card.cardType === 'mts_test';

                        return (
                            <div
                                key={idx}
                                className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                    isVideo
                                        ? 'border-slate-200 hover:border-slate-400'
                                        : isPts
                                        ? 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
                                        : 'border-teal-200 bg-teal-50/20 hover:border-teal-400'
                                }`}
                            >
                                {/* Left Side: Index & Card Details */}
                                <div className="flex items-start md:items-center gap-4 flex-1">
                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200 shrink-0">
                                        <span className="text-[10px] text-slate-400 uppercase">Day</span>
                                        <span className="text-base text-[#1E3A5F]">#{idx + 1}</span>
                                    </div>

                                    <div className="space-y-1 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {isVideo && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E3A5F] text-white">
                                                    🎥 Video Lecture
                                                </span>
                                            )}
                                            {isPts && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D97706] text-white">
                                                    📝 PTS Prelims Test
                                                </span>
                                            )}
                                            {isMts && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0D9488] text-white">
                                                    ✍️ MTS Mains Test
                                                </span>
                                            )}

                                            <h3 className="font-bold text-slate-800 text-sm">{card.title}</h3>
                                        </div>

                                        {/* Card Content Indicators */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                                            {isVideo && (
                                                <>
                                                    <span className="flex items-center gap-1">
                                                        📺 {card.videoProvider || 'youtube'}: {card.videoUrl ? 'Linked' : 'No URL'}
                                                    </span>
                                                    {card.notesText && <span>📄 Notes</span>}
                                                    {card.pdfFiles && card.pdfFiles.length > 0 && (
                                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                            📎 {card.pdfFiles.length} PDF{card.pdfFiles.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                    {card.prelimsQuizId && (
                                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                            ✓ Prelims Quiz Attached
                                                        </span>
                                                    )}
                                                    {card.mainsQuestionText && (
                                                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                            ✓ Mains Practice Attached
                                                        </span>
                                                    )}
                                                </>
                                            )}

                                            {isPts && (
                                                <>
                                                    <span>Series ID: {card.ptsSeriesId || 'Selected'}</span>
                                                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                        🎯 Test #{((card.ptsTestIndex ?? 0) + 1)}
                                                    </span>
                                                    {card.ptsSyllabus && (
                                                        <span className="italic truncate max-w-xs">
                                                            Syllabus: {card.ptsSyllabus}
                                                        </span>
                                                    )}
                                                </>
                                            )}

                                            {isMts && (
                                                <>
                                                    <span>Series ID: {card.mtsSeriesId || 'Selected'}</span>
                                                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                        🎯 Test #{((card.mtsTestIndex ?? 0) + 1)} ({card.mtsSubjectCategory || 'GS'})
                                                    </span>
                                                    {card.mtsSyllabus && (
                                                        <span className="italic truncate max-w-xs">
                                                            Syllabus: {card.mtsSyllabus}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Reorder & Edit Controls */}
                                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                                    <button
                                        onClick={() => handleMoveUp(idx)}
                                        disabled={idx === 0}
                                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
                                        title="Move Up"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(idx)}
                                        disabled={idx === taskCards.length - 1}
                                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
                                        title="Move Down"
                                    >
                                        ▼
                                    </button>

                                    {isVideo && (
                                        <button
                                            onClick={() => handleOpenEditVideo(idx)}
                                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                                        >
                                            ✏️ Edit
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDeleteCard(idx)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 text-xs font-bold cursor-pointer"
                                        title="Delete Card"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal 1: Video Card Editor */}
            {showVideoModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h2 className="text-lg font-bold text-slate-900 font-serif">
                                {editingCardIndex !== null ? '✏️ Edit Video Task Card' : '🎥 Add Video Task Card'}
                            </h2>
                            <button
                                onClick={() => setShowVideoModal(false)}
                                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Title & Video Source */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Card / Video Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={videoForm.title || ''}
                                        onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                                        placeholder="e.g. Modern History — Revolt of 1857"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Provider</label>
                                    <select
                                        value={videoForm.videoProvider || 'youtube'}
                                        onChange={(e) =>
                                            setVideoForm({
                                                ...videoForm,
                                                videoProvider: e.target.value as VideoProviderType,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    >
                                        <option value="youtube">YouTube Embed</option>
                                        <option value="bunny">Bunny.net Stream</option>
                                        <option value="custom">Custom Iframe Link</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Video URL / Embed Link
                                </label>
                                <input
                                    type="text"
                                    value={videoForm.videoUrl || ''}
                                    onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                />
                            </div>

                            {/* Section: Notes & PDF Handouts */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                                    <span>📄 Notes &amp; PDF Handouts</span>
                                    <button
                                        type="button"
                                        onClick={handleAddPdf}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold cursor-pointer"
                                    >
                                        + Add PDF File
                                    </button>
                                </h4>
                                <textarea
                                    value={videoForm.notesText || ''}
                                    onChange={(e) => setVideoForm({ ...videoForm, notesText: e.target.value })}
                                    rows={2}
                                    placeholder="Enter lecture summary or key notes..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                />

                                {videoForm.pdfFiles && videoForm.pdfFiles.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        {videoForm.pdfFiles.map((pdf, pIdx) => (
                                            <div key={pIdx} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={pdf.title}
                                                    onChange={(e) => handleUpdatePdf(pIdx, 'title', e.target.value)}
                                                    placeholder="PDF Title (e.g. Class PPT)"
                                                    className="w-1/3 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    value={pdf.pdfUrl}
                                                    onChange={(e) => handleUpdatePdf(pIdx, 'pdfUrl', e.target.value)}
                                                    placeholder="https://.../handout.pdf"
                                                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePdf(pIdx)}
                                                    className="text-red-600 font-bold px-1.5 hover:bg-red-50 rounded"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section: Prelims Practice */}
                            <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                        📝 Prelims Practice &amp; Discussion
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPrelimsQuizTitle(videoForm.title ? `${videoForm.title} Quiz` : 'Prelims Practice Quiz');
                                            setPrelimsQuizDate(new Date().toISOString().split('T')[0]);
                                            setPrelimsExcelFile(null);
                                            setPrelimsImportError('');
                                            setShowPrelimsExcelModal(true);
                                        }}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                                    >
                                        📥 Import Excel (Prelims)
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Attach Prelims Quiz
                                        </label>
                                        <select
                                            value={videoForm.prelimsQuizId || ''}
                                            onChange={(e) =>
                                                setVideoForm({
                                                    ...videoForm,
                                                    prelimsQuizId: e.target.value || null,
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                        >
                                            <option value="">-- No Quiz Attached --</option>
                                            {quizzesList.map((q) => (
                                                <option key={q._id} value={q._id}>
                                                    {q.title} {q.date ? `(${q.date})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Discussion Video URL
                                        </label>
                                        <input
                                            type="text"
                                            value={videoForm.prelimsDiscussionVideoUrl || ''}
                                            onChange={(e) =>
                                                setVideoForm({
                                                    ...videoForm,
                                                    prelimsDiscussionVideoUrl: e.target.value,
                                                })
                                            }
                                            placeholder="https://www.youtube.com/..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Mains Practice */}
                            <div className="p-4 bg-teal-50/30 rounded-xl border border-teal-200 space-y-3">
                                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                                    ✍️ Mains Practice &amp; Discussion
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Direct Mains Question Text
                                        </label>
                                        <textarea
                                            value={videoForm.mainsQuestionText || ''}
                                            onChange={(e) =>
                                                setVideoForm({
                                                    ...videoForm,
                                                    mainsQuestionText: e.target.value,
                                                })
                                            }
                                            rows={2}
                                            placeholder="Write Mains question..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Model Answer / Approach
                                        </label>
                                        <textarea
                                            value={videoForm.mainsModelAnswer || ''}
                                            onChange={(e) =>
                                                setVideoForm({
                                                    ...videoForm,
                                                    mainsModelAnswer: e.target.value,
                                                })
                                            }
                                            rows={2}
                                            placeholder="Model answer framework..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Doubts & FAQs */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        ❓ Doubts &amp; FAQs
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={handleAddFaq}
                                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-bold cursor-pointer"
                                    >
                                        + Add FAQ
                                    </button>
                                </div>

                                {videoForm.faqs && videoForm.faqs.length > 0 && (
                                    <div className="space-y-2">
                                        {videoForm.faqs.map((faq, fIdx) => (
                                            <div key={fIdx} className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <input
                                                        type="text"
                                                        value={faq.question}
                                                        onChange={(e) => handleUpdateFaq(fIdx, 'question', e.target.value)}
                                                        placeholder="Question..."
                                                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-semibold"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFaq(fIdx)}
                                                        className="text-red-600 font-bold ml-2 px-1 hover:bg-red-50 rounded"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={faq.answer}
                                                    onChange={(e) => handleUpdateFaq(fIdx, 'answer', e.target.value)}
                                                    rows={1}
                                                    placeholder="Answer..."
                                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setShowVideoModal(false)}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveVideoModal}
                                className="px-5 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Save Video Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Insert PTS Test Card */}
            {showPtsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h2 className="text-base font-bold text-slate-900 font-serif">
                                📝 Insert PTS Prelims Test Card
                            </h2>
                            <button
                                onClick={() => setShowPtsModal(false)}
                                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        {ptsCatalog.length === 0 ? (
                            <p className="text-xs text-slate-500">No Prelims Test Series available.</p>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Select Prelims Test Series *
                                    </label>
                                    <select
                                        value={ptsSelectedSeriesId}
                                        onChange={(e) => {
                                            setPtsSelectedSeriesId(e.target.value);
                                            setPtsSelectedTestIdx(0);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                                    >
                                        {ptsCatalog.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.uniqueId ? `[${s.uniqueId}] ` : ''}
                                                {s.title} ({s.tests?.length || 0} Tests)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Select Specific Test *
                                    </label>
                                    {(() => {
                                        const series = ptsCatalog.find((s) => s._id === ptsSelectedSeriesId);
                                        const tests = series?.tests || [];
                                        if (tests.length === 0) {
                                            return <p className="text-xs text-slate-400 italic">No tests found in this series.</p>;
                                        }
                                        return (
                                            <select
                                                value={ptsSelectedTestIdx}
                                                onChange={(e) => setPtsSelectedTestIdx(Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                            >
                                                {tests.map((t, tIdx) => (
                                                    <option key={tIdx} value={tIdx}>
                                                        Test #{tIdx + 1}: {t.title} {t.syllabus ? `— (${t.syllabus})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setShowPtsModal(false)}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmInsertPts}
                                disabled={ptsCatalog.length === 0}
                                className="px-5 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                                Insert PTS Test Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Insert MTS Test Card */}
            {showMtsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h2 className="text-base font-bold text-slate-900 font-serif">
                                ✍️ Insert MTS Mains Test Card
                            </h2>
                            <button
                                onClick={() => setShowMtsModal(false)}
                                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        {mtsCatalog.length === 0 ? (
                            <p className="text-xs text-slate-500">No Mains Test Series available.</p>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Select Mains Test Series *
                                    </label>
                                    <select
                                        value={mtsSelectedSeriesId}
                                        onChange={(e) => {
                                            setMtsSelectedSeriesId(e.target.value);
                                            setMtsSelectedTestIdx(0);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                                    >
                                        {mtsCatalog.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.uniqueId ? `[${s.uniqueId}] ` : ''}
                                                {s.title} ({s.tests?.length || 0} Tests)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Select Specific Test *
                                    </label>
                                    {(() => {
                                        const series = mtsCatalog.find((s) => s._id === mtsSelectedSeriesId);
                                        const tests = series?.tests || [];
                                        if (tests.length === 0) {
                                            return <p className="text-xs text-slate-400 italic">No tests found in this series.</p>;
                                        }
                                        return (
                                            <select
                                                value={mtsSelectedTestIdx}
                                                onChange={(e) => setMtsSelectedTestIdx(Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                            >
                                                {tests.map((t, tIdx) => (
                                                    <option key={tIdx} value={tIdx}>
                                                        Test #{tIdx + 1}: {t.title} ({t.subjectCategory || 'Mains'})
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setShowMtsModal(false)}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmInsertMts}
                                disabled={mtsCatalog.length === 0}
                                className="px-5 py-2 bg-[#0D9488] hover:bg-[#0A746B] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                                Insert MTS Test Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 4: Excel Prelims Upload Modal */}
            {showPrelimsExcelModal && (
                <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-900 font-serif">
                                📥 Import Prelims Quiz from Excel
                            </h3>
                            <button
                                onClick={() => setShowPrelimsExcelModal(false)}
                                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleImportPrelimsExcel} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Quiz Title *</label>
                                <input
                                    type="text"
                                    value={prelimsQuizTitle}
                                    onChange={(e) => setPrelimsQuizTitle(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Quiz Date *</label>
                                <input
                                    type="date"
                                    value={prelimsQuizDate}
                                    onChange={(e) => setPrelimsQuizDate(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Excel File (.xlsx / .xls) *
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setPrelimsExcelFile(e.target.files?.[0] || null)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50"
                                />
                            </div>

                            {prelimsImportError && (
                                <div className="p-2.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
                                    {prelimsImportError}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPrelimsExcelModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={prelimsImporting}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                    {prelimsImporting ? 'Importing...' : 'Upload & Attach'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminTaskCardsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Sequencer...</div>}>
            <TaskCardsManagerContent />
        </Suspense>
    );
}
