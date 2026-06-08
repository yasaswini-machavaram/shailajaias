'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getQuizById, type Quiz } from '@/lib/api';

export default function PrintTestPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen py-20 bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
            </div>
        }>
            <PrintTestContent />
        </Suspense>
    );
}

function PrintTestContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const mode = searchParams.get('mode') || 'question'; // 'question' or 'solution'
    
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) {
            setError('No Quiz ID specified in URL.');
            setIsLoading(false);
            return;
        }

        const fetchQuiz = async () => {
            try {
                const data = await getQuizById(id);
                if (data) {
                    setQuiz(data);
                    
                    // Auto trigger print after render
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                } else {
                    setError('Quiz not found.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load quiz details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuiz();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-20 bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F] mb-4"></div>
                <p className="text-slate-500 font-semibold">Generating print layout...</p>
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="p-8 text-center max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-lg font-bold text-red-600 mt-4">Error Loading Print Layout</h3>
                <p className="text-gray-500 text-sm mt-1">{error || 'Unknown error occurred'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-6 px-4 py-2 bg-[#1E3A5F] text-white font-bold text-sm rounded-xl"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const optionLabels = ['A', 'B', 'C', 'D'];
    const totalQuestions = quiz.questions?.length || 0;
    const isSolutionMode = mode === 'solution';

    return (
        <div className="bg-white min-h-screen text-black p-8 max-w-4xl mx-auto print:p-0 print:max-w-full print:text-black">
            {/* Print Header Controls (Hidden on Print) */}
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                <div className="text-sm text-slate-600">
                    <p className="font-bold text-[#1E3A5F]">Print / PDF Preview Mode</p>
                    <p className="text-xs">Generating <strong>{isSolutionMode ? 'Detailed Solution' : 'Question Paper'}</strong></p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                        🖨️ Print / Save as PDF
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Close Preview
                    </button>
                </div>
            </div>

            {/* Print Document */}
            <div className="font-serif">
                {/* Brand Header */}
                <div className="text-center border-b-2 border-black pb-4 mb-8">
                    <h1 className="text-3xl font-extrabold tracking-wider uppercase">SHAILAJA IAS</h1>
                    <p className="text-xs uppercase tracking-widest font-sans font-semibold text-gray-700">Academy for Civil Services Examination</p>
                    
                    <div className="grid grid-cols-2 text-left font-sans text-xs mt-6 gap-2">
                        <div>
                            <strong>Test Name:</strong> {quiz.title}
                        </div>
                        <div className="text-right">
                            <strong>Date:</strong> {new Date(quiz.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div>
                            <strong>Total Questions:</strong> {totalQuestions}
                        </div>
                        <div className="text-right">
                            <strong>Maximum Marks:</strong> {totalQuestions * 2}
                        </div>
                    </div>
                </div>

                {/* Instructions Box (Only for Question mode) */}
                {!isSolutionMode && (
                    <div className="border border-black p-4 mb-8 text-xs font-sans space-y-1">
                        <h3 className="font-bold uppercase mb-1">General Instructions:</h3>
                        <p>1. This paper contains {totalQuestions} questions of equal marks.</p>
                        <p>2. For each question, choose the best suitable answer option.</p>
                        <p>3. Do not open the explanation sheet before completing the test.</p>
                    </div>
                )}

                {/* Mode Heading */}
                <div className="text-center font-sans font-bold text-sm tracking-wide border border-black py-1.5 mb-8 uppercase bg-gray-50">
                    {isSolutionMode ? 'Answer Key & Solution Explanation Sheet' : 'Question Booklet'}
                </div>

                {/* Questions List */}
                <div className="space-y-8 font-serif leading-relaxed">
                    {quiz.questions?.map((q, idx) => {
                        return (
                            <div key={q._id || idx} className="break-inside-avoid page-break-inside-avoid">
                                <div className="flex gap-3 mb-3">
                                    <span className="font-bold font-sans text-[#1E3A5F]">{idx + 1}.</span>
                                    <h3 className="font-bold text-base text-gray-900 whitespace-pre-line leading-relaxed">
                                        {q.question}
                                    </h3>
                                </div>

                                <div className="pl-6 grid grid-cols-1 gap-2 text-sm">
                                    {q.options.map((option, oIdx) => {
                                        const isCorrect = isSolutionMode && q.correctIndex === oIdx;
                                        return (
                                            <div
                                                key={oIdx}
                                                className={`flex items-start gap-2.5 p-1 rounded ${
                                                    isCorrect ? 'bg-green-50 border border-green-200/60 font-semibold' : ''
                                                }`}
                                            >
                                                <span className="font-bold font-sans w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-[10px] shrink-0">
                                                    {optionLabels[oIdx]}
                                                </span>
                                                <span className="leading-snug">{option}</span>
                                                {isCorrect && (
                                                    <span className="text-green-600 font-bold ml-auto font-sans text-xs">✓ Correct Option</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Explanation Section for Solution Mode */}
                                {isSolutionMode && q.explanation && (
                                    <div className="ml-6 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs leading-relaxed text-gray-700">
                                        <p className="font-bold text-[#1E3A5F] mb-1">Explanation:</p>
                                        <p className="whitespace-pre-line">{q.explanation}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Custom print styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-hidden, header, footer, nav {
                        display: none !important;
                    }
                    .break-inside-avoid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}
