'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type VideoProviderType = 'youtube' | 'bunny' | 'custom';

interface PdfFile {
    title: string;
    pdfUrl: string;
    pdfKey?: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

interface VideoItem {
    _id?: string;
    title: string;
    description?: string;
    videoProvider: VideoProviderType;
    videoUrl: string;
    // Notes
    notesText?: string;
    pdfFiles: PdfFile[];
    // Prelims Practice
    prelimsQuizId?: string;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProviderType;
    // Mains Practice
    mainsPracticeTestId?: string;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProviderType;
    // Help & FAQ
    helpContactInfo?: string;
    faqs: FaqItem[];
}

interface CourseNode {
    _id: string;
    title: string;
    description?: string;
    parent?: string | null;
    order: number;
    level: 'course' | 'subject' | 'topic' | 'subtopic';
    videos: VideoItem[];
    contentTabs?: any[];
    isPublished: boolean;
    isPracticeLocked: boolean;
    isHelpLocked: boolean;
    isLocked: boolean;
    children?: CourseNode[];
}

interface QuizQuestion {
    _id?: string;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
}

interface FetchedQuiz {
    _id: string;
    title: string;
    description?: string;
    questions: QuizQuestion[];
}

interface FetchedMpt {
    _id: string;
    title: string;
    questionText?: string;
    modelAnswer?: string;
    pdfUrl?: string;
}

export default function StudentCoursePlayerPage() {
    const params = useParams();
    const courseId = params?.id as string;

    const [rootCourse, setRootCourse] = useState<CourseNode | null>(null);
    const [activeNode, setActiveNode] = useState<CourseNode | null>(null);
    const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'prelims' | 'mains' | 'help'>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});

    // In-place Quiz States
    const [quizData, setQuizData] = useState<FetchedQuiz | null>(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    // In-place Mains States
    const [mptData, setMptData] = useState<FetchedMpt | null>(null);
    const [mptLoading, setMptLoading] = useState(false);
    const [mainsAnswerText, setMainsAnswerText] = useState('');
    const [mainsSubmitted, setMainsSubmitted] = useState(false);
    const [showModelAnswer, setShowModelAnswer] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Help State
    const [doubtText, setDoubtText] = useState('');
    const [doubtSubmitted, setDoubtSubmitted] = useState(false);

    useEffect(() => {
        if (courseId) {
            fetchCourseTree();
        }
    }, [courseId]);

    // Timer effect for Mains practice
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev + 1);
            }, 1000);
        } else if (!isTimerRunning && timerSeconds !== 0 && interval) {
            clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, timerSeconds]);

    const fetchCourseTree = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/courses/tree/${courseId}`);
            const data = await res.json();
            if (data.success) {
                setRootCourse(data.data);
                const firstLecture = findFirstLecture(data.data);
                if (firstLecture) {
                    setActiveNode(firstLecture);
                } else {
                    setActiveNode(data.data);
                }
                // Auto expand root children
                if (data.data?.children) {
                    const expandedMap: Record<string, boolean> = { [data.data._id]: true };
                    data.data.children.forEach((c: CourseNode) => {
                        expandedMap[c._id] = true;
                    });
                    setExpandedNodeIds(expandedMap);
                }
            }
        } catch (err) {
            console.error('Failed to fetch course tree for student:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const findFirstLecture = (node: CourseNode): CourseNode | null => {
        if (node.level === 'subtopic' || (node.videos && node.videos.length > 0)) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const found = findFirstLecture(child);
                if (found) return found;
            }
        }
        return null;
    };

    const getEmbedUrl = (provider: VideoProviderType = 'youtube', url: string = '') => {
        if (!url) return '';
        if (provider === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = '';
            if (url.includes('v=')) {
                videoId = url.split('v=')[1]?.split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            } else if (url.includes('embed/')) {
                videoId = url.split('embed/')[1]?.split('?')[0];
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
        }
        return url;
    };

    // Extract videos for active node (with fallback to legacy contentTabs)
    const nodeVideos: VideoItem[] = (activeNode?.videos && activeNode.videos.length > 0)
        ? activeNode.videos
        : activeNode?.contentTabs
        ? [{
            title: activeNode.title,
            videoProvider: activeNode.contentTabs.find((t: any) => t.type === 'video')?.videoProvider || 'youtube',
            videoUrl: activeNode.contentTabs.find((t: any) => t.type === 'video')?.videoUrl || '',
            notesText: activeNode.contentTabs.find((t: any) => t.type === 'notes')?.notesText || '',
            pdfFiles: activeNode.contentTabs.find((t: any) => t.type === 'notes')?.pdfUrl
                ? [{ title: 'Notes PDF', pdfUrl: activeNode.contentTabs.find((t: any) => t.type === 'notes').pdfUrl }]
                : [],
            prelimsQuizId: activeNode.contentTabs.find((t: any) => t.type === 'test')?.testId || '',
            mainsQuestionText: activeNode.contentTabs.find((t: any) => t.type === 'mains')?.mainsQuestionText || '',
            mainsModelAnswer: activeNode.contentTabs.find((t: any) => t.type === 'mains')?.mainsModelAnswer || '',
            helpContactInfo: activeNode.contentTabs.find((t: any) => t.type === 'help')?.helpContactInfo || '',
            faqs: [],
        }]
        : [];

    const activeVideo: VideoItem | null = nodeVideos[activeVideoIndex] || nodeVideos[0] || null;

    // Fetch quiz when active video changes or prelims tab is selected
    useEffect(() => {
        if (activeVideo?.prelimsQuizId) {
            setQuizLoading(true);
            setQuizSubmitted(false);
            setSelectedAnswers({});
            fetch(`${API_URL}/api/quizzes/${activeVideo.prelimsQuizId}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && data.data) {
                        setQuizData(data.data);
                    } else {
                        setQuizData(null);
                    }
                })
                .catch((err) => {
                    console.error('Fetch quiz error:', err);
                    setQuizData(null);
                })
                .finally(() => setQuizLoading(false));
        } else {
            setQuizData(null);
        }
    }, [activeVideo?.prelimsQuizId, activeNode?._id, activeVideoIndex]);

    // Fetch Mains Practice Test when active video changes or mains tab is selected
    useEffect(() => {
        if (activeVideo?.mainsPracticeTestId) {
            setMptLoading(true);
            setMainsSubmitted(false);
            setMainsAnswerText('');
            setShowModelAnswer(false);
            fetch(`${API_URL}/api/mpt/${activeVideo.mainsPracticeTestId}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && data.data) {
                        setMptData(data.data);
                    } else {
                        setMptData(null);
                    }
                })
                .catch((err) => {
                    console.error('Fetch MPT error:', err);
                    setMptData(null);
                })
                .finally(() => setMptLoading(false));
        } else {
            setMptData(null);
        }
    }, [activeVideo?.mainsPracticeTestId, activeNode?._id, activeVideoIndex]);

    // Visibility flags (HIDDEN if unconfigured for active video)
    const hasNotes = Boolean(activeVideo?.notesText?.trim() || (activeVideo?.pdfFiles && activeVideo.pdfFiles.length > 0));
    const hasPrelims = Boolean(activeVideo?.prelimsQuizId || activeVideo?.prelimsDiscussionVideoUrl?.trim() || quizData);
    const hasMains = Boolean(activeVideo?.mainsQuestionText?.trim() || activeVideo?.mainsPracticeTestId || activeVideo?.mainsDiscussionVideoUrl?.trim() || mptData);
    const hasHelp = Boolean(activeVideo?.helpContactInfo?.trim() || (activeVideo?.faqs && activeVideo.faqs.length > 0));

    // Lock flags
    const isPracticeLocked = activeNode?.isPracticeLocked || false;
    const isHelpLocked = activeNode?.isHelpLocked || false;
    const isNodeLocked = activeNode?.isLocked || false;

    const toggleNodeExpand = (nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedNodeIds((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    // Calculate score for Prelims quiz
    const calculateQuizScore = () => {
        if (!quizData?.questions) return { correct: 0, incorrect: 0, total: 0, score: 0 };
        let correct = 0;
        let incorrect = 0;
        quizData.questions.forEach((q, idx) => {
            if (selectedAnswers[idx] !== undefined) {
                if (selectedAnswers[idx] === q.correctOptionIndex) {
                    correct++;
                } else {
                    incorrect++;
                }
            }
        });
        const score = correct * 2 - incorrect * 0.66;
        return { correct, incorrect, total: quizData.questions.length, score: Math.max(0, parseFloat(score.toFixed(2))) };
    };

    const renderTreeAccordion = (nodes: CourseNode[], depth = 0) => {
        return nodes.map((node) => {
            const isActiveNode = activeNode?._id === node._id;
            const isExpanded = expandedNodeIds[node._id] ?? (depth < 2 || isActiveNode);
            const hasChildren = node.children && node.children.length > 0;
            const videos = node.videos || [];

            return (
                <div key={node._id} className="select-none mb-1">
                    {/* Node Header Row */}
                    <div
                        onClick={() => {
                            setActiveNode(node);
                            setActiveVideoIndex(0);
                            setActiveTab('overview');
                            setShowModelAnswer(false);
                            setDoubtSubmitted(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer group ${
                            isActiveNode
                                ? 'bg-[#1E3A5F] text-amber-300 font-bold shadow-xs'
                                : 'hover:bg-slate-100 text-slate-800'
                        }`}
                        style={{ paddingLeft: `${depth * 14 + 10}px` }}
                    >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            {hasChildren ? (
                                <button
                                    onClick={(e) => toggleNodeExpand(node._id, e)}
                                    className="text-slate-400 hover:text-slate-700 text-xs px-1"
                                >
                                    {isExpanded ? '▼' : '▶'}
                                </button>
                            ) : (
                                <span className="text-xs">
                                    {node.level === 'subject' && '📘'}
                                    {node.level === 'topic' && '📁'}
                                    {node.level === 'subtopic' && '🎥'}
                                </span>
                            )}
                            <span className="truncate">{node.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {videos.length > 0 && (
                                <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                        isActiveNode ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                                </span>
                            )}
                            {node.isLocked && <span className="text-xs">🔒</span>}
                        </div>
                    </div>

                    {/* Sub-list of Videos under this specific node */}
                    {isExpanded && videos.length > 0 && (
                        <div className="mt-1 space-y-1" style={{ paddingLeft: `${depth * 14 + 24}px` }}>
                            {videos.map((vid, vidIdx) => {
                                const isSelectedVid = isActiveNode && activeVideoIndex === vidIdx;
                                return (
                                    <div
                                        key={vidIdx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveNode(node);
                                            setActiveVideoIndex(vidIdx);
                                            setActiveTab('overview');
                                            setShowModelAnswer(false);
                                            setDoubtSubmitted(false);
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                                            isSelectedVid
                                                ? 'bg-amber-100 text-[#1E3A5F] font-bold border border-amber-300'
                                                : 'hover:bg-slate-100 text-slate-600 bg-white border border-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className={isSelectedVid ? 'text-[#1E3A5F]' : 'text-slate-400'}>
                                                ▶ #{vidIdx + 1}
                                            </span>
                                            <span className="truncate">{vid.title || `Lecture Video ${vidIdx + 1}`}</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {vid.videoProvider === 'bunny' && (
                                                <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1 rounded">
                                                    Bunny
                                                </span>
                                            )}
                                            {(vid.notesText || vid.pdfFiles?.length > 0) && (
                                                <span title="Has Notes">📄</span>
                                            )}
                                            {(vid.prelimsQuizId || vid.prelimsDiscussionVideoUrl) && (
                                                <span title="Has Prelims Practice">📝</span>
                                            )}
                                            {(vid.mainsQuestionText || vid.mainsPracticeTestId) && (
                                                <span title="Has Mains Practice">✍️</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Nested Child Nodes */}
                    {isExpanded && hasChildren && (
                        <div className="mt-0.5">{renderTreeAccordion(node.children!, depth + 1)}</div>
                    )}
                </div>
            );
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-slate-900">
            {/* Header Navbar */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                <div className="flex items-center gap-3">
                    <Link
                        href="/courses"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                        ← Back to Courses
                    </Link>
                    <span className="text-slate-300">|</span>
                    <h1 className="text-base sm:text-lg font-serif font-bold text-slate-900 truncate">
                        {rootCourse?.title}
                    </h1>
                </div>
            </div>

            {/* Main 2-Column Layout */}
            <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Sidebar: Course Index & Lecture List */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-[780px] flex flex-col">
                    <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-serif font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                            📚 Course Index &amp; Lectures
                        </h2>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                            Live List
                        </span>
                    </div>

                    {/* Tree Hierarchy with Video Lists */}
                    <div className="flex-1 overflow-y-auto space-y-1 pt-3 pr-1">
                        {rootCourse?.children && rootCourse.children.length > 0 ? (
                            renderTreeAccordion(rootCourse.children)
                        ) : rootCourse?.videos && rootCourse.videos.length > 0 ? (
                            renderTreeAccordion([rootCourse])
                        ) : (
                            <p className="text-xs text-slate-400 p-4 text-center">No modules or videos published yet.</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Player & Dynamic Action Tabs */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Multiple Videos Playlist Bar (If > 1 Video under active node) */}
                    {nodeVideos.length > 1 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-2 overflow-x-auto">
                            <span className="text-xs font-bold text-[#1E3A5F] px-2 flex items-center gap-1 flex-shrink-0">
                                🎬 Playlist ({nodeVideos.length}):
                            </span>
                            {nodeVideos.map((v, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setActiveVideoIndex(idx);
                                        setActiveTab('overview');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                        activeVideoIndex === idx
                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    <span>▶ #{idx + 1}:</span>
                                    <span className="truncate max-w-[140px]">{v.title || `Video ${idx + 1}`}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Main Video Player Container */}
                    <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative flex items-center justify-center">
                        {isNodeLocked ? (
                            <div className="text-center p-8 text-white max-w-md">
                                <div className="text-5xl mb-3">🔒</div>
                                <h3 className="text-lg font-bold text-amber-400 mb-2">Lecture Node Locked</h3>
                                <p className="text-xs text-slate-300">
                                    This lecture is currently locked by admin or requires prerequisite completion.
                                </p>
                            </div>
                        ) : activeVideo?.videoUrl ? (
                            <iframe
                                src={getEmbedUrl(activeVideo.videoProvider, activeVideo.videoUrl)}
                                title={activeVideo.title || 'Video Player'}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="text-center p-8 text-white">
                                <div className="text-5xl mb-3">📹</div>
                                <h3 className="text-base font-bold text-slate-200 mb-1">No Video Stream Attached</h3>
                                <p className="text-xs text-slate-400">
                                    Select another video from the index or explore notes/practice tabs below.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Action Tabs Container */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-slate-100">
                            {/* Overview Tab (Always Visible) */}
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'overview'
                                        ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                📹 Overview
                            </button>

                            {/* Notes Tab */}
                            {hasNotes && (
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === 'notes'
                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    📄 Lecture Notes {activeVideo?.pdfFiles?.length ? `(${activeVideo.pdfFiles.length} PDFs)` : ''}
                                </button>
                            )}

                            {/* Prelims Practice Tab */}
                            {hasPrelims && (
                                <button
                                    onClick={() => setActiveTab('prelims')}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === 'prelims'
                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    📝 Prelims Practice {isPracticeLocked && '🔒'}
                                </button>
                            )}

                            {/* Mains Practice Tab */}
                            {hasMains && (
                                <button
                                    onClick={() => setActiveTab('mains')}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === 'mains'
                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    ✍️ Mains Practice {isPracticeLocked && '🔒'}
                                </button>
                            )}

                            {/* Help Tab */}
                            {hasHelp && (
                                <button
                                    onClick={() => setActiveTab('help')}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === 'help'
                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    ❓ Ask Doubt &amp; FAQs {isHelpLocked && '🔒'}
                                </button>
                            )}
                        </div>

                        {/* OVERVIEW TAB CONTENT */}
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-serif font-bold text-slate-900">
                                        {activeVideo?.title || activeNode?.title}
                                    </h2>
                                    {activeVideo?.videoProvider === 'bunny' && (
                                        <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-1 rounded-md">
                                            ⚡ Powered by Bunny.net
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {activeVideo?.description || activeNode?.description || 'No detailed description provided for this video.'}
                                </p>
                            </div>
                        )}

                        {/* NOTES TAB CONTENT */}
                        {activeTab === 'notes' && hasNotes && (
                            <div className="space-y-5">
                                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                    📄 Study Notes &amp; Handouts
                                </h3>
                                {activeVideo?.notesText && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                                        {activeVideo.notesText}
                                    </div>
                                )}
                                {activeVideo?.pdfFiles && activeVideo.pdfFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Download Handouts ({activeVideo.pdfFiles.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {activeVideo.pdfFiles.map((pdf, pIdx) => (
                                                <a
                                                    key={pIdx}
                                                    href={pdf.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all group"
                                                >
                                                    <span className="text-xs font-semibold text-slate-800 group-hover:text-[#1E3A5F] truncate">
                                                        📄 {pdf.title || `Handout PDF #${pIdx + 1}`}
                                                    </span>
                                                    <span className="text-xs text-amber-600 font-bold ml-2">Download ↗</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PRELIMS PRACTICE TAB CONTENT (RUNS IN-PLACE) */}
                        {activeTab === 'prelims' && hasPrelims && (
                            <div className="space-y-6">
                                {/* Optional Discussion Video for Prelims */}
                                {activeVideo?.prelimsDiscussionVideoUrl && (
                                    <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                            🎬 Prelims Question Discussion &amp; Strategy Video
                                        </h4>
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden max-h-[300px]">
                                            <iframe
                                                src={getEmbedUrl(activeVideo.prelimsDiscussionVideoProvider, activeVideo.prelimsDiscussionVideoUrl)}
                                                title="Prelims Discussion Video"
                                                className="w-full h-full border-0"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                )}

                                {isPracticeLocked ? (
                                    /* Frozen / Locked State for Prelims */
                                    <div className="bg-amber-50 rounded-xl border border-amber-300 p-6 text-center">
                                        <div className="text-4xl mb-2">🔒</div>
                                        <h3 className="text-base font-bold text-amber-900 mb-1">
                                            Prelims Practice Section Frozen
                                        </h3>
                                        <p className="text-xs text-amber-800 max-w-lg mx-auto">
                                            This Prelims Practice test is currently locked by Admin. You can view discussion video and details, but test taking is disabled until unlocked.
                                        </p>
                                    </div>
                                ) : (
                                    /* Active State for Prelims: RUNS IN-PLACE WITHOUT LEAVING PAGE */
                                    <div className="space-y-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                            <div>
                                                <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                                                    📝 Prelims Multiple Choice Test (In-Place)
                                                </h3>
                                                <p className="text-xs text-slate-600">
                                                    {quizData?.title || 'Lecture Practice Quiz'}
                                                </p>
                                            </div>
                                            {quizSubmitted && (
                                                <div className="bg-[#1E3A5F] text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl">
                                                    Score: {calculateQuizScore().score} / {calculateQuizScore().total * 2}
                                                </div>
                                            )}
                                        </div>

                                        {quizLoading ? (
                                            <div className="flex justify-center p-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                                            </div>
                                        ) : quizData?.questions && quizData.questions.length > 0 ? (
                                            <div className="space-y-6">
                                                {quizData.questions.map((q, qIdx) => {
                                                    const isSelected = selectedAnswers[qIdx] !== undefined;
                                                    const isCorrect = isSelected && selectedAnswers[qIdx] === q.correctOptionIndex;

                                                    return (
                                                        <div
                                                            key={qIdx}
                                                            className={`p-4 rounded-xl border transition-all ${
                                                                quizSubmitted
                                                                    ? isCorrect
                                                                        ? 'bg-green-50/70 border-green-300'
                                                                        : isSelected
                                                                        ? 'bg-red-50/70 border-red-300'
                                                                        : 'bg-white border-slate-200'
                                                                    : 'bg-white border-slate-200 shadow-2xs'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                                <span className="font-bold text-xs bg-[#1E3A5F] text-white px-2 py-1 rounded-md flex-shrink-0">
                                                                    Q{qIdx + 1}
                                                                </span>
                                                                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug flex-1">
                                                                    {q.questionText}
                                                                </h4>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    2 Marks
                                                                </span>
                                                            </div>

                                                            {/* Option Choices */}
                                                            <div className="space-y-2 mt-3">
                                                                {q.options.map((opt, optIdx) => {
                                                                    const optionLetter = String.fromCharCode(65 + optIdx);
                                                                    const isUserChoice = selectedAnswers[qIdx] === optIdx;
                                                                    const isRightOption = q.correctOptionIndex === optIdx;

                                                                    let btnStyle = 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200';
                                                                    if (quizSubmitted) {
                                                                        if (isRightOption) {
                                                                            btnStyle = 'bg-green-600 text-white font-bold border-green-600';
                                                                        } else if (isUserChoice && !isRightOption) {
                                                                            btnStyle = 'bg-red-600 text-white font-bold border-red-600';
                                                                        }
                                                                    } else if (isUserChoice) {
                                                                        btnStyle = 'bg-[#1E3A5F] text-amber-300 font-bold border-[#1E3A5F] shadow-xs';
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={optIdx}
                                                                            disabled={quizSubmitted}
                                                                            onClick={() =>
                                                                                setSelectedAnswers((prev) => ({
                                                                                    ...prev,
                                                                                    [qIdx]: optIdx,
                                                                                }))
                                                                            }
                                                                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border flex items-center justify-between ${btnStyle}`}
                                                                        >
                                                                            <span className="flex items-center gap-2">
                                                                                <span className="font-bold opacity-80">
                                                                                    ({optionLetter})
                                                                                </span>
                                                                                <span>{opt}</span>
                                                                            </span>
                                                                            {quizSubmitted && isRightOption && (
                                                                                <span className="text-xs">✓ Correct</span>
                                                                            )}
                                                                            {quizSubmitted && isUserChoice && !isRightOption && (
                                                                                <span className="text-xs">✗ Incorrect</span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Answer Explanation */}
                                                            {quizSubmitted && q.explanation && (
                                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                                                                    <strong>Explanation:</strong> {q.explanation}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Submit / Reset Actions */}
                                                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                                    {!quizSubmitted ? (
                                                        <button
                                                            onClick={() => setQuizSubmitted(true)}
                                                            disabled={Object.keys(selectedAnswers).length === 0}
                                                            className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#152C4A] disabled:opacity-50 text-amber-300 font-bold text-xs rounded-xl shadow-sm transition-colors"
                                                        >
                                                            Submit Prelims Test &amp; Check Score ↗
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    setQuizSubmitted(false);
                                                                    setSelectedAnswers({});
                                                                }}
                                                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
                                                            >
                                                                🔄 Retake Quiz
                                                            </button>
                                                            <span className="text-xs text-slate-600 font-semibold">
                                                                Correct: {calculateQuizScore().correct} | Incorrect: {calculateQuizScore().incorrect}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Conceptual Practice Questions fallback if no Quiz ID attached */
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white rounded-xl border border-slate-200">
                                                    <h4 className="text-xs font-bold text-slate-900 mb-2">
                                                        Sample Practice Question
                                                    </h4>
                                                    <p className="text-xs text-slate-700 mb-3">
                                                        With reference to the Indian Constitution, consider the following statements regarding fundamental rights and judicial review...
                                                    </p>
                                                    <div className="space-y-1.5 text-xs text-slate-600">
                                                        <p>1. Judicial review is a basic feature of the Constitution.</p>
                                                        <p>2. Right to Constitutional Remedies cannot be suspended under any circumstances.</p>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 mt-3">Which of the above statements is/are correct?</p>
                                                </div>
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold">
                                                    💡 Practice questions loaded directly in-place. Select options to verify your concept mastery!
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MAINS PRACTICE TAB CONTENT (RUNS IN-PLACE) */}
                        {activeTab === 'mains' && hasMains && (
                            <div className="space-y-6">
                                {/* Optional Discussion Video for Mains */}
                                {activeVideo?.mainsDiscussionVideoUrl && (
                                    <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                            🎬 Mains Answer Writing Discussion Video
                                        </h4>
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden max-h-[300px]">
                                            <iframe
                                                src={getEmbedUrl(activeVideo.mainsDiscussionVideoProvider, activeVideo.mainsDiscussionVideoUrl)}
                                                title="Mains Discussion Video"
                                                className="w-full h-full border-0"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                )}

                                {isPracticeLocked ? (
                                    /* Frozen / Locked State for Mains */
                                    <div className="bg-amber-50 rounded-xl border border-amber-300 p-6 text-center">
                                        <div className="text-4xl mb-2">🔒</div>
                                        <h3 className="text-base font-bold text-amber-900 mb-1">
                                            Mains Practice Section Frozen
                                        </h3>
                                        <p className="text-xs text-amber-800 max-w-lg mx-auto mb-4">
                                            This Mains Practice question is locked by Admin. Answer submission is disabled.
                                        </p>
                                        {(activeVideo?.mainsQuestionText || mptData?.questionText) && (
                                            <div className="p-4 bg-white/80 rounded-lg text-left text-xs text-slate-800 border border-amber-200">
                                                <strong>Question Preview:</strong> {activeVideo?.mainsQuestionText || mptData?.questionText}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Active State for Mains: RUNS IN-PLACE WITHOUT LEAVING PAGE */
                                    <div className="space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                            <div>
                                                <h3 className="font-serif font-bold text-slate-900 text-base">
                                                    ✍️ Mains Answer Writing Workspace (In-Place)
                                                </h3>
                                                <p className="text-xs text-slate-600">
                                                    Type your structured response or upload answer PDF below.
                                                </p>
                                            </div>

                                            {/* In-place Timer Tool */}
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                                                <span className="font-bold text-[#1E3A5F]">
                                                    ⏱️ {Math.floor(timerSeconds / 60)}:{('0' + (timerSeconds % 60)).slice(-2)}
                                                </span>
                                                <button
                                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold"
                                                >
                                                    {isTimerRunning ? 'Pause' : 'Start'}
                                                </button>
                                            </div>
                                        </div>

                                        {mptLoading ? (
                                            <div className="flex justify-center p-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Mains Question Box */}
                                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                                    <div className="flex items-center justify-between text-xs font-bold text-amber-600 mb-1">
                                                        <span>QUESTION FOR PRACTICE</span>
                                                        <span>15 Marks | 250 Words</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                                                        {activeVideo?.mainsQuestionText || mptData?.questionText || mptData?.title || 'Discuss the key structural features and constitutional provisions governing center-state financial relations in India. (250 words)'}
                                                    </p>
                                                </div>

                                                {/* In-place Answer Writing Editor */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-xs font-semibold text-slate-700">
                                                            Write your answer draft / points:
                                                        </label>
                                                        <span className="text-xs text-slate-500 font-bold">
                                                            Word count: {mainsAnswerText.trim() ? mainsAnswerText.trim().split(/\s+/).length : 0} / 250
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        rows={6}
                                                        value={mainsAnswerText}
                                                        onChange={(e) => setMainsAnswerText(e.target.value)}
                                                        className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A5F] bg-white leading-relaxed"
                                                        placeholder="Structure introduction, body points, and conclusion..."
                                                    />
                                                </div>

                                                {/* Submission & Model Answer Actions */}
                                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                                    {!mainsSubmitted ? (
                                                        <button
                                                            onClick={() => {
                                                                if (mainsAnswerText.trim()) {
                                                                    setMainsSubmitted(true);
                                                                    setIsTimerRunning(false);
                                                                }
                                                            }}
                                                            disabled={!mainsAnswerText.trim()}
                                                            className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#152C4A] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                                                        >
                                                            Submit Answer for Evaluation ↗
                                                        </button>
                                                    ) : (
                                                        <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                                                            <span>✅ Answer submitted successfully! Model answer framework is now unlocked.</span>
                                                        </div>
                                                    )}

                                                    {(activeVideo?.mainsModelAnswer || mptData?.modelAnswer || mainsSubmitted) && (
                                                        <button
                                                            onClick={() => setShowModelAnswer(!showModelAnswer)}
                                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
                                                        >
                                                            {showModelAnswer ? 'Hide Model Answer' : 'Show Model Answer Framework 🔑'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Unlocked Model Answer Display */}
                                                {showModelAnswer && (
                                                    <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-xs text-green-950 space-y-2 leading-relaxed">
                                                        <h4 className="font-bold text-green-900 text-xs uppercase tracking-wider">
                                                            🔑 Official Model Answer Framework &amp; Points:
                                                        </h4>
                                                        <div className="whitespace-pre-line">
                                                            {activeVideo?.mainsModelAnswer || mptData?.modelAnswer || '1. Introduction: Briefly define Article 268-293 governing financial relations.\n2. Body Paragraph 1: Tax distribution under Finance Commission recommendations.\n3. Body Paragraph 2: Grants-in-aid (Article 275 and 282).\n4. Conclusion: Highlight cooperative federalism and GST Council role.'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* HELP TAB CONTENT */}
                        {activeTab === 'help' && hasHelp && (
                            <div className="space-y-6">
                                {/* FAQ Accordion Section */}
                                {activeVideo?.faqs && activeVideo.faqs.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Frequently Asked Questions (FAQs)
                                        </h4>
                                        <div className="space-y-2">
                                            {activeVideo.faqs.map((faq, fIdx) => (
                                                <details key={fIdx} className="group bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                                                    <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                                                        <span>❓ {faq.question}</span>
                                                        <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                                                    </summary>
                                                    <p className="mt-2 pt-2 border-t border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line">
                                                        {faq.answer}
                                                    </p>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {isHelpLocked ? (
                                    /* Frozen / Locked State for Help */
                                    <div className="bg-amber-50 rounded-xl border border-amber-300 p-6 text-center">
                                        <div className="text-4xl mb-2">🔒</div>
                                        <h3 className="text-base font-bold text-amber-900 mb-1">
                                            Help &amp; Doubt Resolution Frozen
                                        </h3>
                                        <p className="text-xs text-amber-800 max-w-lg mx-auto">
                                            The doubt resolution form for this video is currently frozen by Admin. You can view FAQs above.
                                        </p>
                                    </div>
                                ) : (
                                    /* Active State for Help */
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-900 text-base">
                                            ❓ Ask Doubt &amp; Academic Support
                                        </h3>
                                        {activeVideo?.helpContactInfo && (
                                            <p className="text-xs text-slate-600">{activeVideo.helpContactInfo}</p>
                                        )}

                                        {doubtSubmitted ? (
                                            <div className="p-4 bg-green-100 border border-green-300 text-green-800 rounded-xl text-xs font-semibold">
                                                ✅ Your doubt has been submitted to the academic team. You will be notified when mentor replies.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <textarea
                                                    value={doubtText}
                                                    onChange={(e) => setDoubtText(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A5F]"
                                                    placeholder="Type your question or query regarding this video..."
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (doubtText.trim()) setDoubtSubmitted(true);
                                                    }}
                                                    className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-semibold rounded-xl shadow-sm"
                                                >
                                                    Submit Doubt to Mentor
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
