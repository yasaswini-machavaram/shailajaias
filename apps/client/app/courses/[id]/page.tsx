'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

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
    questionText?: string;
    question?: string; // API alias fallback
    options: string[];
    correctOptionIndex?: number;
    correctIndex?: number; // API alias fallback
    explanation?: string;
    subject?: string;
}

interface FetchedQuiz {
    _id: string;
    title: string;
    description?: string;
    questions: QuizQuestion[];
}

interface MainsQuestionItem {
    _id?: string;
    questionText: string;
    difficultyLevel?: 'Easy' | 'Moderate' | 'Difficult';
    marks?: number;
    wordLimit?: number;
    topicTags?: string[];
    approach?: string;
    modelAnswer: string;
}

interface FetchedMpt {
    _id: string;
    title: string;
    subjectCategory?: string;
    questions?: MainsQuestionItem[];
    questionText?: string;
    modelAnswer?: string;
    pdfUrl?: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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

function getSubjectStyles(subjectName: string = '') {
    const name = subjectName.toLowerCase();
    if (name.includes('polity')) {
        return { bg: 'bg-blue-50/70 border-blue-200', badge: 'bg-blue-100 text-blue-800' };
    } else if (name.includes('economy')) {
        return { bg: 'bg-green-50/70 border-green-200', badge: 'bg-green-100 text-green-800' };
    } else if (name.includes('env') || name.includes('ecology')) {
        return { bg: 'bg-teal-50/70 border-teal-200', badge: 'bg-teal-100 text-teal-800' };
    } else if (name.includes('hist') || name.includes('culture')) {
        return { bg: 'bg-rose-50/70 border-rose-200', badge: 'bg-rose-100 text-rose-800' };
    } else if (name.includes('geography')) {
        return { bg: 'bg-amber-50/70 border-amber-200', badge: 'bg-amber-100 text-amber-800' };
    }
    return { bg: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-800' };
}

export default function StudentCoursePlayerPage() {
    const params = useParams();
    const courseId = params?.id as string;

    const [rootCourse, setRootCourse] = useState<CourseNode | null>(null);
    const [activeNode, setActiveNode] = useState<CourseNode | null>(null);
    const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'practice' | 'help'>('overview');
    const [practiceSubTab, setPracticeSubTab] = useState<'prelims' | 'mains'>('prelims');
    const [isLoading, setIsLoading] = useState(true);
    const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});

