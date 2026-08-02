'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getMainsPracticeTestById, type MainsPracticeTest, type MainsQuestionItem } from '@/lib/api';

function getDifficultyBadge(level?: string) {
    switch (level) {
        case 'Easy':
            return { label: 'Easy', bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', border: 'border-[#A5D6A7]', dot: 'bg-[#4CAF50]' };
        case 'Difficult':
            return { label: 'Difficult', bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', border: 'border-[#FFCC80]', dot: 'bg-[#FF9800]' };
        case 'Moderate':
        default:
            return { label: 'Moderate', bg: 'bg-[#FFFDE7]', text: 'text-[#F57F17]', border: 'border-[#FFF59D]', dot: 'bg-[#FBC02D]' };
    }
}

export default function MainsPracticeTestDetailPage() {
    const params = useParams();
    const id = params?.id as string;

    const [test, setTest] = useState<MainsPracticeTest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // State for expanded question indices — first question (index 0) expanded by default!
    const [expandedIndices, setExpandedIndices] = useState<number[]>([0]);

    useEffect(() => {
        if (id) {
            fetchTestDetail();
        }
    }, [id]);

    const fetchTestDetail = async () => {
        setIsLoading(true);
        try {
            const data = await getMainsPracticeTestById(id);
            if (data) {
                setTest(data);
                // Ensure first question is expanded by default
                setExpandedIndices([0]);
            }
        } catch (error) {
            console.error('Failed to fetch MPT detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAccordion = (index: number) => {
        setExpandedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleExpandAll = () => {
        if (!test?.questions) return;
        if (expandedIndices.length === test.questions.length) {
            setExpandedIndices([]); // Collapse all
        } else {
            setExpandedIndices(test.questions.map((_, i) => i)); // Expand all
        }
    };

    const isAllExpanded = test?.questions && expandedIndices.length === test.questions.length;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center font-body">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4A90E2]" />
            </div>
        );
    }

    if (!test) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] pt-24 px-4 font-body">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-4">Practice Test not found.</p>
                    <Link href="/tests/mains-practice-test" className="inline-flex items-center gap-2 text-sm font-bold text-[#D97706]">
                        ← Back to Mains Practice Tests
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-3xl mx-auto">
                {/* Back Nav */}
                <div className="mb-4 flex items-center justify-between">
                    <Link href="/tests/mains-practice-test" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to Mains Practice Tests
                    </Link>
                </div>

                {/* Practice Test Title Header */}
                <h1 className="text-2xl md:text-3xl font-bold text-center text-[#0F172A] font-headline mb-6">
                    {test.title}
                </h1>

                {/* Summary Box matching Wireframe 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Left Box: Question Count */}
                    <div className="bg-[#FFF3E0] border-2 border-[#FFE0B2] rounded-2xl p-6 text-center flex flex-col justify-center items-center shadow-xs">
                        <span className="text-xl md:text-2xl font-bold text-[#1E3A5F] font-headline">
                            {test.questions?.length || 0} Questions
                        </span>
                    </div>

                    {/* Right Box: Difficulty Legend */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-col justify-center shadow-xs space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-4 h-4 rounded-full bg-[#81C784] border border-[#388E3C] flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-700">Easy</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-4 h-4 rounded-full bg-[#FFF176] border border-[#FBC02D] flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-700">Moderate</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-4 h-4 rounded-full bg-[#FFB74D] border border-[#F57C00] flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-700">Difficult</span>
                        </div>
                    </div>
                </div>

                {/* Control Bar: Expand/Collapse All Toggle */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Questions List
                    </span>
                    <button
                        onClick={handleExpandAll}
                        className="text-xs font-bold text-[#1E3A5F] hover:text-[#D97706] bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-xs transition-colors"
                    >
                        {isAllExpanded ? 'Collapse All −' : 'Expand All +'}
                    </button>
                </div>

                {/* Question Accordion Items matching Wireframe 2 */}
                <div className="space-y-3">
                    {test.questions?.map((q, idx) => {
                        const isExpanded = expandedIndices.includes(idx);
                        const badge = getDifficultyBadge(q.difficultyLevel);

                        return (
                            <div
                                key={q._id || idx}
                                className={`border-2 rounded-2xl overflow-hidden transition-all shadow-xs ${
                                    isExpanded ? 'bg-white border-[#BBE0F9]' : 'bg-[#EBF3FC] border-[#CFE4F9] hover:border-[#BBE0F9]'
                                }`}
                            >
                                {/* Accordion Header */}
                                <button
                                    onClick={() => toggleAccordion(idx)}
                                    className="w-full text-left p-4 md:p-5 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <span className="font-bold text-xs text-[#1E3A5F] bg-[#D0E4F9] px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                                            Q{idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm md:text-base font-semibold text-slate-800 leading-snug">
                                                {q.questionText}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {/* Difficulty Badge */}
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.bg} ${badge.text} ${badge.border} flex items-center gap-1.5`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                            {badge.label}
                                        </span>

                                        {/* Expand Icon */}
                                        <span className="text-lg font-bold text-[#1E3A5F] w-6 h-6 flex items-center justify-center">
                                            {isExpanded ? '−' : '+'}
                                        </span>
                                    </div>
                                </button>

                                {/* Accordion Expanded Body */}
                                {isExpanded && (
                                    <div className="px-4 pb-5 md:px-5 border-t border-slate-200/60 bg-white">
                                        {/* Metadata Chips */}
                                        <div className="flex flex-wrap gap-2 my-3">
                                            {q.marks && (
                                                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                                                    {q.marks} Marks
                                                </span>
                                            )}
                                            {q.wordLimit && (
                                                <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-100">
                                                    {q.wordLimit} Words
                                                </span>
                                            )}
                                            {q.topicTags?.map((tag, tIdx) => (
                                                <span key={tIdx} className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Structuring Approach Guidelines (if provided) */}
                                        {q.approach && (
                                            <div className="mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4">
                                                <h4 className="text-xs font-bold text-[#166534] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                    💡 Approach & Structuring Guidelines
                                                </h4>
                                                <p className="text-xs text-[#15803D] leading-relaxed whitespace-pre-line">
                                                    {q.approach}
                                                </p>
                                            </div>
                                        )}

                                        {/* Model Answer Section */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Model Answer / Explanation:
                                            </h4>
                                            <div
                                                className="prose prose-slate max-w-none text-xs md:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200"
                                                dangerouslySetInnerHTML={{ __html: q.modelAnswer }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