    // In-place Prelims Quiz States (matching Prelims Practice Test UI)
    const [quizData, setQuizData] = useState<FetchedQuiz | null>(null);
    const [quizLoading, setQuizLoading] = useState<boolean>(false);
    const [learnMode, setLearnMode] = useState<boolean>(true); // Mode toggle: Learn vs Test
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0); // Horizontal single-question index

    // In-place Mains Test States (matching Mains Practice Test Accordion UI)
    const [mptData, setMptData] = useState<FetchedMpt | null>(null);
    const [mptLoading, setMptLoading] = useState(false);
    const [mainsExpandedIndices, setMainsExpandedIndices] = useState<number[]>([0]); // Accordion state (Q1 expanded by default)
    const [mainsAnswersText, setMainsAnswersText] = useState<Record<number, string>>({});
    const [mainsSubmittedMap, setMainsSubmittedMap] = useState<Record<number, boolean>>({});
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const { user, token, isLoggedIn } = useStudentAuth();

    // Help & Doubt Submission State
    const [doubtText, setDoubtText] = useState('');
    const [doubtSubmitted, setDoubtSubmitted] = useState(false);
    const [isSubmittingDoubt, setIsSubmittingDoubt] = useState(false);
    const [doubtError, setDoubtError] = useState('');

    // Doubt Screenshot attachment state
    const [doubtFile, setDoubtFile] = useState<File | null>(null);
    const [doubtImagePreview, setDoubtImagePreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Doubt tracking state inside Help tab
    const [userDoubts, setUserDoubts] = useState<any[]>([]);
    const [userDoubtsLoading, setUserDoubtsLoading] = useState<boolean>(false);
    const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
    const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setDoubtFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setDoubtImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearDoubtFile = () => {
        setDoubtFile(null);
        setDoubtImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Fetch student's doubts for tracking
    const fetchUserDoubts = async () => {
        if (!isLoggedIn || !token) return;
        setUserDoubtsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/doubts?_t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setUserDoubts(data.data);
            }
        } catch (err) {
            console.error('Fetch user doubts error:', err);
        } finally {
            setUserDoubtsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'help' && isLoggedIn && token) {
            fetchUserDoubts();
        }
    }, [activeTab, isLoggedIn, token]);

    const handleDoubtSubmit = async () => {
        if (!doubtText.trim()) return;
        if (!isLoggedIn || !token) {
            setDoubtError('Please sign in to submit your doubt to mentor.');
            return;
        }
        setIsSubmittingDoubt(true);
        setDoubtError('');
        try {
            let uploadedImageUrl = '';
            if (doubtFile) {
                const formData = new FormData();
                formData.append('file', doubtFile);
                const uploadRes = await fetch(`${API_URL}/api/upload/image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.data?.url) {
                    uploadedImageUrl = uploadData.data.url;
                }
            }

            const payload = {
                subject: activeNode?.title || rootCourse?.title || 'Course Doubt',
                title: activeVideo?.title ? `Doubt on: ${activeVideo.title}` : `Lecture Doubt: ${activeNode?.title || 'General'}`,
                description: doubtText.trim(),
                testItemTitle: activeVideo?.title || activeNode?.title || undefined,
                imageUrl: uploadedImageUrl || undefined,
            };

            const res = await fetch(`${API_URL}/api/doubts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setDoubtSubmitted(true);
                setDoubtText('');
                clearDoubtFile();
                fetchUserDoubts(); // Refresh tracked doubts list
            } else {
                setDoubtError(data.message || 'Failed to submit doubt.');
            }
        } catch (err) {
            console.error('Submit doubt error:', err);
            setDoubtError('Failed to submit doubt. Please check your network connection.');
        } finally {
            setIsSubmittingDoubt(false);
        }
    };

    const handleSendReply = async (doubtId: string) => {
        const text = replyTexts[doubtId]?.trim();
        if (!text || !token) return;
        setSubmittingReplyId(doubtId);
        try {
            const res = await fetch(`${API_URL}/api/doubts/${doubtId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if (data.success) {
                setReplyTexts((prev) => ({ ...prev, [doubtId]: '' }));
                fetchUserDoubts();
            }
        } catch (err) {
            console.error('Send reply error:', err);
        } finally {
            setSubmittingReplyId(null);
        }
    };

    const handleResolveDoubt = async (doubtId: string) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/doubts/${doubtId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'resolved' })
            });
            const data = await res.json();
            if (data.success) {
                fetchUserDoubts();
            }
        } catch (err) {
            console.error('Resolve doubt error:', err);
        }
    };

    useEffect(() => {
        if (courseId) {
            fetchCourseTree();
        }
    }, [courseId]);

    // Timer effect for Mains answer writing
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

    // Fetch quiz when active video changes
    useEffect(() => {
        if (activeVideo?.prelimsQuizId) {
            setQuizLoading(true);
            setQuizSubmitted(false);
            setSelectedAnswers({});
            setCurrentQuestionIdx(0);
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
            setCurrentQuestionIdx(0);
        }
    }, [activeVideo?.prelimsQuizId, activeNode?._id, activeVideoIndex]);

    // Fetch Mains Practice Test when active video changes
    useEffect(() => {
        if (activeVideo?.mainsPracticeTestId) {
            setMptLoading(true);
            setMainsAnswersText({});
            setMainsSubmittedMap({});
            setMainsExpandedIndices([0]); // Expand Q1 by default
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
            setMainsExpandedIndices([0]);
        }
    }, [activeVideo?.mainsPracticeTestId, activeNode?._id, activeVideoIndex]);

    // Visibility flags
    const hasNotes = Boolean(activeVideo?.notesText?.trim() || (activeVideo?.pdfFiles && activeVideo.pdfFiles.length > 0));
    const hasPrelims = Boolean(activeVideo?.prelimsQuizId || activeVideo?.prelimsDiscussionVideoUrl?.trim() || quizData);
    const hasMains = Boolean(activeVideo?.mainsQuestionText?.trim() || activeVideo?.mainsPracticeTestId || activeVideo?.mainsDiscussionVideoUrl?.trim() || mptData);
    const hasPractice = hasPrelims || hasMains;
    const hasHelp = Boolean(activeVideo?.helpContactInfo?.trim() || (activeVideo?.faqs && activeVideo.faqs.length > 0));

    const effectiveSubTab = hasPrelims && (!hasMains || practiceSubTab === 'prelims') ? 'prelims' : 'mains';

    // Lock flags
    const isPracticeLocked = activeNode?.isPracticeLocked || false;
    const isHelpLocked = activeNode?.isHelpLocked || false;
    const isNodeLocked = activeNode?.isLocked || false;

    const toggleNodeExpand = (nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedNodeIds((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    // Mains Accordion toggle helper
    const toggleMainsAccordion = (qIdx: number) => {
        setMainsExpandedIndices((prev) =>
            prev.includes(qIdx) ? prev.filter((i) => i !== qIdx) : [...prev, qIdx]
        );
    };

    const handleExpandAllMains = (totalCount: number) => {
        if (mainsExpandedIndices.length === totalCount) {
            setMainsExpandedIndices([]);
        } else {
            setMainsExpandedIndices(Array.from({ length: totalCount }, (_, i) => i));
        }
    };

    // Calculate score for Prelims quiz
    const calculateQuizScore = () => {
        if (!quizData?.questions) return { correct: 0, incorrect: 0, total: 0, score: 0 };
        let correct = 0;
        let incorrect = 0;
        quizData.questions.forEach((q, idx) => {
            const correctIdx = q.correctOptionIndex ?? q.correctIndex ?? 0;
            if (selectedAnswers[idx] !== undefined) {
                if (selectedAnswers[idx] === correctIdx) {
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

    // Prepare Mains questions list from fetched MPT or activeVideo fallback
    const mainsQuestionsList: MainsQuestionItem[] = (mptData?.questions && mptData.questions.length > 0)
        ? mptData.questions
        : activeVideo?.mainsQuestionText
        ? [{
            questionText: activeVideo.mainsQuestionText,
            difficultyLevel: 'Moderate',
            marks: 15,
            wordLimit: 250,
            topicTags: [activeNode?.title || 'Practice'],
            modelAnswer: activeVideo.mainsModelAnswer || 'No model answer provided yet.'
        }]
        : mptData?.questionText
        ? [{
            questionText: mptData.questionText,
            difficultyLevel: 'Moderate',
            marks: 15,
            wordLimit: 250,
            topicTags: ['Mains Practice'],
            modelAnswer: mptData.modelAnswer || 'No model answer provided yet.'
        }]
        : [];

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-slate-900 font-body">
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
                    {/* Multiple Videos Playlist Bar */}
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
                            {/* Overview Tab */}
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

                            {/* Practice Tab (Combined Prelims & Mains) */}
                            {hasPractice && (
                                <button
                                    onClick={() => {
                                        setActiveTab('practice');
                                        if (hasPrelims) setPracticeSubTab('prelims');
                                        else if (hasMains) setPracticeSubTab('mains');
                                    }}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === 'practice'
                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    📝 Practice {isPracticeLocked && '🔒'}
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

                        {/* COMBINED PRACTICE TAB CONTENT (PRELIMS & MAINS SUB-TABS) */}
                        {activeTab === 'practice' && hasPractice && (
                            <div className="space-y-6">
                                {/* Sub-tab Switcher if both Prelims and Mains are present */}
                                {hasPrelims && hasMains && (
                                    <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200">
                                        <button
                                            onClick={() => setPracticeSubTab('prelims')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                effectiveSubTab === 'prelims'
                                                    ? 'bg-[#1E3A5F] text-amber-300 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                            }`}
                                        >
                                            📝 Prelims Test
                                        </button>
                                        <button
                                            onClick={() => setPracticeSubTab('mains')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                effectiveSubTab === 'mains'
                                                    ? 'bg-[#1E3A5F] text-amber-300 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                            }`}
                                        >
                                            ✍️ Mains Test
                                        </button>
                                    </div>
                                )}

                                {/* PRELIMS SUB-TAB */}
                                {effectiveSubTab === 'prelims' && hasPrelims && (
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
                                    /* Active State for Prelims: MATCHING EXACT PRELIMS PRACTICE TEST UI */
                                    <div className="space-y-5">
                                        {/* Action Bar: Control Mode Switch & Score Overview */}
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                                                    📝 {quizData?.title || 'Prelims Practice Test'}
                                                </h3>
                                                <p className="text-xs text-slate-600">
                                                    {quizData?.questions?.length || 0} Multiple Choice Questions (+2 / -0.66)
                                                </p>
                                            </div>

                                            {/* Mode Toggle: Learn Mode vs Test Mode */}
                                            <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 text-xs">
                                                <button
                                                    onClick={() => setLearnMode(true)}
                                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                                        learnMode
                                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-xs'
                                                            : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                >
                                                    💡 Learn Mode
                                                </button>
                                                <button
                                                    onClick={() => setLearnMode(false)}
                                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                                        !learnMode
                                                            ? 'bg-[#1E3A5F] text-amber-300 shadow-xs'
                                                            : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                >
                                                    ⏱️ Test Mode
                                                </button>
                                            </div>
                                        </div>

                                        {quizLoading ? (
                                            <div className="flex justify-center p-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                                            </div>
                                        ) : quizData?.questions && quizData.questions.length > 0 ? (
                                            (() => {
                                                const totalQ = quizData.questions.length;
                                                const safeIdx = Math.min(Math.max(0, currentQuestionIdx), totalQ - 1);
                                                const q = quizData.questions[safeIdx];
                                                const qText = q.questionText || q.question || '';
                                                const correctIdx = q.correctOptionIndex ?? q.correctIndex ?? 0;
                                                const isUserSelected = selectedAnswers[safeIdx] !== undefined;
                                                const isCorrectSelection = isUserSelected && selectedAnswers[safeIdx] === correctIdx;
                                                const subjectStyle = getSubjectStyles(q.subject || activeNode?.title);
                                                const showExplanation = (learnMode && isUserSelected) || quizSubmitted;

                                                return (
                                                    <div className="space-y-6">
                                                        {/* Horizontal Question Navigation Palette */}
                                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                                            <div className="flex items-center justify-between gap-2 mb-2 px-1">
                                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                                    Question Palette ({Object.keys(selectedAnswers).length}/{totalQ} Answered)
                                                                </span>
                                                                <span className="text-xs text-slate-500 font-medium">
                                                                    Question {safeIdx + 1} of {totalQ}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                                                                {quizData.questions.map((qItem, idx) => {
                                                                    const isCurrent = idx === safeIdx;
                                                                    const isAns = selectedAnswers[idx] !== undefined;
                                                                    const qItemCorrect = qItem.correctOptionIndex ?? qItem.correctIndex ?? 0;
                                                                    const isRightAns = isAns && selectedAnswers[idx] === qItemCorrect;

                                                                    let chipStyle = 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100';
                                                                    if (quizSubmitted || (learnMode && isAns)) {
                                                                        if (isRightAns) {
                                                                            chipStyle = 'bg-green-600 text-white border-green-600 font-bold';
                                                                        } else if (isAns) {
                                                                            chipStyle = 'bg-red-600 text-white border-red-600 font-bold';
                                                                        }
                                                                    } else if (isAns) {
                                                                        chipStyle = 'bg-[#1E3A5F] text-amber-300 border-[#1E3A5F] font-bold';
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => setCurrentQuestionIdx(idx)}
                                                                            className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${chipStyle} ${
                                                                                isCurrent ? 'ring-2 ring-amber-400 ring-offset-2 scale-105 z-10 shadow-sm' : 'opacity-90'
                                                                            }`}
                                                                        >
                                                                            {idx + 1}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Single Horizontal Question Card (One Question per View) */}
                                                        <div
                                                            className={`p-6 rounded-2xl border-2 transition-all ${subjectStyle.bg} ${
                                                                showExplanation
                                                                    ? isCorrectSelection
                                                                        ? 'border-green-300 bg-green-50/50'
                                                                        : isUserSelected
                                                                        ? 'border-red-300 bg-red-50/50'
                                                                        : 'border-slate-200'
                                                                    : 'shadow-sm'
                                                            }`}
                                                        >
                                                            {/* Question Header & Subject Badge */}
                                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-xs bg-[#1E3A5F] text-amber-300 px-3 py-1 rounded-lg">
                                                                        Question {safeIdx + 1} of {totalQ}
                                                                    </span>
                                                                    {q.subject && (
                                                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${subjectStyle.badge}`}>
                                                                            {q.subject}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-600 bg-white/90 px-2.5 py-1 rounded-md border border-slate-200">
                                                                    2 Marks (+2 / -0.66)
                                                                </span>
                                                            </div>

                                                            {/* Question Text */}
                                                            <h4 className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-5">
                                                                {qText}
                                                            </h4>

                                                            {/* Option Choices */}
                                                            <div className="space-y-3">
                                                                {q.options.map((opt, optIdx) => {
                                                                    const label = OPTION_LABELS[optIdx] || String.fromCharCode(65 + optIdx);
                                                                    const isSelected = selectedAnswers[safeIdx] === optIdx;
                                                                    const isRight = correctIdx === optIdx;

                                                                    let btnClass = 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200';

                                                                    if (showExplanation) {
                                                                        if (isRight) {
                                                                            btnClass = 'bg-green-600 text-white font-bold border-green-600 shadow-xs';
                                                                        } else if (isSelected && !isRight) {
                                                                            btnClass = 'bg-red-600 text-white font-bold border-red-600 shadow-xs';
                                                                        }
                                                                    } else if (isSelected) {
                                                                        btnClass = 'bg-[#1E3A5F] text-amber-300 font-bold border-[#1E3A5F] shadow-xs';
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={optIdx}
                                                                            onClick={() => {
                                                                                if (!quizSubmitted) {
                                                                                    setSelectedAnswers((prev) => ({ ...prev, [safeIdx]: optIdx }));
                                                                                    if (optIdx === correctIdx) {
                                                                                        confetti({
                                                                                            particleCount: 100,
                                                                                            spread: 75,
                                                                                            origin: { y: 0.7 }
                                                                                        });
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className={`w-full text-left p-3.5 rounded-xl text-xs sm:text-sm transition-all border flex items-center justify-between ${btnClass}`}
                                                                        >
                                                                            <span className="flex items-center gap-3">
                                                                                <span className="font-bold opacity-80 w-6">
                                                                                    ({label})
                                                                                </span>
                                                                                <span>{opt}</span>
                                                                            </span>
                                                                            {showExplanation && isRight && (
                                                                                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">✓ Correct</span>
                                                                            )}
                                                                            {showExplanation && isSelected && !isRight && (
                                                                                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">✗ Incorrect</span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Explanation Box */}
                                                            {showExplanation && q.explanation && (
                                                                <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-950 leading-relaxed space-y-1">
                                                                    <div className="font-bold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                                                                        💡 Detailed Explanation &amp; Key Takeaway:
                                                                    </div>
                                                                    <p className="whitespace-pre-line">{q.explanation}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Bottom Navigation Bar: Previous, Next & Submit */}
                                                        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                                                            {/* Previous Button */}
                                                            <button
                                                                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                                                                disabled={safeIdx === 0}
                                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-amber-300 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 border border-slate-700"
                                                            >
                                                                ← Previous
                                                            </button>

                                                            {/* Question Counter & Status */}
                                                            <div className="text-center px-2">
                                                                <div className="text-xs text-slate-300 font-semibold">
                                                                    Question <span className="text-amber-300 font-bold">{safeIdx + 1}</span> of {totalQ}
                                                                </div>
                                                                {quizSubmitted ? (
                                                                    <div className="text-[11px] font-bold text-amber-400 mt-0.5">
                                                                        Score: {calculateQuizScore().score} / {totalQ * 2}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10px] text-slate-400">
                                                                        {Object.keys(selectedAnswers).length} of {totalQ} Answered
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Next / Submit / Retake Buttons */}
                                                            <div className="flex items-center gap-2">
                                                                {quizSubmitted ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            setQuizSubmitted(false);
                                                                            setSelectedAnswers({});
                                                                            setCurrentQuestionIdx(0);
                                                                        }}
                                                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors"
                                                                    >
                                                                        🔄 Retake Test
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setCurrentQuestionIdx((prev) => Math.min(totalQ - 1, prev + 1))}
                                                                            disabled={safeIdx === totalQ - 1}
                                                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-amber-300 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 border border-slate-700"
                                                                        >
                                                                            Next →
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setQuizSubmitted(true)}
                                                                            disabled={Object.keys(selectedAnswers).length === 0}
                                                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors shadow-sm"
                                                                        >
                                                                            Submit Test ↗
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            /* Sample Fallback Card if Quiz ID not attached */
                                            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                                <h4 className="font-bold text-slate-900 text-sm">
                                                    Sample Prelims Conceptual Question
                                                </h4>
                                                <p className="text-xs text-slate-700 leading-relaxed">
                                                    Consider the following statements regarding the powers of the Speaker of Lok Sabha...
                                                </p>
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold">
                                                    💡 Admin can attach a structured Quiz ID to load full interactive Prelims Practice Test questions here.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MAINS SUB-TAB */}
                        {effectiveSubTab === 'mains' && hasMains && (
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
                                    </div>
                                ) : (
                                    /* Active State for Mains: MATCHING EXACT MAINS PRACTICE TEST ACCORDION UI */
                                    <div className="space-y-5">
                                        {/* Summary Header Box matching Mains Practice Test Wireframe */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Left Box: Question Count */}
                                            <div className="bg-[#FFF3E0] border-2 border-[#FFE0B2] rounded-2xl p-5 text-center flex flex-col justify-center items-center shadow-xs">
                                                <span className="text-lg md:text-xl font-bold text-[#1E3A5F] font-headline">
                                                    {mainsQuestionsList.length} Mains Practice {mainsQuestionsList.length === 1 ? 'Question' : 'Questions'}
                                                </span>
                                            </div>

                                            {/* Right Box: Difficulty Legend */}
                                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-center shadow-xs space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3.5 h-3.5 rounded-full bg-[#81C784] border border-[#388E3C] flex-shrink-0" />
                                                    <span className="text-xs font-bold text-slate-700">Easy</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3.5 h-3.5 rounded-full bg-[#FFF176] border border-[#FBC02D] flex-shrink-0" />
                                                    <span className="text-xs font-bold text-slate-700">Moderate</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3.5 h-3.5 rounded-full bg-[#FFB74D] border border-[#F57C00] flex-shrink-0" />
                                                    <span className="text-xs font-bold text-slate-700">Difficult</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Control Bar: Expand/Collapse All Toggle */}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Questions Accordion List
                                            </span>
                                            <button
                                                onClick={() => handleExpandAllMains(mainsQuestionsList.length)}
                                                className="text-xs font-bold text-[#1E3A5F] hover:text-amber-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
                                            >
                                                {mainsExpandedIndices.length === mainsQuestionsList.length ? 'Collapse All −' : 'Expand All +'}
                                            </button>
                                        </div>

                                        {mptLoading ? (
                                            <div className="flex justify-center p-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                                            </div>
                                        ) : mainsQuestionsList.length > 0 ? (
                                            /* Accordion Items List matching Mains Practice Test UI */
                                            <div className="space-y-4">
                                                {mainsQuestionsList.map((q, idx) => {
                                                    const isExpanded = mainsExpandedIndices.includes(idx);
                                                    const badge = getDifficultyBadge(q.difficultyLevel || 'Moderate');

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`border-2 rounded-2xl overflow-hidden transition-all shadow-xs ${
                                                                isExpanded ? 'bg-white border-[#BBE0F9]' : 'bg-[#EBF3FC] border-[#CFE4F9] hover:border-[#BBE0F9]'
                                                            }`}
                                                        >
                                                            {/* Accordion Header Row */}
                                                            <button
                                                                onClick={() => toggleMainsAccordion(idx)}
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

                                                                {/* Accordion Body (Expanded View) */}
                                                                {isExpanded && (
                                                                    <div className="px-4 pb-5 md:px-5 border-t border-slate-200/60 bg-white space-y-4 pt-3">
                                                                        {/* Metadata Chips */}
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                                                                                {q.marks || 15} Marks
                                                                            </span>
                                                                            <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-100">
                                                                                {q.wordLimit || 250} Words
                                                                            </span>
                                                                            {q.topicTags?.map((tag, tIdx) => (
                                                                                <span key={tIdx} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                                                                    #{tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>

                                                                        {/* Approach Guidelines (if provided) */}
                                                                        {q.approach && (
                                                                            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4">
                                                                                <h4 className="text-xs font-bold text-[#166534] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                                                    💡 Approach &amp; Structuring Guidelines
                                                                                </h4>
                                                                                <p className="text-xs text-[#15803D] leading-relaxed whitespace-pre-line">
                                                                                    {q.approach}
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                        {/* Model Answer / Explanation Section */}
                                                                        <div className="pt-2">
                                                                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                                                <span>Model Answer / Explanation:</span>
                                                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                                                    Official Reference
                                                                                </span>
                                                                            </h4>
                                                                            <div
                                                                                className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-line"
                                                                                dangerouslySetInnerHTML={{ __html: q.modelAnswer || 'No model answer provided.' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* Sample Card fallback if no questions */
                                                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                                                    No Mains practice questions configured for this video node.
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
                                    <div className="space-y-6">
                                        {/* Ask Doubt Form */}
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                                ❓ Ask Doubt &amp; Academic Support
                                            </h3>
                                            {activeVideo?.helpContactInfo && (
                                                <p className="text-xs text-slate-600">{activeVideo.helpContactInfo}</p>
                                            )}

                                            {doubtSubmitted ? (
                                                <div className="p-4 bg-green-100 border border-green-300 text-green-800 rounded-xl text-xs font-semibold space-y-3">
                                                    <div className="flex items-center gap-2 text-sm font-bold">
                                                        <span>✅ Your doubt has been submitted to mentor desk!</span>
                                                    </div>
                                                    <p className="text-xs text-green-900">
                                                        You can track the live status and mentor responses below or in your profile.
                                                    </p>
                                                    <div className="flex items-center gap-3 pt-1">
                                                        <button
                                                            onClick={() => setDoubtSubmitted(false)}
                                                            className="px-3 py-1.5 bg-[#1E3A5F] text-white rounded-lg font-bold text-xs hover:bg-[#152C4A] transition-colors"
                                                        >
                                                            ➕ Ask Another Doubt
                                                        </button>
                                                        <Link href="/profile" className="text-[#1E3A5F] underline font-bold hover:text-amber-600">
                                                            Track in My Doubts (Profile) →
                                                        </Link>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {!isLoggedIn && (
                                                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between">
                                                            <span>💡 Please sign in to submit your doubt to mentor and track replies.</span>
                                                            <Link href="/login" className="px-3 py-1 bg-[#1E3A5F] text-white rounded-lg font-bold text-[11px]">
                                                                Sign In
                                                            </Link>
                                                        </div>
                                                    )}

                                                    {doubtError && (
                                                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                                                            ⚠️ {doubtError}
                                                        </div>
                                                    )}

                                                    <textarea
                                                        value={doubtText}
                                                        onChange={(e) => setDoubtText(e.target.value)}
                                                        rows={3}
                                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A5F] bg-white"
                                                        placeholder="Type your detailed doubt or query regarding this lecture..."
                                                    />

                                                    {/* Screenshot Attachment Controls */}
                                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                            className="hidden"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300"
                                                        >
                                                            <span>📷</span>
                                                            <span>{doubtFile ? 'Change Screenshot' : 'Attach Screenshot (Optional)'}</span>
                                                        </button>

                                                        {doubtFile && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                                                                    📎 {doubtFile.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={clearDoubtFile}
                                                                    className="text-xs text-red-600 font-bold hover:underline"
                                                                >
                                                                    ✕ Remove
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Screenshot Preview */}
                                                    {doubtImagePreview && (
                                                        <div className="relative inline-block mt-2">
                                                            <img
                                                                src={doubtImagePreview}
                                                                alt="Screenshot Preview"
                                                                className="max-h-36 rounded-xl border border-slate-300 object-contain bg-slate-900/5 p-1"
                                                            />
                                                            <span className="block text-[10px] text-slate-500 mt-1">
                                                                Screenshot preview attached
                                                            </span>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleDoubtSubmit}
                                                        disabled={isSubmittingDoubt || !doubtText.trim()}
                                                        className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#152C4A] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 mt-2"
                                                    >
                                                        {isSubmittingDoubt ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white" />
                                                                <span>Uploading &amp; Submitting...</span>
                                                            </>
                                                        ) : (
                                                            <span>Submit Doubt to Mentor ↗</span>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tracked Doubts & Replies List Section */}
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                    <span>💬 Your Asked Doubts &amp; Responses</span>
                                                    {userDoubts.length > 0 && (
                                                        <span className="bg-[#1E3A5F] text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                                            {userDoubts.length}
                                                        </span>
                                                    )}
                                                </h3>
                                                <button
                                                    onClick={fetchUserDoubts}
                                                    className="text-xs text-slate-600 hover:text-[#1E3A5F] font-bold flex items-center gap-1"
                                                >
                                                    🔄 Refresh
                                                </button>
                                            </div>

                                            {userDoubtsLoading ? (
                                                <div className="flex justify-center p-8">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                                                </div>
                                            ) : userDoubts.length === 0 ? (
                                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                                                    No doubts submitted yet. Ask your question above to track status &amp; mentor answers here!
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {userDoubts.map((d) => {
                                                        const isPending = d.status === 'pending';
                                                        const isAnswered = d.status === 'answered';
                                                        const isResolved = d.status === 'resolved';

                                                        return (
                                                            <div
                                                                key={d._id}
                                                                className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                                                                    isAnswered
                                                                        ? 'bg-green-50/40 border-green-300'
                                                                        : isResolved
                                                                        ? 'bg-slate-50 border-slate-200'
                                                                        : 'bg-amber-50/40 border-amber-200'
                                                                }`}
                                                            >
                                                                {/* Header: Title & Status */}
                                                                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 mr-2">
                                                                            {d.subject || 'Course Doubt'}
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-900">
                                                                            {d.title}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isPending && (
                                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                                                                ⏳ Pending Mentor Review
                                                                            </span>
                                                                        )}
                                                                        {isAnswered && (
                                                                            <span className="text-[10px] font-bold bg-green-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                                                                                ✅ Responded by Mentor
                                                                            </span>
                                                                        )}
                                                                        {isResolved && (
                                                                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                                                                                ✔️ Resolved
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Doubt Description */}
                                                                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                                                                    {d.description}
                                                                </p>

                                                                {/* Attached Screenshot Image */}
                                                                {d.imageUrl && (
                                                                    <div className="mt-2">
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                                            📷 Attached Screenshot:
                                                                        </span>
                                                                        <a
                                                                            href={d.imageUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-block group"
                                                                        >
                                                                            <img
                                                                                src={d.imageUrl}
                                                                                alt="Doubt Screenshot"
                                                                                className="max-h-40 rounded-xl border border-slate-300 object-cover shadow-xs group-hover:opacity-90 transition-opacity"
                                                                            />
                                                                            <span className="text-[10px] text-blue-600 group-hover:underline block mt-0.5 font-semibold">
                                                                                Click to view full image ↗
                                                                            </span>
                                                                        </a>
                                                                    </div>
                                                                )}

                                                                {/* Thread Messages / Replies */}
                                                                {d.messages && d.messages.length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                                                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                                                            💬 Conversation Thread ({d.messages.length}):
                                                                        </span>
                                                                        <div className="space-y-2">
                                                                            {d.messages.map((m: any, mIdx: number) => {
                                                                                const isMentorMsg = m.senderName?.toLowerCase().includes('mentor') || m.senderName?.toLowerCase().includes('admin');
                                                                                return (
                                                                                    <div
                                                                                        key={mIdx}
                                                                                        className={`p-3 rounded-xl text-xs leading-relaxed border ${
                                                                                            isMentorMsg
                                                                                                ? 'bg-blue-50/80 border-blue-200 text-blue-950 font-medium ml-3'
                                                                                                : 'bg-white border-slate-200 text-slate-800 mr-3'
                                                                                        }`}
                                                                                    >
                                                                                        <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                                                                                            <span className={isMentorMsg ? 'text-blue-900' : 'text-[#1E3A5F]'}>
                                                                                                {isMentorMsg ? '🎓 ' : '👤 '}{m.senderName}
                                                                                            </span>
                                                                                            <span className="text-[10px] text-slate-400 font-normal">
                                                                                                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="whitespace-pre-line">{m.message}</p>
                                                                                        {m.imageUrl && (
                                                                                            <a href={m.imageUrl} target="_blank" rel="noreferrer" className="block mt-2">
                                                                                                <img src={m.imageUrl} alt="Reply Attachment" className="max-h-32 rounded-lg border border-slate-200 object-contain" />
                                                                                            </a>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Follow up & Resolve Bar */}
                                                                {!isResolved && (
                                                                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                                                        <div className="flex-1 min-w-[200px] flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={replyTexts[d._id] || ''}
                                                                                onChange={(e) => setReplyTexts({ ...replyTexts, [d._id]: e.target.value })}
                                                                                placeholder="Type follow-up reply..."
                                                                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#1E3A5F] bg-white"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleSendReply(d._id)}
                                                                                disabled={submittingReplyId === d._id || !replyTexts[d._id]?.trim()}
                                                                                className="px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#152C4A] disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors flex-shrink-0"
                                                                            >
                                                                                Reply
                                                                            </button>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleResolveDoubt(d._id)}
                                                                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex-shrink-0"
                                                                        >
                                                                            Mark Resolved ✓
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
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
