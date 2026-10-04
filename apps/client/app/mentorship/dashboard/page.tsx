'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import PurchaseConfirmModal from '@/components/PurchaseConfirmModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REASONS = [
    'Health',
    'Family Time',
    'Friends & Unproductive Discussions',
    'Mobile Distraction',
    'Work/Studies Commitments',
    'Contemplation',
    'Others',
];

const TRACKS = [
    { id: 'GS', label: 'GS Foundation' },
    { id: 'Optional', label: 'Optional' },
    { id: 'Essay', label: 'Essay' },
    { id: 'CA', label: 'Current Affairs' },
    { id: 'CSAT', label: 'CSAT' },
];

export default function MentorshipDashboardPage() {
    const { user, token, isLoggedIn } = useStudentAuth();
    const { isMentorshipStudent } = useAuthorization();

    const [activeTab, setActiveTab] = useState<'daily' | 'roadmap' | 'chat' | 'uploads' | 'mentorship'>('daily');
    const [activeTrack, setActiveTrack] = useState<string>('GS');
    const [roadmapView, setRoadmapView] = useState<'subjects' | 'partial'>('subjects');

    // Daily Task date & study hours state
    const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [hoursInput, setHoursInput] = useState<string>('3.5');
    const [reasonInput, setReasonInput] = useState<string>('');
    const [logsMap, setLogsMap] = useState<Record<string, { hours: number; reason?: string }>>({});

    // Carousel & Subscribed Courses Task Cards State
    const [subscribedCourses, setSubscribedCourses] = useState<any[]>([]);
    const [taskProgressMap, setTaskProgressMap] = useState<Record<string, boolean>>({});
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

    // In-Page Action Modal State (NO rerouting for 01, 02, 03, 04)
    const [activeModal, setActiveModal] = useState<{
        type: 'video' | 'notes' | 'test' | 'upload';
        item: any;
        cardContext: { tag: string; dayNumber: number; courseId?: string };
    } | null>(null);

    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isSubmittingUpload, setIsSubmittingUpload] = useState<boolean>(false);
    const [uploadMsg, setUploadMsg] = useState<string>('');

    // Modal course practice sync states
    const [modalQuizData, setModalQuizData] = useState<any | null>(null);
    const [modalQuizLoading, setModalQuizLoading] = useState<boolean>(false);
    const [modalMptData, setModalMptData] = useState<any | null>(null);
    const [modalMptLoading, setModalMptLoading] = useState<boolean>(false);
    const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);
    const [learnMode, setLearnMode] = useState<boolean>(true);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);

    useEffect(() => {
        if (!activeModal) {
            setModalQuizData(null);
            setModalMptData(null);
            setShowModelAnswer(false);
            return;
        }

        if (activeModal.type === 'test') {
            setModalQuizLoading(true);
            setQuizAnswers({});
            setQuizSubmitted(false);
            setCurrentQuestionIdx(0);
            const item = activeModal.item;
            if (item?.prelimsQuizId) {
                fetch(`${API_URL}/api/quizzes/${item.prelimsQuizId}`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (d.success && d.data) setModalQuizData(d.data);
                        else setModalQuizData(null);
                    })
                    .catch(() => setModalQuizData(null))
                    .finally(() => setModalQuizLoading(false));
            } else {
                fetch(`${API_URL}/api/quizzes?tags=prelims-practice&limit=5`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (d.success && d.data && d.data.length > 0) {
                            setModalQuizData(d.data[0]);
                        } else {
                            setModalQuizData({
                                title: `${item?.title || item?.nodeTitle || 'Course Topic'} — Sectional Prelims Practice Quiz`,
                                questions: [
                                    {
                                        questionText: `1. With reference to ${item?.title || item?.nodeTitle || 'this topic'}, consider the following statements:\n1. It constitutes a key module in the civil services exam roadmap.\n2. Standard analytical frameworks require evaluating both static concepts and current developments.`,
                                        options: ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'],
                                        correctOptionIndex: 2,
                                        explanation: `Both statements are correct. Understanding ${item?.title || item?.nodeTitle} requires combining theoretical knowledge with contemporary updates.`,
                                        subject: activeModal.cardContext.tag || 'GS Foundation',
                                    },
                                    {
                                        questionText: `2. Which of the following analytical dimensions is most critical when evaluating ${item?.title || item?.nodeTitle || 'this topic'}?`,
                                        options: ['Institutional governance', 'Socio-economic outcome', 'Policy implementation', 'All of the above'],
                                        correctOptionIndex: 3,
                                        explanation: `All dimensions are essential for a multi-faceted understanding of ${item?.title || item?.nodeTitle}.`,
                                        subject: activeModal.cardContext.tag || 'GS Foundation',
                                    },
                                ],
                            });
                        }
                    })
                    .catch(() => setModalQuizData(null))
                    .finally(() => setModalQuizLoading(false));
            }
        } else if (activeModal.type === 'upload') {
            setModalMptLoading(true);
            setShowModelAnswer(false);
            const item = activeModal.item;
            if (item?.mainsPracticeTestId) {
                fetch(`${API_URL}/api/mpt/${item.mainsPracticeTestId}`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (d.success && d.data) setModalMptData(d.data);
                        else setModalMptData(null);
                    })
                    .catch(() => setModalMptData(null))
                    .finally(() => setModalMptLoading(false));
            } else if (item?.mainsQuestionText) {
                setModalMptData({
                    title: `${item?.title || item?.nodeTitle || 'Topic'} — Mains Practice Question`,
                    questions: [
                        {
                            questionText: item.mainsQuestionText,
                            marks: 15,
                            wordLimit: 250,
                            approach: '1. Introduction: Define core concepts and outline context.\n2. Body: Provide multi-dimensional arguments supported by data/examples.\n3. Conclusion: Suggest forward-looking, actionable policy solutions.',
                            modelAnswer: item.mainsModelAnswer || 'Official model answer and evaluation guidelines available upon script submission.',
                        },
                    ],
                });
                setModalMptLoading(false);
            } else {
                setModalMptData({
                    title: `${item?.title || item?.nodeTitle || 'Topic'} — Mains Practice Question`,
                    questions: [
                        {
                            questionText: `Examine the key themes, challenges, and policy implications associated with ${item?.title || item?.nodeTitle || 'this course module'}. Suggest suitable measures. (15 Marks, 250 Words)`,
                            marks: 15,
                            wordLimit: 250,
                            approach: `1. Intro: Define the conceptual background of ${item?.title || item?.nodeTitle}.\n2. Body: Analyze critical issues, structural bottlenecks, and practical impacts.\n3. Conclusion: Outline a constructive way forward.`,
                            modelAnswer: `Model Answer Reference:\n• Clear introduction framing the background.\n• Multi-faceted analysis covering governance, economic, and social dimensions.\n• Practical recommendations aligned with standard Mains evaluation standards.`,
                        },
                    ],
                });
                setModalMptLoading(false);
            }
        }
    }, [activeModal]);

    // Roadmap state (Courses only; PTS & MTS trackers removed)
    const [selectedTrack, setSelectedTrack] = useState<'GS' | 'Optional' | 'Essay' | 'CA' | 'CSAT'>('GS');
    const [roadmapSubTab, setRoadmapSubTab] = useState<'subjects' | 'partial'>('subjects');
    const [reorderMode, setReorderMode] = useState(false);
    const [pausedAccordionOpen, setPausedAccordionOpen] = useState<string | null>(null);

    // Mentorship Account & Requests state
    const [mentorshipAccountStatus, setMentorshipAccountStatus] = useState<'active' | 'break' | 'inactive'>('active');
    const [pendingBreakRequest, setPendingBreakRequest] = useState<any | null>(null);
    const [pendingReorderRequest, setPendingReorderRequest] = useState<any | null>(null);

    // Roadmap Data
    const [roadmapData, setRoadmapData] = useState<{
        track: string;
        statStrip: string;
        completedSubjects: any[];
        currentSubject: any;
        pausedSubjects: any[];
        upcomingSubjects: any[];
        activeTracks?: string[];
    }>({
        track: 'GS',
        statStrip: '',
        completedSubjects: [],
        currentSubject: null,
        pausedSubjects: [],
        upcomingSubjects: [],
        activeTracks: [],
    });

    const [workingUpcomingSubjects, setWorkingUpcomingSubjects] = useState<any[]>([]);
    const [partialTasks, setPartialTasks] = useState<any[]>([]);
    const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

    // Modals state
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [breakReason, setBreakReason] = useState('Health');
    const [breakMode, setBreakMode] = useState<'fixed' | 'open'>('fixed');
    const [breakReturnDate, setBreakReturnDate] = useState('');
    const [isSubmittingBreak, setIsSubmittingBreak] = useState(false);

    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [pauseReason, setPauseReason] = useState('Health');
    const [pauseNote, setPauseNote] = useState('');
    const [isSubmittingPause, setIsSubmittingPause] = useState(false);

    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [isSubmittingReorder, setIsSubmittingReorder] = useState(false);
    const [kpis, setKpis] = useState<{
        avgHoursPerWeek: string;
        taskCompletionPct: number;
        bestWeekHours: string;
        loggedDaysCount: number;
        targetDays: number;
    }>({
        avgHoursPerWeek: '0.0',
        taskCompletionPct: 0,
        bestWeekHours: '0.0',
        loggedDaysCount: 0,
        targetDays: 30,
    });

    // Chat state
    const [activeThread, setActiveThread] = useState<'mentor' | 'desk'>('mentor');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    // Uploads state
    const [uploadsList, setUploadsList] = useState<any[]>([]);

    // Mentorship state
    const [sessionNotes, setSessionNotes] = useState<any[]>([]);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [assignedMentor, setAssignedMentor] = useState<{ _id: string; name: string; email?: string } | null>(null);

    // Purchase Modal
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    useEffect(() => {
        if (isLoggedIn && token) {
            fetchInitialData();
        }
    }, [isLoggedIn, token]);

    const fetchInitialData = async () => {
        try {
            // 1. Daily task data
            const resDaily = await fetch(`${API_URL}/api/mentorship-student/daily-task`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataDaily = await resDaily.json();
            if (dataDaily.success && dataDaily.data) {
                if (dataDaily.data.assignedMentor) {
                    setAssignedMentor(dataDaily.data.assignedMentor);
                }
                if (dataDaily.data.logs) {
                    const map: Record<string, { hours: number; reason?: string }> = {};
                    dataDaily.data.logs.forEach((l: any) => {
                        map[l.date] = { hours: l.hours, reason: l.reason };
                    });
                    setLogsMap(map);
                }
                if (dataDaily.data.subscribedCourses) {
                    setSubscribedCourses(dataDaily.data.subscribedCourses);
                }
                if (dataDaily.data.taskProgress) {
                    const pMap: Record<string, boolean> = {};
                    dataDaily.data.taskProgress.forEach((tp: any) => {
                        pMap[`${tp.tag}_${tp.dayNumber}_${tp.taskType}`] = tp.completed;
                        if (tp.courseId) {
                            pMap[`${tp.courseId}_${tp.dayNumber}_${tp.taskType}`] = tp.completed;
                        }
                        if (tp.taskType === 'overall' && tp.isPartial) {
                            pMap[`${tp.tag}_${tp.dayNumber}_partial`] = true;
                            if (tp.courseId) {
                                pMap[`${tp.courseId}_${tp.dayNumber}_partial`] = true;
                            }
                        }
                    });
                    setTaskProgressMap(pMap);
                }
                if (dataDaily.data.mentorshipAccountStatus) {
                    setMentorshipAccountStatus(dataDaily.data.mentorshipAccountStatus);
                }
                if (dataDaily.data.pendingBreakRequest !== undefined) {
                    setPendingBreakRequest(dataDaily.data.pendingBreakRequest);
                }
                if (dataDaily.data.pendingReorderRequest !== undefined) {
                    setPendingReorderRequest(dataDaily.data.pendingReorderRequest);
                }
            }

            // 2. Roadmap data (Courses only)
            const resRoadmap = await fetch(`${API_URL}/api/mentorship-student/roadmap?track=${selectedTrack}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataRoadmap = await resRoadmap.json();
            if (dataRoadmap.success && dataRoadmap.data) {
                setRoadmapData(dataRoadmap.data);
                if (dataRoadmap.data.track && dataRoadmap.data.track !== selectedTrack) {
                    setSelectedTrack(dataRoadmap.data.track);
                }
                if (dataRoadmap.data.partialTasks) {
                    setPartialTasks(dataRoadmap.data.partialTasks);
                }
                if (dataRoadmap.data.upcomingSubjects) {
                    setWorkingUpcomingSubjects(dataRoadmap.data.upcomingSubjects);
                }
                if (dataRoadmap.data.pendingBreakRequest !== undefined) {
                    setPendingBreakRequest(dataRoadmap.data.pendingBreakRequest);
                }
                if (dataRoadmap.data.pendingReorderRequest !== undefined) {
                    setPendingReorderRequest(dataRoadmap.data.pendingReorderRequest);
                }
                if (dataRoadmap.data.mentorshipAccountStatus) {
                    setMentorshipAccountStatus(dataRoadmap.data.mentorshipAccountStatus);
                }
            }

            // 3. Uploads data
            const resUploads = await fetch(`${API_URL}/api/mentorship-student/uploads`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataUploads = await resUploads.json();
            if (dataUploads.success) {
                setUploadsList(dataUploads.data || []);
            }

            // 4. Sessions data & KPIs
            fetchSessions();

            // 5. Chat data
            fetchChatMessages();
        } catch (e) {
            console.error('Fetch initial mentorship data error:', e);
        }
    };

    const fetchSessions = async () => {
        try {
            const resSessions = await fetch(`${API_URL}/api/mentorship-student/sessions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataSessions = await resSessions.json();
            if (dataSessions.success && dataSessions.data) {
                setSessionNotes(dataSessions.data.sessionNotes || []);
                if (dataSessions.data.kpis) {
                    setKpis(dataSessions.data.kpis);
                }
            }
        } catch (e) {
            console.error('Fetch sessions error:', e);
        }
    };

    useEffect(() => {
        if (!token || activeTab !== 'mentorship') return;
        fetchSessions();
    }, [token, activeTab]);

    const fetchChatMessages = async (thread = activeThread) => {
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/chat?threadType=${thread}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setChatMessages(data.data || []);
            }
        } catch (e) {
            console.error('Fetch chat error:', e);
        }
    };

    useEffect(() => {
        if (!token || activeTab !== 'chat') return;
        fetchChatMessages(activeThread);
        const interval = setInterval(() => {
            fetchChatMessages(activeThread);
        }, 5000);
        return () => clearInterval(interval);
    }, [token, activeTab, activeThread]);

    const handleSaveHours = async () => {
        const h = parseFloat(hoursInput);
        if (isNaN(h)) return;

        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/log-hours`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    date: selectedDateStr,
                    hours: h,
                    reason: h < 1 ? reasonInput : '',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setLogsMap((prev) => ({
                    ...prev,
                    [selectedDateStr]: { hours: h, reason: h < 1 ? reasonInput : '' },
                }));
            }
        } catch (e) {
            console.error('Save hours error:', e);
        }
    };

    const handleToggleStep = async (
        tag: string,
        dayNumber: number,
        taskType: 'watch' | 'notes' | 'test' | 'upload',
        completed: boolean,
        notesText?: string,
        mainsUrl?: string,
        courseId?: string
    ) => {
        const key = `${tag}_${dayNumber}_${taskType}`;
        const keyCourse = courseId ? `${courseId}_${dayNumber}_${taskType}` : '';
        setTaskProgressMap((prev) => ({
            ...prev,
            [key]: completed,
            ...(keyCourse ? { [keyCourse]: completed } : {}),
        }));

        try {
            await fetch(`${API_URL}/api/mentorship-student/task-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    tag: String(tag),
                    dayNumber: Number(dayNumber),
                    courseId,
                    taskType,
                    completed,
                    notesText,
                    mainsAnswerFileUrl: mainsUrl,
                }),
            });
            await Promise.all([fetchInitialData(), fetchRoadmap()]);
        } catch (e) {
            console.error('Save task progress error:', e);
        }
    };

    const handleMarkOverallTask = async (
        tag: string,
        dayNumber: number,
        status?: 'partial' | 'completed' | 'pending',
        courseId?: string
    ) => {
        const isCurrentlyComp = !!taskProgressMap[`${tag}_${dayNumber}_overall`] || (courseId ? !!taskProgressMap[`${courseId}_${dayNumber}_overall`] : false);
        const isCurrentlyPart = !!taskProgressMap[`${tag}_${dayNumber}_partial`] || (courseId ? !!taskProgressMap[`${courseId}_${dayNumber}_partial`] : false);

        // Toggle if user clicks on the already active status:
        let targetStatus = status || (isCurrentlyComp ? 'pending' : 'completed');
        if (status === 'completed' && isCurrentlyComp) {
            targetStatus = 'pending';
        } else if (status === 'partial' && isCurrentlyPart && !isCurrentlyComp) {
            targetStatus = 'pending';
        }

        const isComp = targetStatus === 'completed';
        const isPart = targetStatus === 'partial';

        setTaskProgressMap((prev) => {
            const next = { ...prev };
            ['watch', 'notes', 'test', 'upload', 'overall'].forEach((st) => {
                next[`${tag}_${dayNumber}_${st}`] = isComp;
                if (courseId) next[`${courseId}_${dayNumber}_${st}`] = isComp;
            });
            next[`${tag}_${dayNumber}_partial`] = isPart;
            if (courseId) next[`${courseId}_${dayNumber}_partial`] = isPart;
            return next;
        });

        try {
            await fetch(`${API_URL}/api/mentorship-student/task-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    tag: String(tag),
                    dayNumber: Number(dayNumber),
                    courseId,
                    taskType: 'overall',
                    completed: isComp,
                    isPartial: isPart,
                }),
            });
            await Promise.all([fetchInitialData(), fetchRoadmap()]);
        } catch (e) {
            console.error('Save overall task progress error:', e);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const text = chatInput.trim();
        setChatInput('');

        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text, threadType: activeThread }),
            });
            const data = await res.json();
            if (data.success && data.data) {
                setChatMessages((prev) => [...prev, data.data]);
            } else {
                fetchChatMessages(activeThread);
            }
        } catch (e) {
            console.error('Send chat error:', e);
            fetchChatMessages(activeThread);
        }
    };

    const handleMainsUploadSubmit = async (cardContext: { tag: string; dayNumber: number; courseId?: string }, itemTitle: string) => {
        setIsSubmittingUpload(true);
        setUploadMsg('');
        try {
            const simulatedUrl = uploadFile ? `/uploads/${uploadFile.name}` : `https://shailajaias.com/uploads/mains-submission-${Date.now()}.pdf`;
            
            await handleToggleStep(cardContext.tag, cardContext.dayNumber, 'upload', true, 'Submitted practice answer script', simulatedUrl, cardContext.courseId);

            setUploadsList((prev) => [
                {
                    code: `ST-${cardContext.dayNumber}`,
                    testTitle: itemTitle || 'Practice Mains Submission',
                    subject: cardContext.tag,
                    submittedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    status: 'submitted',
                    score: '—',
                },
                ...prev,
            ]);

            setUploadMsg('✓ Mains answer script uploaded successfully! Tracked in Uploads tab.');
            setTimeout(() => {
                setActiveModal(null);
                setIsSubmittingUpload(false);
            }, 1200);
        } catch (e) {
            console.error('Mains upload error:', e);
            setIsSubmittingUpload(false);
        }
    };

    const fetchRoadmap = async (track = selectedTrack) => {
        setIsRoadmapLoading(true);
        try {
            const resRoadmap = await fetch(`${API_URL}/api/mentorship-student/roadmap?track=${track}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataRoadmap = await resRoadmap.json();
            if (dataRoadmap.success && dataRoadmap.data) {
                setRoadmapData(dataRoadmap.data);
                if (dataRoadmap.data.track && dataRoadmap.data.track !== selectedTrack) {
                    setSelectedTrack(dataRoadmap.data.track);
                }
                setPartialTasks(dataRoadmap.data.partialTasks || []);
                setWorkingUpcomingSubjects(dataRoadmap.data.upcomingSubjects || []);
                if (dataRoadmap.data.pendingBreakRequest !== undefined) {
                    setPendingBreakRequest(dataRoadmap.data.pendingBreakRequest);
                }
                if (dataRoadmap.data.pendingReorderRequest !== undefined) {
                    setPendingReorderRequest(dataRoadmap.data.pendingReorderRequest);
                }
                if (dataRoadmap.data.mentorshipAccountStatus) {
                    setMentorshipAccountStatus(dataRoadmap.data.mentorshipAccountStatus);
                }
            }
        } catch (e) {
            console.error('Fetch roadmap error:', e);
        } finally {
            setIsRoadmapLoading(false);
        }
    };

    const handleSelectTrack = (track: 'GS' | 'Optional' | 'Essay' | 'CA' | 'CSAT') => {
        setSelectedTrack(track);
        fetchRoadmap(track);
    };

    const handleRequestBreak = async () => {
        if (!breakReason) return;
        setIsSubmittingBreak(true);
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/break-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    reason: breakReason,
                    mode: breakMode,
                    returnDate: breakMode === 'fixed' ? breakReturnDate : undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPendingBreakRequest(data.data);
                setIsBreakModalOpen(false);
            }
        } catch (e) {
            console.error('Request break error:', e);
        } finally {
            setIsSubmittingBreak(false);
        }
    };

    const handleCancelBreakRequest = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/cancel-break-request`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setPendingBreakRequest(null);
            }
        } catch (e) {
            console.error('Cancel break request error:', e);
        }
    };

    const handleTellMentorReady = async () => {
        try {
            await fetch(`${API_URL}/api/mentorship-student/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    text: "Hello mentor, I have completed my break and am ready to resume my daily mentorship tasks. Please reactivate my daily schedule.",
                    threadType: 'mentor',
                }),
            });
            setActiveTab('chat');
        } catch (e) {
            console.error('Tell mentor ready error:', e);
        }
    };

    const handlePauseSubject = async () => {
        if (!roadmapData.currentSubject) return;
        setIsSubmittingPause(true);
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/pause-subject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subjectName: roadmapData.currentSubject.name,
                    courseId: roadmapData.currentSubject.courseId,
                    reason: pauseReason,
                    note: pauseNote,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setIsPauseModalOpen(false);
                setPauseNote('');
                fetchRoadmap();
            }
        } catch (e) {
            console.error('Pause subject error:', e);
        } finally {
            setIsSubmittingPause(false);
        }
    };

    const handleResumeSubject = async (subject: any) => {
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/resume-subject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subjectName: subject.name,
                    courseId: subject.courseId,
                }),
            });
            const data = await res.json();
            if (data.success) {
                fetchRoadmap();
            }
        } catch (e) {
            console.error('Resume subject error:', e);
        }
    };

    const handleMoveUpcoming = (fromIdx: number, toIdx: number) => {
        setWorkingUpcomingSubjects((prev) => {
            const next = [...prev];
            const [item] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, item);
            return next;
        });
    };

    const handleSubmitReorder = async () => {
        setIsSubmittingReorder(true);
        try {
            const proposedOrder = workingUpcomingSubjects.map((s) => s.courseId ? s.courseId : s.name);
            const res = await fetch(`${API_URL}/api/mentorship-student/reorder-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ proposedOrder }),
            });
            const data = await res.json();
            if (data.success) {
                setIsReorderModalOpen(false);
                setReorderMode(false);
                setPendingReorderRequest(data.data);
                fetchRoadmap();
            }
        } catch (e) {
            console.error('Submit reorder error:', e);
        } finally {
            setIsSubmittingReorder(false);
        }
    };

    const handleCompletePartialTask = async (pt: any) => {
        await handleMarkOverallTask(pt.tag, pt.dayNumber, 'completed', pt.courseId);
        setPartialTasks((prev) => prev.filter((t) => t._id !== pt._id));
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#f5ead8] flex flex-col items-center justify-center p-6 text-[#3d3a34]">
                <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-8 max-w-md text-center shadow-xl">
                    <div className="text-5xl mb-4">🎓</div>
                    <h2 className="text-2xl font-serif font-bold text-[#b8502a] mb-2">ShailajaIAS Mentorship</h2>
                    <p className="text-[#787163] text-sm mb-6 leading-relaxed">
                        Please sign in to access your daily tasks, subject roadmap, mentor chat, and uploads.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block px-6 py-3 bg-[#b8502a] hover:bg-[#a04322] text-white font-bold rounded-xl shadow-md transition-all"
                    >
                        Sign In to Access Platform
                    </Link>
                </div>
            </div>
        );
    }

    // Helper for week days
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const log = logsMap[dateStr];
        const isSelected = dateStr === selectedDateStr;
        const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isFuture = d > today;

        return {
            dow: DOW[i],
            dateStr,
            dateLabel: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
            hours: log ? log.hours : null,
            reason: log?.reason || '',
            isSelected,
            isToday,
            isFuture,
        };
    });

    // Build flattened array of Carousel Cards from Subscribed Courses
    const buildCarouselCards = () => {
        if (subscribedCourses.length === 0) {
            // Default demo sequence if no course is loaded
            return [
                {
                    type: 'task',
                    id: 'default_v_1',
                    courseTitle: 'Modern India Foundation',
                    tag: 'GS-ModernHistory',
                    dayNumber: 94,
                    title: 'Modern India — Revolt of 1857',
                    video: {
                        title: 'Revolt of 1857: causes, spread, consequences',
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        description: 'Comprehensive analysis of the Revolt of 1857, military mutiny, and impact on East India Company rule.',
                    },
                    ptsGroupCode: 'PTS-2026-MOD1',
                    mtsGroupCode: 'MTS-2026-MOD1',
                },
                {
                    type: 'task',
                    id: 'default_v_2',
                    courseTitle: 'Modern India Foundation',
                    tag: 'GS-ModernHistory',
                    dayNumber: 95,
                    title: 'Modern India — Government of India Act 1858 & Early Reformers',
                    video: {
                        title: 'Crown Rule & Socio-Religious Movements',
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        description: 'Detailed study of Crown takeover, Raja Ram Mohan Roy, Brahma Samaj and Arya Samaj.',
                    },
                    ptsGroupCode: 'PTS-2026-MOD1',
                    mtsGroupCode: 'MTS-2026-MOD1',
                },
                {
                    type: 'revision',
                    id: 'default_rev_1',
                    courseTitle: 'Modern India Foundation',
                    tag: 'GS-ModernHistory',
                    ptsGroupCode: 'PTS-2026-MOD1',
                    mtsGroupCode: 'MTS-2026-MOD1',
                },
            ];
        }

        const cards: any[] = [];
        subscribedCourses.forEach((c: any) => {
            // Check if course has custom sequenced taskCards configured by admin
            if (Array.isArray(c.taskCards) && c.taskCards.length > 0) {
                c.taskCards.forEach((tc: any, tcIdx: number) => {
                    if (tc.cardType === 'pts_test') {
                        cards.push({
                            type: 'pts_test',
                            id: `${c._id}_pts_${tcIdx}`,
                            courseId: c._id,
                            courseTitle: c.title,
                            tag: c.mentorTags?.[0] || 'PTS',
                            dayNumber: tc.dayNumber || (tcIdx + 1),
                            title: tc.title || tc.ptsTestTitle || `PTS Test #${tcIdx + 1}`,
                            ptsSeriesId: tc.ptsSeriesId,
                            ptsTestIndex: tc.ptsTestIndex ?? 0,
                            ptsTestTitle: tc.ptsTestTitle,
                            ptsQuizId: tc.ptsQuizId,
                            ptsQuestionPaperUrl: tc.ptsQuestionPaperUrl,
                            ptsSolutionPaperUrl: tc.ptsSolutionPaperUrl,
                            ptsDiscussionVideoUrl: tc.ptsDiscussionVideoUrl,
                            ptsSyllabus: tc.ptsSyllabus,
                        });
                    } else if (tc.cardType === 'mts_test') {
                        cards.push({
                            type: 'mts_test',
                            id: `${c._id}_mts_${tcIdx}`,
                            courseId: c._id,
                            courseTitle: c.title,
                            tag: c.mentorTags?.[0] || 'MTS',
                            dayNumber: tc.dayNumber || (tcIdx + 1),
                            title: tc.title || tc.mtsTestTitle || `MTS Test #${tcIdx + 1}`,
                            mtsSeriesId: tc.mtsSeriesId,
                            mtsTestIndex: tc.mtsTestIndex ?? 0,
                            mtsTestTitle: tc.mtsTestTitle,
                            mtsSubjectCategory: tc.mtsSubjectCategory || 'General Studies',
                            mtsQuestionPaperUrl: tc.mtsQuestionPaperUrl,
                            mtsSolutionPaperUrl: tc.mtsSolutionPaperUrl,
                            mtsDiscussionVideoUrl: tc.mtsDiscussionVideoUrl,
                            mtsSyllabus: tc.mtsSyllabus,
                        });
                    } else {
                        // Video card
                        cards.push({
                            type: 'task',
                            id: `${c._id}_tc_${tcIdx}`,
                            courseId: c._id,
                            courseTitle: c.title,
                            tag: c.mentorTags?.[0] || c.title || 'GS Foundation',
                            dayNumber: tc.dayNumber || (tcIdx + 1),
                            title: tc.title || `Task #${tcIdx + 1}`,
                            video: tc,
                            ptsGroupCode: c.ptsGroupCode || 'PTS-2026-01',
                            mtsGroupCode: c.mtsGroupCode || 'MTS-2026-01',
                        });
                    }
                });
            } else {
                // Fallback to legacy videos array + revision card
                const vList = c.videos && c.videos.length > 0 ? c.videos : [{ title: c.title, nodeTitle: c.title }];
                vList.forEach((v: any, vIdx: number) => {
                    cards.push({
                        type: 'task',
                        id: `${c._id}_v_${vIdx}`,
                        courseId: c._id,
                        courseTitle: c.title,
                        tag: c.mentorTags?.[0] || c.title || 'GS Foundation',
                        dayNumber: vIdx + 1,
                        title: v.nodeTitle || v.title || `Task #${vIdx + 1}`,
                        video: v,
                        ptsGroupCode: c.ptsGroupCode || 'PTS-2026-01',
                        mtsGroupCode: c.mtsGroupCode || 'MTS-2026-01',
                    });
                });
                // Revision Card at end of module
                cards.push({
                    type: 'revision',
                    id: `${c._id}_rev`,
                    courseId: c._id,
                    courseTitle: c.title,
                    tag: c.mentorTags?.[0] || c.title || 'GS Foundation',
                    ptsGroupCode: c.ptsGroupCode || 'PTS-2026-01',
                    mtsGroupCode: c.mtsGroupCode || 'MTS-2026-01',
                });
            }
        });
        return cards;
    };

    const carouselCards = buildCarouselCards();
    const activeCard = carouselCards[Math.min(currentCardIndex, carouselCards.length - 1)];

    const userHasMentorshipPurchased = (user?.purchasedMentorTags && user.purchasedMentorTags.length > 0) || isMentorshipStudent;

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#1E293B] font-sans pb-12">
            {/* Header Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="font-serif text-2xl font-bold text-[#1E3A5F]">ShailajaIAS</span>
                        <span className="text-xs tracking-widest text-slate-500 uppercase border-l border-slate-300 pl-3 font-semibold">
                            Mentorship Programme
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-800">{user?.name || 'Student'}</p>
                            {mentorshipAccountStatus === 'break' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> ON BREAK
                                </span>
                            ) : pendingBreakRequest ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> BREAK REQUESTED
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                                </span>
                            )}
                        </div>
                        {mentorshipAccountStatus === 'break' ? (
                            <button
                                onClick={handleTellMentorReady}
                                className="text-xs text-[#8c491a] hover:underline font-bold px-3 py-1.5 rounded-full border border-[#dcd3c4] bg-[#f9f4ed]"
                            >
                                Tell mentor I’m ready
                            </button>
                        ) : pendingBreakRequest ? (
                            <button
                                onClick={handleCancelBreakRequest}
                                className="text-xs text-rose-700 hover:underline font-bold px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50"
                            >
                                Withdraw break request
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsBreakModalOpen(true)}
                                className="text-xs text-[#645c50] hover:text-[#8c491a] font-semibold underline px-2 py-1"
                            >
                                Take a break
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation Tabs Bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex items-center gap-2 border-b border-slate-200">
                    {[
                        { id: 'daily', label: '• Daily Task' },
                        { id: 'roadmap', label: '• Roadmap' },
                        { id: 'chat', label: '• Chat' },
                        { id: 'uploads', label: '• Uploads' },
                        { id: 'mentorship', label: '• Mentorship' },
                    ].map((tab) => {
                        const on = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all ${
                                    on
                                        ? 'bg-white text-[#1E3A5F] border-t-2 border-t-[#1E3A5F] border-x border-slate-200 -mb-px font-bold shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
                {!userHasMentorshipPurchased && (
                    <div className="mb-6 bg-[#fff0e6] border border-[#ffd8c2] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🎓</span>
                            <div>
                                <p className="text-xs font-bold text-[#b8502a]">Mentorship Program Purchase Notice</p>
                                <p className="text-[11px] text-[#787163]">
                                    Detailed mentorship tracking is exclusive to students enrolled in Mentorship Modules. Browse catalogue to purchase master tags.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/mentorship"
                            className="px-4 py-2 bg-[#b8502a] hover:bg-[#a04322] text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-xs"
                        >
                            Explore Mentorship Modules →
                        </Link>
                    </div>
                )}

                {/* ----------------- 1. DAILY TASK MODULE ----------------- */}
                {activeTab === 'daily' && (
                    <div className="space-y-6">
                        {/* Week Strip Header Controls */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentCardIndex((p) => Math.max(0, p - 1))}
                                        className="w-8 h-8 rounded-full border border-[#e3d5bd] bg-[#fdfbf6] text-[#787163] hover:bg-[#f5ead8] flex items-center justify-center font-bold"
                                        title="Previous Task Card"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setCurrentCardIndex((p) => Math.min(carouselCards.length - 1, p + 1))}
                                        className="w-8 h-8 rounded-full border border-[#e3d5bd] bg-[#fdfbf6] text-[#787163] hover:bg-[#f5ead8] flex items-center justify-center font-bold"
                                        title="Next Task Card"
                                    >
                                        ›
                                    </button>
                                    <span className="text-sm font-bold text-[#3d3a34] ml-2">24 – 30 Aug 2026</span>
                                    <button
                                        onClick={() => setCurrentCardIndex(0)}
                                        className="text-xs bg-[#f5ead8] text-[#787163] px-3 py-1 rounded-full font-bold ml-2 hover:bg-[#e4d7c0]"
                                    >
                                        Today
                                    </button>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-[#787163] font-semibold uppercase tracking-wider">LOGGED: </span>
                                    <span className="text-base font-bold text-[#b8502a]">
                                        {weekDays.reduce((acc, d) => acc + (d.hours || 0), 0).toFixed(1)} h
                                    </span>
                                </div>
                            </div>

                            {/* 7-Day Strip Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                                {weekDays.map((d) => (
                                    <button
                                        key={d.dateStr}
                                        onClick={() => {
                                            if (!d.isFuture) {
                                                setSelectedDateStr(d.dateStr);
                                                if (d.hours !== null) setHoursInput(String(d.hours));
                                            }
                                        }}
                                        className={`p-4 rounded-2xl border text-center transition-all flex flex-col justify-between h-24 ${
                                            d.isSelected
                                                ? 'bg-[#ffe8d6] border-[#b8502a] shadow-sm'
                                                : d.isFuture
                                                ? 'bg-[#f7f0e4]/50 border-[#e8dcc8] opacity-60 cursor-not-allowed'
                                                : 'bg-[#f7f0e4] border-[#e8dcc8] hover:border-[#b8502a]'
                                        }`}
                                    >
                                        <div className="text-[11px] font-semibold text-[#787163] uppercase">
                                            {d.dateLabel}
                                            <p className="text-[9px] text-[#a09888] font-bold">{d.dow}</p>
                                        </div>
                                        <div className="text-lg font-bold text-[#3d3a34]">
                                            {d.hours !== null ? `${d.hours} h` : d.isFuture ? '—' : 'Not logged'}
                                        </div>
                                        {d.reason && (
                                            <span className="text-[9px] font-bold text-[#b8502a] bg-[#fff0e6] px-1.5 py-0.5 rounded border border-[#ffd8c2]">
                                                {d.reason}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Revise Entry Console */}
                            <div className="bg-[#fff5ea] border border-[#ffd8c2] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">REVISE ENTRY</span>
                                    <h4 className="text-base font-bold text-[#3d3a34]">{selectedDateStr}</h4>
                                    <p className="text-xs text-[#787163]">The original submission time is kept on record.</p>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-[#787163] uppercase">HOURS</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={hoursInput}
                                            onChange={(e) => setHoursInput(e.target.value)}
                                            className="w-24 px-3 py-2 bg-[#f5ead8] border border-[#e3d5bd] rounded-xl font-bold text-center text-sm focus:outline-none focus:border-[#b8502a]"
                                        />
                                    </div>

                                    {parseFloat(hoursInput) < 1 && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#b8502a] uppercase">REASON (&lt; 1H)</span>
                                            <select
                                                value={reasonInput}
                                                onChange={(e) => setReasonInput(e.target.value)}
                                                className="px-3 py-2 bg-[#f5ead8] border border-[#e3d5bd] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#b8502a]"
                                            >
                                                <option value="">Select reason...</option>
                                                {REASONS.map((r) => (
                                                    <option key={r} value={r}>
                                                        {r}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSaveHours}
                                        className="bg-[#b8502a] hover:bg-[#a04322] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors self-end"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Track Filter Chips */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {TRACKS.map((t) => {
                                const on = activeTrack === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTrack(t.id)}
                                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                                            on
                                                ? 'bg-[#b8502a] text-white shadow-sm'
                                                : 'bg-[#fffdf8] text-[#787163] border border-[#e3d5bd] hover:border-[#b8502a]'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* FOCAL TASK CARD (LEFT / RIGHT CAROUSEL CONTAINER) */}
                        {activeCard && (
                            <div className="bg-[#fffdf8] border-2 border-[#e3d5bd] rounded-3xl p-6 sm:p-8 shadow-md space-y-6 relative">
                                {/* Carousel Header Controls */}
                                <div className="flex items-center justify-between border-b border-[#f0e6d4] pb-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentCardIndex((p) => Math.max(0, p - 1))}
                                            disabled={currentCardIndex === 0}
                                            className="w-9 h-9 rounded-full border border-[#e3d5bd] bg-[#f5ead8] text-[#3d3a34] font-bold hover:bg-[#b8502a] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center text-base cursor-pointer"
                                            title="Previous Card"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            onClick={() => setCurrentCardIndex((p) => Math.min(carouselCards.length - 1, p + 1))}
                                            disabled={currentCardIndex === carouselCards.length - 1}
                                            className="w-9 h-9 rounded-full border border-[#e3d5bd] bg-[#f5ead8] text-[#3d3a34] font-bold hover:bg-[#b8502a] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center text-base cursor-pointer"
                                            title="Next Card"
                                        >
                                            ›
                                        </button>
                                        <button
                                            onClick={() => setCurrentCardIndex(0)}
                                            className="px-3.5 py-1.5 rounded-full border border-[#e3d5bd] bg-[#f5ead8] text-[#3d3a34] hover:bg-[#b8502a] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                            title="Jump to Today's Card"
                                        >
                                            Today
                                        </button>
                                        <span className="text-xs font-bold text-[#787163] uppercase tracking-wider ml-2">
                                            CARD {currentCardIndex + 1} OF {carouselCards.length}
                                        </span>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-[#b8502a] bg-[#fff0e6] px-3 py-1 rounded-full border border-[#ffd8c2]">
                                            #{activeCard.tag}
                                        </span>
                                    </div>
                                </div>

                                {/* CARD CONTENT: TASK vs REVISION */}
                                {activeCard.type === 'task' ? (
                                    <div className="space-y-6">
                                        <div>
                                            <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">
                                                CURRENT TASK · DAY {activeCard.dayNumber}{activeCard.courseTitle ? ` · ${activeCard.courseTitle.toUpperCase()}` : ''}
                                            </span>
                                            <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#2d2a24] mt-1 tracking-tight">
                                                {activeCard.title}
                                            </h3>
                                        </div>

                                        <div className="divide-y divide-[#eee4d6] border-y border-[#eee4d6]">
                                            {/* Row 01: Watch Video */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_watch`;
                                                const done = !!taskProgressMap[key] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_watch`] : false);
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <span className="w-8 h-8 rounded-full border border-[#d2c4b2] bg-[#faf6f0] text-[#6d6455] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                                                01
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm sm:text-base font-bold text-[#2d2a24] truncate">
                                                                    Watch Video — {activeCard.video?.title || activeCard.title}
                                                                </p>
                                                                <p className="text-xs text-[#787163]">Video Lecture • In-Page Player</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleToggleStep(activeCard.tag, activeCard.dayNumber, 'watch', true, undefined, undefined, activeCard.courseId);
                                                                    setActiveModal({ type: 'video', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber, courseId: activeCard.courseId } });
                                                                }}
                                                                className="h-9 px-3 sm:px-3.5 rounded-xl border border-[#d2c4b2] hover:border-[#b8502a] text-[#554e42] hover:text-[#b8502a] hover:bg-[#fff5ea] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                                title="Watch Video (Auto-marks done)"
                                                            >
                                                                <span className="hidden sm:inline">Watch Video</span>
                                                                <span className="text-sm leading-none font-bold">↗</span>
                                                            </button>

                                                            {done ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'watch', false, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-4 rounded-full bg-[#3d5634] hover:bg-[#2c3f25] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                                    title="Click to undo done status"
                                                                >
                                                                    <span>Done</span>
                                                                    <span className="text-sm leading-none">✓</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'watch', true, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-3.5 rounded-full border border-[#d2c4b2] hover:border-[#3d5634] text-[#787163] hover:text-[#3d5634] bg-white/70 hover:bg-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                                                                    title="Mark as done"
                                                                >
                                                                    <span>Mark Done</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Row 02: Recall Notes */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_notes`;
                                                const done = !!taskProgressMap[key] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_notes`] : false);
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <span className="w-8 h-8 rounded-full border border-[#d2c4b2] bg-[#faf6f0] text-[#6d6455] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                                                02
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm sm:text-base font-bold text-[#2d2a24] truncate">
                                                                    Recall Notes — Active Recall &amp; PDF Handout
                                                                </p>
                                                                <p className="text-xs text-[#787163]">Study Handout • Printable Notes</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleToggleStep(activeCard.tag, activeCard.dayNumber, 'notes', true, undefined, undefined, activeCard.courseId);
                                                                    setActiveModal({ type: 'notes', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber, courseId: activeCard.courseId } });
                                                                }}
                                                                className="h-9 px-3 sm:px-3.5 rounded-xl border border-[#d2c4b2] hover:border-[#b8502a] text-[#554e42] hover:text-[#b8502a] hover:bg-[#fff5ea] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                                title="Open Notes (Auto-marks done)"
                                                            >
                                                                <span className="hidden sm:inline">Open Notes</span>
                                                                <span className="text-sm leading-none font-bold">↗</span>
                                                            </button>

                                                            {done ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'notes', false, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-4 rounded-full bg-[#3d5634] hover:bg-[#2c3f25] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                                    title="Click to undo done status"
                                                                >
                                                                    <span>Done</span>
                                                                    <span className="text-sm leading-none">✓</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'notes', true, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-3.5 rounded-full border border-[#d2c4b2] hover:border-[#3d5634] text-[#787163] hover:text-[#3d5634] bg-white/70 hover:bg-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                                                                    title="Mark as done"
                                                                >
                                                                    <span>Mark Done</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Row 03: Take Test */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_test`;
                                                const done = !!taskProgressMap[key] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_test`] : false);
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <span className="w-8 h-8 rounded-full border border-[#d2c4b2] bg-[#faf6f0] text-[#6d6455] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                                                03
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm sm:text-base font-bold text-[#2d2a24] truncate">
                                                                    Take Test — Sectional Topic Quiz
                                                                </p>
                                                                <p className="text-xs text-[#787163]">Prelims MCQ Solver In-Modal</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleToggleStep(activeCard.tag, activeCard.dayNumber, 'test', true, undefined, undefined, activeCard.courseId);
                                                                    setQuizAnswers({});
                                                                    setQuizSubmitted(false);
                                                                    setActiveModal({ type: 'test', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber, courseId: activeCard.courseId } });
                                                                }}
                                                                className="h-9 px-3 sm:px-3.5 rounded-xl border border-[#d2c4b2] hover:border-[#b8502a] text-[#554e42] hover:text-[#b8502a] hover:bg-[#fff5ea] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                                title="Take Test (Auto-marks done)"
                                                            >
                                                                <span className="hidden sm:inline">Take Test</span>
                                                                <span className="text-sm leading-none font-bold">↗</span>
                                                            </button>

                                                            {done ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'test', false, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-4 rounded-full bg-[#3d5634] hover:bg-[#2c3f25] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                                    title="Click to undo done status"
                                                                >
                                                                    <span>Done</span>
                                                                    <span className="text-sm leading-none">✓</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'test', true, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-3.5 rounded-full border border-[#d2c4b2] hover:border-[#3d5634] text-[#787163] hover:text-[#3d5634] bg-white/70 hover:bg-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                                                                    title="Mark as done"
                                                                >
                                                                    <span>Mark Done</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Row 04: Upload Answer */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_upload`;
                                                const done = !!taskProgressMap[key] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_upload`] : false);
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <span className="w-8 h-8 rounded-full border border-[#d2c4b2] bg-[#faf6f0] text-[#6d6455] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                                                04
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm sm:text-base font-bold text-[#2d2a24] truncate">
                                                                    Upload Answer — Mains Practice Script Submission
                                                                </p>
                                                                <p className="text-xs text-[#787163]">Upload PDF Answer • Tracked in Uploads tab</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleToggleStep(activeCard.tag, activeCard.dayNumber, 'upload', true, undefined, undefined, activeCard.courseId);
                                                                    setUploadFile(null);
                                                                    setUploadMsg('');
                                                                    setActiveModal({ type: 'upload', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber, courseId: activeCard.courseId } });
                                                                }}
                                                                className="h-9 px-3 sm:px-3.5 rounded-xl border border-[#d2c4b2] hover:border-[#b8502a] text-[#554e42] hover:text-[#b8502a] hover:bg-[#fff5ea] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                                title="Upload Answer (Auto-marks done)"
                                                            >
                                                                <span className="hidden sm:inline">Upload Answer</span>
                                                                <span className="text-sm leading-none font-bold">↗</span>
                                                            </button>

                                                            {done ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'upload', false, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-4 rounded-full bg-[#3d5634] hover:bg-[#2c3f25] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                                    title="Click to undo done status"
                                                                >
                                                                    <span>Done</span>
                                                                    <span className="text-sm leading-none">✓</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'upload', true, undefined, undefined, activeCard.courseId)}
                                                                    className="h-9 px-3.5 rounded-full border border-[#d2c4b2] hover:border-[#3d5634] text-[#787163] hover:text-[#3d5634] bg-white/70 hover:bg-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                                                                    title="Mark as done"
                                                                >
                                                                    <span>Mark Done</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Card Footer Bar: Two explicit Buttons (Partially Done & Completed with Undo) */}
                                        {(() => {
                                            const isOverallDone = !!taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_overall`] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_overall`] : false);
                                            const isPartialDone = !!taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_partial`] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_partial`] : false);
                                            return (
                                                <div className="pt-5 border-t border-[#f0e6d4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                    <span className="text-xs text-[#787163] font-medium">
                                                        Task Tracking Status:{' '}
                                                        <strong className={isOverallDone ? 'text-emerald-700' : isPartialDone ? 'text-amber-700' : 'text-[#787163]'}>
                                                            {isOverallDone
                                                                ? 'Completed ✓'
                                                                : isPartialDone
                                                                ? 'Partially Done 🟡'
                                                                : 'In Progress'}
                                                        </strong>
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'partial', activeCard.courseId)}
                                                            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                isPartialDone && !isOverallDone
                                                                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-xs'
                                                                    : 'bg-[#fff5ea] hover:bg-[#ffe8d6] text-[#b8502a] border border-[#ffd8c2] shadow-2xs'
                                                            }`}
                                                            title={isPartialDone ? 'Click to undo partially done' : 'Mark as partially done'}
                                                        >
                                                            <span>🟡</span> {isPartialDone && !isOverallDone ? 'Partially Done (Undo)' : 'Mark Partially Done'}
                                                        </button>

                                                        <button
                                                            onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'completed', activeCard.courseId)}
                                                            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                isOverallDone
                                                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                            title={isOverallDone ? 'Click to undo completed' : 'Mark as completed'}
                                                        >
                                                            <span>✓</span> {isOverallDone ? 'Completed ✓ (Click to Undo)' : 'Mark Completed'}
                                                        </button>

                                                        {currentCardIndex < carouselCards.length - 1 && (
                                                            <button
                                                                onClick={() => setCurrentCardIndex((p) => p + 1)}
                                                                className="px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                                                            >
                                                                Next Task →
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : activeCard.type === 'pts_test' ? (
                                    /* PTS Prelims Test Card */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                                📝 PRELIMS TEST SERIES (PTS) • TASK #{activeCard.dayNumber}
                                            </span>
                                            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                                                Prelims Mock Test
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                {activeCard.courseTitle}
                                            </span>
                                            <h3 className="text-2xl font-serif font-bold text-slate-800 mt-1">
                                                {activeCard.title}
                                            </h3>
                                        </div>

                                        <div className="p-5 bg-white rounded-2xl border border-amber-200 space-y-4 shadow-xs">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">
                                                        {activeCard.ptsTestTitle || activeCard.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        Full sectional MCQ practice paper with UPSC negative scoring and instant explanation analysis.
                                                    </p>
                                                </div>
                                                {activeCard.ptsQuizId && (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                                        Online Quiz Attached
                                                    </span>
                                                )}
                                            </div>

                                            {activeCard.ptsSyllabus && (
                                                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                    <span className="font-bold text-slate-700">Test Syllabus: </span>
                                                    {activeCard.ptsSyllabus}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                                <div className="flex items-center gap-3">
                                                    {activeCard.ptsQuestionPaperUrl && (
                                                        <a
                                                            href={activeCard.ptsQuestionPaperUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
                                                        >
                                                            📄 Download Paper
                                                        </a>
                                                    )}
                                                    {activeCard.ptsDiscussionVideoUrl && (
                                                        <a
                                                            href={activeCard.ptsDiscussionVideoUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
                                                        >
                                                            🎥 Discussion Video
                                                        </a>
                                                    )}
                                                </div>

                                                <Link
                                                    href={`/tests/prelims-test-series${activeCard.ptsSeriesId ? `?id=${activeCard.ptsSeriesId}&test=${activeCard.ptsTestIndex ?? 0}` : ''}`}
                                                    onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'completed', activeCard.courseId)}
                                                    className="px-6 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                                >
                                                    <span>📝</span> Go to Prelims Test Series →
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Tracking CTAs */}
                                        {(() => {
                                            const isOverallDone = !!taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_overall`] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_overall`] : false);
                                            const isPartialDone = !!taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_partial`] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_partial`] : false);
                                            return (
                                                <div className="pt-4 border-t border-[#f0e6d4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                    <span className="text-xs text-[#787163] font-medium">
                                                        Test Tracking:{' '}
                                                        <strong className={isOverallDone ? 'text-emerald-700' : isPartialDone ? 'text-amber-700' : 'text-[#787163]'}>
                                                            {isOverallDone
                                                                ? 'Completed ✓'
                                                                : isPartialDone
                                                                ? 'Partially Done 🟡'
                                                                : 'In Progress'}
                                                        </strong>
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'partial', activeCard.courseId)}
                                                            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                isPartialDone && !isOverallDone
                                                                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-xs'
                                                                    : 'bg-[#fff5ea] hover:bg-[#ffe8d6] text-[#b8502a] border border-[#ffd8c2] shadow-2xs'
                                                            }`}
                                                            title={isPartialDone ? 'Click to undo partially done' : 'Mark as partially done'}
                                                        >
                                                            <span>🟡</span> {isPartialDone && !isOverallDone ? 'Partially Done (Undo)' : 'Mark Partially Done'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'completed', activeCard.courseId)}
                                                            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                isOverallDone
                                                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                            title={isOverallDone ? 'Click to undo completed' : 'Mark as completed'}
                                                        >
                                                            <span>✓</span> {isOverallDone ? 'Completed ✓ (Click to Undo)' : 'Mark Completed'}
                                                        </button>
                                                        {currentCardIndex < carouselCards.length - 1 && (
                                                            <button
                                                                onClick={() => setCurrentCardIndex((p) => p + 1)}
                                                                className="px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                                                            >
                                                                Next Task →
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : activeCard.type === 'mts_test' ? (
                                    /* MTS Mains Test Card */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                                                ✍️ MAINS TEST SERIES (MTS) • TASK #{activeCard.dayNumber}
                                            </span>
                                            <span className="text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full">
                                                {activeCard.mtsSubjectCategory || 'Mains Evaluation'}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                {activeCard.courseTitle}
                                            </span>
                                            <h3 className="text-2xl font-serif font-bold text-slate-800 mt-1">
                                                {activeCard.title}
                                            </h3>
                                        </div>

                                        <div className="p-5 bg-white rounded-2xl border border-teal-200 space-y-4 shadow-xs">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">
                                                        {activeCard.mtsTestTitle || activeCard.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        Handwritten answer writing test paper. Submit your PDF to your assigned mentor for line-by-line feedback.
                                                    </p>
                                                </div>
                                                {activeCard.mtsSubjectCategory && (
                                                    <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-full">
                                                        {activeCard.mtsSubjectCategory}
                                                    </span>
                                                )}
                                            </div>

                                            {activeCard.mtsSyllabus && (
                                                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                    <span className="font-bold text-slate-700">Test Syllabus: </span>
                                                    {activeCard.mtsSyllabus}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                                <div className="flex items-center gap-3">
                                                    {activeCard.mtsQuestionPaperUrl && (
                                                        <a
                                                            href={activeCard.mtsQuestionPaperUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
                                                        >
                                                            📄 Question Paper PDF
                                                        </a>
                                                    )}
                                                    {activeCard.mtsDiscussionVideoUrl && (
                                                        <a
                                                            href={activeCard.mtsDiscussionVideoUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
                                                        >
                                                            🎥 Approach Video
                                                        </a>
                                                    )}
                                                </div>

                                                <Link
                                                    href={`/tests/mains-test-series${activeCard.mtsSeriesId ? `?id=${activeCard.mtsSeriesId}&test=${activeCard.mtsTestIndex ?? 0}` : ''}`}
                                                    onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'completed', activeCard.courseId)}
                                                    className="px-6 py-2.5 bg-[#0D9488] hover:bg-[#0A746B] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                                >
                                                    <span>✍️</span> Go to Mains Test Series →
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Tracking CTAs */}
                                        {(() => {
                                            const isOverallDone = !!taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_overall`] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_overall`] : false);
                                            const isPartialDone = !!taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_partial`] || (activeCard.courseId ? !!taskProgressMap[`${activeCard.courseId}_${activeCard.dayNumber}_partial`] : false);
                                            return (
                                                <div className="pt-4 border-t border-[#f0e6d4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                    <span className="text-xs text-[#787163] font-medium">
                                                        Test Tracking:{' '}
                                                        <strong className={isOverallDone ? 'text-emerald-700' : isPartialDone ? 'text-amber-700' : 'text-[#787163]'}>
                                                            {isOverallDone
                                                                ? 'Completed ✓'
                                                                : isPartialDone
                                                                ? 'Partially Done 🟡'
                                                                : 'In Progress'}
                                                        </strong>
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'partial', activeCard.courseId)}
                                                            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                isPartialDone && !isOverallDone
                                                                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-xs'
                                                                    : 'bg-[#fff5ea] hover:bg-[#ffe8d6] text-[#b8502a] border border-[#ffd8c2] shadow-2xs'
                                                            }`}
                                                            title={isPartialDone ? 'Click to undo partially done' : 'Mark as partially done'}
                                                        >
                                                            <span>🟡</span> {isPartialDone && !isOverallDone ? 'Partially Done (Undo)' : 'Mark Partially Done'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'completed', activeCard.courseId)}
                                                            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                isOverallDone
                                                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                            title={isOverallDone ? 'Click to undo completed' : 'Mark as completed'}
                                                        >
                                                            <span>✓</span> {isOverallDone ? 'Completed ✓ (Click to Undo)' : 'Mark Completed'}
                                                        </button>
                                                        {currentCardIndex < carouselCards.length - 1 && (
                                                            <button
                                                                onClick={() => setCurrentCardIndex((p) => p + 1)}
                                                                className="px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                                                            >
                                                                Next Task →
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    /* Course Revision Checkpoint Card */
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider bg-[#fff0e6] px-3 py-1 rounded-full border border-[#ffd8c2]">
                                                🔁 COURSE REVISION CHECKPOINT
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                                                Module Complete
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-serif font-bold text-[#3d3a34]">
                                            Course Revision &amp; Test Series — {activeCard.courseTitle}
                                        </h3>
                                        <p className="text-xs text-[#787163] leading-relaxed">
                                            Review your overall course notes, attempt the attached Prelims Test Series (PTS) paper, and submit your Mains Test Series (MTS) answer script before advancing.
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                            <div className="p-5 bg-white rounded-2xl border border-[#e3d5bd] space-y-3 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[#3d3a34]">Prelims Test Series (PTS)</span>
                                                    <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                                                        #{activeCard.ptsGroupCode}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[#787163]">Full subject sectional tests linked to this course.</p>
                                                <Link
                                                    href="/tests/prelims-test-series"
                                                    className="inline-block mt-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl border border-teal-200 transition-colors"
                                                >
                                                    Open PTS Test Series ↗
                                                </Link>
                                            </div>

                                            <div className="p-5 bg-white rounded-2xl border border-[#e3d5bd] space-y-3 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[#3d3a34]">Mains Test Series (MTS)</span>
                                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                                        #{activeCard.mtsGroupCode}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[#787163]">Full subject Mains evaluation papers linked to this course.</p>
                                                <Link
                                                    href="/tests/mains-test-series"
                                                    className="inline-block mt-2 text-xs font-bold text-[#b8502a] bg-[#fff0e6] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2] transition-colors"
                                                >
                                                    Open MTS Test Series ↗
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-[#f0e6d4] flex justify-end">
                                            <button
                                                onClick={() => {
                                                    if (currentCardIndex < carouselCards.length - 1) {
                                                        setCurrentCardIndex((p) => p + 1);
                                                    }
                                                }}
                                                className="px-6 py-2.5 rounded-xl bg-[#b8502a] hover:bg-[#a04322] text-white text-xs font-bold shadow-md transition-colors"
                                            >
                                                Mark Revision Complete &amp; Unlock Next Course →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ----------------- 2. ROADMAP MODULE ----------------- */}
                {activeTab === 'roadmap' && (
                    <div className="bg-[#f5ead8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                        {/* Top Bar: Title & Date */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-serif font-bold text-[#201e1d]">Roadmap</h2>
                            <div className="text-base font-serif font-medium text-[#201e1d] tabular-nums">
                                {today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                        </div>

                        {/* Track Pills: GS, Optional, Essay, CA, CSAT */}
                        <div className="flex flex-wrap items-center gap-3">
                            {[
                                { id: 'GS', label: 'GS' },
                                { id: 'Optional', label: 'Optional' },
                                { id: 'Essay', label: 'Essay' },
                                { id: 'CA', label: 'CA' },
                                { id: 'CSAT', label: 'CSAT' },
                            ].map((tr) => {
                                const isSel = selectedTrack === tr.id;
                                const hasDot = (roadmapData.activeTracks || []).includes(tr.id);
                                return (
                                    <div key={tr.id} className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={() => handleSelectTrack(tr.id as any)}
                                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                                                isSel
                                                    ? 'bg-[#7c3a1e] text-white border border-[#643312] shadow-xs'
                                                    : 'bg-[#f9f4ed] text-[#645c50] border border-[#c0b6a5] hover:bg-[#eee7db]'
                                            }`}
                                        >
                                            {tr.label}
                                        </button>
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                                                hasDot ? 'bg-[#7a8a5e]' : 'bg-transparent'
                                            }`}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Subtabs: Subjects vs Partially done */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRoadmapSubTab('subjects')}
                                className={`flex-1 py-2.5 rounded-full text-xs font-bold text-center transition-all ${
                                    roadmapSubTab === 'subjects'
                                        ? 'bg-[#7c3a1e] text-white shadow-xs'
                                        : 'border border-[#c0b6a5] bg-transparent text-[#645c50] hover:bg-[#f9f4ed]'
                                }`}
                            >
                                Subjects
                            </button>
                            <button
                                onClick={() => setRoadmapSubTab('partial')}
                                className={`flex-1 py-2.5 rounded-full text-xs font-medium text-center transition-all ${
                                    roadmapSubTab === 'partial'
                                        ? 'bg-[#7c3a1e] text-white shadow-xs font-bold'
                                        : 'border border-[#c0b6a5] bg-transparent text-[#645c50] hover:bg-[#f9f4ed]'
                                }`}
                            >
                                Partially done · {partialTasks.length}
                            </button>
                        </div>

                        {/* Main Tab Content */}
                        {roadmapSubTab === 'subjects' ? (
                            isRoadmapLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                                    <div className="w-7 h-7 border-2 border-[#7c3a1e] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-[#787163] font-mono">Syncing profile roadmap...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Stat Strip */}
                                    {roadmapData.statStrip && (
                                        <div className="text-[11px] tracking-[0.08em] uppercase text-[#645c50] font-semibold pb-3 border-b border-[#c0b6a5]/60 font-mono">
                                            {roadmapData.statStrip}
                                        </div>
                                    )}

                                    {/* Empty State when no courses in this track */}
                                    {!roadmapData.currentSubject &&
                                        roadmapData.completedSubjects.length === 0 &&
                                        roadmapData.pausedSubjects.length === 0 &&
                                        workingUpcomingSubjects.length === 0 && (
                                             <div className="border border-dashed border-[#c0b6a5] rounded-3xl p-10 text-center bg-[#fffdf8] space-y-2">
                                                <div className="w-12 h-12 rounded-full bg-[#f5ead8] text-[#7c3a1e] flex items-center justify-center mx-auto text-xl font-bold">
                                                    📚
                                                </div>
                                                <h3 className="font-serif text-base font-bold text-[#3d3a34]">
                                                    No {selectedTrack} Courses Enrolled
                                                </h3>
                                                <p className="text-xs text-[#787163] max-w-md mx-auto">
                                                    You currently have no {selectedTrack} subjects linked to your mentorship profile. When your mentor assigns or you subscribe to {selectedTrack} course modules, your roadmap and task schedule will appear here.
                                                </p>
                                            </div>
                                        )}

                                {/* COMPLETED SUBJECTS SECTION */}
                                {roadmapData.completedSubjects.length > 0 && (
                                    <div>
                                        <div className="text-[10px] tracking-[0.14em] uppercase text-[#787163] font-bold mb-2">
                                            COMPLETED SUBJECTS
                                        </div>
                                        <div className="divide-y divide-[#e3d5bd]/60">
                                            {roadmapData.completedSubjects.map((subj, idx) => (
                                                <div key={idx} className="flex items-center gap-3 py-2.5">
                                                    <span className="w-5 h-5 rounded-full border border-[#ccdbb2] bg-[#f0fae1] text-[#56633f] flex items-center justify-center text-xs font-bold shrink-0">
                                                        ✓
                                                    </span>
                                                    <span className="font-serif text-[15px] font-semibold text-[#201e1d]">
                                                        {subj.name}
                                                    </span>
                                                    <span className="ml-auto text-xs text-[#787163] font-mono tabular-nums">
                                                        {subj.totalTasks} tasks{subj.startedOn ? ` · ${subj.startedOn}` : ''}{subj.finishedOn ? ` – ${subj.finishedOn}` : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CURRENT SUBJECT SECTION */}
                                {roadmapData.currentSubject && (
                                    <div>
                                        <div className="text-[10px] tracking-[0.14em] uppercase text-[#787163] font-bold mb-2">
                                            CURRENT SUBJECT
                                        </div>
                                        <div className="border border-[#e3d5bd] rounded-3xl bg-[#fffdf8] p-6 shadow-sm">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className="text-[10px] tracking-[0.14em] uppercase font-bold text-[#b8502a]">
                                                        IN PROGRESS
                                                    </span>
                                                    <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.34em] text-[#201e1d] uppercase mt-2">
                                                        {roadmapData.currentSubject.name.split('').join(' ')}
                                                    </h3>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="text-[10px] tracking-[0.12em] uppercase text-[#787163]">
                                                        TAKE TEST
                                                    </div>
                                                    <div className="font-serif text-2xl text-[#201e1d] font-semibold mt-0.5 tabular-nums">
                                                        {roadmapData.currentSubject.targetTestDate || 'To be scheduled'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-[#787163] mt-2 font-mono tabular-nums">
                                                {roadmapData.currentSubject.startedOn ? `Start Date: ${roadmapData.currentSubject.startedOn} | ` : ''}Days in this subject: {roadmapData.currentSubject.daysInSubject ?? 0} | Tasks Completed: {roadmapData.currentSubject.completedTasks}/{roadmapData.currentSubject.totalTasks}
                                            </div>

                                            <div className="mt-3 h-2.5 bg-[#eee7db] rounded-full overflow-hidden border border-[#dcd3c4]">
                                                <div
                                                    className="h-full bg-[#f6a06b] rounded-full transition-all duration-500"
                                                    style={{ width: `${roadmapData.currentSubject.percentage || 0}%` }}
                                                />
                                            </div>

                                            <div className="mt-1.5 flex justify-between text-xs text-[#787163] font-medium font-mono tabular-nums">
                                                <span>{roadmapData.currentSubject.completedTasks} of {roadmapData.currentSubject.totalTasks} tasks complete</span>
                                                <span className="font-bold">{roadmapData.currentSubject.percentage}%</span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-3">
                                                {roadmapData.currentSubject.state === 'paused' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded-full text-xs font-bold">
                                                            PAUSED ({roadmapData.currentSubject.pauseReason || 'Paused'})
                                                        </span>
                                                        <button
                                                            onClick={() => handleResumeSubject(roadmapData.currentSubject)}
                                                            className="px-4 py-1.5 bg-[#7c3a1e] text-white rounded-full text-xs font-bold hover:bg-[#643312] transition-colors"
                                                        >
                                                            Resume
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsPauseModalOpen(true)}
                                                        className="px-4 py-2 rounded-full border border-[#dcd3c4] bg-[#f9f4ed] hover:bg-[#eee7db] text-xs font-semibold text-[#3d3a34] transition-colors shadow-2xs"
                                                    >
                                                        Pause this subject
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PAUSED SUBJECTS SECTION */}
                                {roadmapData.pausedSubjects.length > 0 && (
                                    <div>
                                        <div className="text-[10px] tracking-[0.14em] uppercase text-[#787163] font-bold mb-2">
                                            PAUSED SUBJECTS
                                        </div>
                                        <div className="space-y-2">
                                            {roadmapData.pausedSubjects.map((ps, idx) => {
                                                const isOpen = pausedAccordionOpen === (ps.courseId || ps.name);
                                                return (
                                                    <div key={idx} className="border border-[#e3d5bd] rounded-2xl bg-[#fffdf8] overflow-hidden">
                                                        <button
                                                            onClick={() => setPausedAccordionOpen(isOpen ? null : (ps.courseId || ps.name))}
                                                            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#f9f4ed]"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg text-[#7c3a1e] font-mono">{isOpen ? '▾' : '›'}</span>
                                                                <span className="font-serif text-[15px] font-semibold text-[#201e1d]">{ps.name}</span>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                                PAUSED
                                                            </span>
                                                        </button>
                                                        {isOpen && (
                                                            <div className="px-5 pb-4 pt-2 border-t border-[#f0e6d4] flex items-center justify-between text-xs text-[#787163] font-mono">
                                                                <span>Tasks: {ps.completedTasks}/{ps.totalTasks} · Reason: {ps.pauseReason || 'Student request'}</span>
                                                                <button
                                                                    onClick={() => handleResumeSubject(ps)}
                                                                    className="px-3.5 py-1 bg-[#7c3a1e] text-white rounded-full text-xs font-bold hover:bg-[#643312]"
                                                                >
                                                                    Resume
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* UPCOMING SUBJECTS SECTION */}
                                {workingUpcomingSubjects.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] tracking-[0.14em] uppercase text-[#787163] font-bold">
                                                    UPCOMING SUBJECTS
                                                </span>
                                                {pendingReorderRequest && (
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                        Reorder pending approval
                                                    </span>
                                                )}
                                            </div>
                                            {!reorderMode && !pendingReorderRequest && workingUpcomingSubjects.length > 1 && (
                                                <button
                                                    onClick={() => setReorderMode(true)}
                                                    className="text-xs font-bold text-[#8c491a] underline hover:opacity-80 cursor-pointer"
                                                >
                                                    Reorder
                                                </button>
                                            )}
                                            {reorderMode && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setReorderMode(false);
                                                            setWorkingUpcomingSubjects(roadmapData.upcomingSubjects || []);
                                                        }}
                                                        className="text-xs font-bold text-[#787163] underline cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => setIsReorderModalOpen(true)}
                                                        className="px-4 py-1.5 bg-[#7c3a1e] text-white rounded-full text-xs font-bold shadow-xs hover:bg-[#643312]"
                                                    >
                                                        Submit order
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {workingUpcomingSubjects.map((subj, idx) => (
                                                <div
                                                    key={idx}
                                                    className="border border-[#e3d5bd] rounded-3xl bg-[#f9f4ed] p-6 shadow-2xs"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <span className="text-[10px] tracking-[0.14em] uppercase font-bold text-[#787163]">
                                                                UPCOMING
                                                            </span>
                                                            <h4 className="font-serif text-xl sm:text-2xl font-bold tracking-[0.34em] text-[#3d3a34] uppercase mt-2">
                                                                {subj.name.split('').join(' ')}
                                                            </h4>
                                                        </div>
                                                        <div className="text-right whitespace-nowrap">
                                                            <div className="text-[10px] tracking-[0.12em] uppercase text-[#787163]">
                                                                TAKE TEST
                                                            </div>
                                                            <div className="font-serif text-2xl text-[#201e1d] font-semibold mt-0.5 tabular-nums">
                                                                {subj.targetTestDate || 'To be scheduled'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-xs text-[#787163] mt-2 font-mono tabular-nums">
                                                        {subj.startedOn ? `Start Date: ${subj.startedOn} | ` : ''}Tasks: {subj.totalTasks} | Tasks Completed: {subj.completedTasks}/{subj.totalTasks}
                                                    </div>

                                                    <div className="mt-3 h-2.5 bg-[#eee7db] rounded-full overflow-hidden border border-[#dcd3c4]">
                                                        <div
                                                            className="h-full bg-[#f6a06b] rounded-full"
                                                            style={{ width: `${subj.percentage || 0}%` }}
                                                        />
                                                    </div>

                                                    <div className="mt-1.5 flex justify-between text-xs text-[#787163] font-medium font-mono tabular-nums">
                                                        <span>{subj.completedTasks} of {subj.totalTasks} tasks complete</span>
                                                        <span>{subj.percentage || 0}%</span>
                                                    </div>

                                                    {reorderMode && (
                                                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#e3d5bd]">
                                                            <button
                                                                onClick={() => handleMoveUpcoming(idx, Math.max(0, idx - 1))}
                                                                disabled={idx === 0}
                                                                className="w-8 h-8 rounded-full border border-[#c0b6a5] bg-[#fffdf8] text-[#7c3a1e] flex items-center justify-center font-bold text-xs disabled:opacity-40"
                                                                title="Move earlier"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                onClick={() => handleMoveUpcoming(idx, Math.min(workingUpcomingSubjects.length - 1, idx + 1))}
                                                                disabled={idx === workingUpcomingSubjects.length - 1}
                                                                className="w-8 h-8 rounded-full border border-[#c0b6a5] bg-[#fffdf8] text-[#7c3a1e] flex items-center justify-center font-bold text-xs disabled:opacity-40"
                                                                title="Move later"
                                                            >
                                                                ↓
                                                            </button>
                                                            <span className="text-xs text-[#787163] font-mono ml-2">
                                                                Position {idx + 1} of {workingUpcomingSubjects.length}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                            /* PARTIALLY DONE SUBTAB */
                            <div className="space-y-4">
                                {partialTasks.length === 0 ? (
                                    <div className="border border-dashed border-[#c0b6a5] rounded-3xl p-8 text-center bg-[#fffdf8]">
                                        <div className="font-serif text-lg font-bold text-[#3d3a34]">Nothing set aside</div>
                                        <p className="text-xs text-[#787163] mt-1.5">
                                            Tasks marked Partially Done wait here until they are finished.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {partialTasks.map((pt, i) => (
                                            <div
                                                key={i}
                                                className="border border-[#e3d5bd] rounded-3xl bg-[#fffdf8] p-6 shadow-sm space-y-4"
                                            >
                                                <div className="flex items-baseline justify-between">
                                                    <div>
                                                        <span className="text-xs font-mono text-[#787163] font-bold">{pt.day}</span>
                                                        <h4 className="font-serif text-lg font-bold text-[#201e1d] mt-0.5">{pt.title}</h4>
                                                    </div>
                                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                                                        Partially Done
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-[#eee7db] text-xs">
                                                    <div className="py-2.5 flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${pt.watchDone ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-[#f9f4ed] border-[#dcd3c4] text-[#787163]'}`}>01</span>
                                                            <span className="font-semibold text-[#3d3a34]">Watch Video</span>
                                                        </span>
                                                        <span className={pt.watchDone ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-[#787163]'}>
                                                            {pt.watchDone ? '✓ Watched' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="py-2.5 flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${pt.notesDone ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-[#f9f4ed] border-[#dcd3c4] text-[#787163]'}`}>02</span>
                                                            <span className="font-semibold text-[#3d3a34]">Recall Notes</span>
                                                        </span>
                                                        <span className={pt.notesDone ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-[#787163]'}>
                                                            {pt.notesDone ? '✓ Notes Read' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="py-2.5 flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${pt.testDone ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-[#f9f4ed] border-[#dcd3c4] text-[#787163]'}`}>03</span>
                                                            <span className="font-semibold text-[#3d3a34]">Practice Test</span>
                                                        </span>
                                                        <span className={pt.testDone ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-[#787163]'}>
                                                            {pt.testDone ? '✓ Test Solved' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="py-2.5 flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${pt.uploadDone ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-[#f9f4ed] border-[#dcd3c4] text-[#787163]'}`}>04</span>
                                                            <span className="font-semibold text-[#3d3a34]">Mains Practice</span>
                                                        </span>
                                                        <span className={pt.uploadDone ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-[#787163]'}>
                                                            {pt.uploadDone ? '✓ Answer Uploaded' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleCompletePartialTask(pt)}
                                                    className="w-full py-3 rounded-full bg-[#7c3a1e] text-white font-serif text-xs font-bold shadow-xs hover:bg-[#643312] transition-colors"
                                                >
                                                    Yay! I completed this task 🎉
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ----------------- 3. CHAT MODULE ----------------- */}
                {activeTab === 'chat' && (
                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
                        <div className="border-r border-[#e3d5bd] bg-[#f7f0e4] p-4 space-y-3">
                            <h4 className="text-xs font-bold text-[#787163] uppercase tracking-wider">MESSAGES</h4>
                            {[
                                { id: 'mentor', name: assignedMentor?.name || 'Assigned Mentor', role: 'Assigned mentor' },
                                { id: 'desk', name: 'Programme desk', role: 'Scheduling & fees' },
                            ].map((t) => {
                                const on = activeThread === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setActiveThread(t.id as any);
                                            fetchChatMessages(t.id as any);
                                        }}
                                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                                            on ? 'bg-[#fffdf8] border-[#b8502a] shadow-xs' : 'border-transparent hover:bg-[#ebe0cb]'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#b8502a] text-white font-bold text-xs flex items-center justify-center">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#3d3a34]">{t.name}</p>
                                            <p className="text-[10px] text-[#787163]">{t.role}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="md:col-span-2 flex flex-col justify-between p-6 space-y-4">
                            <div className="border-b border-[#f0e6d4] pb-3 flex items-center justify-between">
                                <h3 className="font-serif font-bold text-base text-[#3d3a34]">
                                    {activeThread === 'mentor' ? (assignedMentor?.name || 'Assigned Mentor') : 'Programme desk'}
                                </h3>
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">● Active</span>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-2">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#a89f91]">
                                        <p className="text-xs font-medium">No messages in this thread yet.</p>
                                        <p className="text-[11px] mt-1 text-[#8c8273]">
                                            Send a message to start conversation with your {activeThread === 'mentor' ? (assignedMentor?.name || 'assigned mentor') : 'programme desk'}.
                                        </p>
                                    </div>
                                ) : (
                                    chatMessages.map((m, idx) => {
                                        if (m.senderRole === 'system') {
                                            return (
                                                <div key={idx} className="flex justify-center my-2">
                                                    <div className="bg-[#ede4d3] text-[#5c5446] text-[11px] px-3.5 py-1.5 rounded-full border border-[#e3d5bd] max-w-[85%] text-center">
                                                        🔔 {m.text}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        const mine = m.from === 'me' || m.senderRole === 'student';
                                        return (
                                            <div key={idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                                        mine
                                                            ? 'bg-[#b8502a] text-white rounded-br-xs'
                                                            : 'bg-[#f5ead8] text-[#3d3a34] rounded-bl-xs border border-[#e3d5bd]'
                                                    }`}
                                                >
                                                    <p>{m.text}</p>
                                                    <span className={`text-[9px] mt-1 block text-right ${mine ? 'text-white/70' : 'text-[#787163]'}`}>
                                                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (m.meta || '')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-3 border-t border-[#f0e6d4]">
                                <input
                                    type="text"
                                    placeholder="Type message to mentor..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendChat();
                                    }}
                                    className="flex-1 px-4 py-3 bg-[#f5ead8] border border-[#e3d5bd] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#b8502a]"
                                />
                                <button
                                    onClick={handleSendChat}
                                    className="bg-[#b8502a] hover:bg-[#a04322] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-sm"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- 4. UPLOADS MODULE ----------------- */}
                {activeTab === 'uploads' && (
                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">ANSWER SCRIPTS &amp; PRACTICE SUBMISSIONS</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Uploads &amp; Evaluated Returns</h1>
                            </div>
                            <Link
                                href="/tests/mains-test-series"
                                className="bg-[#b8502a] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#a04322] shadow-sm"
                            >
                                + Upload New Mains Test Script
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#e3d5bd] text-[10px] font-bold text-[#787163] uppercase tracking-wider">
                                        <th className="py-3 px-4">Test Code</th>
                                        <th className="py-3 px-4">Title &amp; Subject</th>
                                        <th className="py-3 px-4">Submitted Date</th>
                                        <th className="py-3 px-4">Evaluation Status</th>
                                        <th className="py-3 px-4">Score</th>
                                        <th className="py-3 px-4 text-center">Evaluated Copy</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0e6d4] text-xs">
                                    {uploadsList.map((u, i) => (
                                        <tr key={i} className="hover:bg-[#f7f0e4]">
                                            <td className="py-4 px-4 font-bold text-[#b8502a]">{u.code || `SUB-${i + 1}`}</td>
                                            <td className="py-4 px-4">
                                                <p className="font-bold text-[#3d3a34]">{u.testTitle || u.title || 'Mains Practice Script'}</p>
                                                <p className="text-[10px] text-[#787163]">{u.subject || 'GS Foundation'}</p>
                                            </td>
                                            <td className="py-4 px-4 text-[#787163]">{u.submittedAt || u.date || '24 Aug 2026'}</td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        u.status === 'evaluated' || u.status === 'Evaluated'
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    }`}
                                                >
                                                    {u.status || 'Submitted'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-[#3d3a34]">{u.score || '—'}</td>
                                            <td className="py-4 px-4 text-center">
                                                {u.status === 'evaluated' || u.status === 'Evaluated' ? (
                                                    <button className="text-xs font-bold text-[#b8502a] hover:underline">Download Copy PDF ↗</button>
                                                ) : (
                                                    <span className="text-[#a09888]">In Review</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ----------------- 5. MENTORSHIP MODULE ----------------- */}
                {activeTab === 'mentorship' && (
                    <div className="space-y-6">
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">CONSISTENCY RECORD</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Mentorship &amp; Sessions Log</h1>
                            </div>

                            <span
                                className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                                    mentorshipAccountStatus === 'active'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : mentorshipAccountStatus === 'break'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                            >
                                Account Status: {mentorshipAccountStatus.toUpperCase()}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center shadow-2xs">
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">AVG HOURS / WEEK</span>
                                <p className="text-2xl font-bold text-[#3d3a34] mt-1">{kpis.avgHoursPerWeek} h</p>
                            </div>
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center shadow-2xs">
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">TASK COMPLETION</span>
                                <p className="text-2xl font-bold text-emerald-700 mt-1">{kpis.taskCompletionPct}%</p>
                            </div>
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center shadow-2xs">
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">BEST WEEK</span>
                                <p className="text-2xl font-bold text-[#b8502a] mt-1">{kpis.bestWeekHours} h</p>
                            </div>
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center shadow-2xs">
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">LOGGED DAYS</span>
                                <p className="text-2xl font-bold text-[#3d3a34] mt-1">
                                    {kpis.loggedDaysCount} / {kpis.targetDays}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-4">
                            <h4 className="text-sm font-serif font-bold text-[#3d3a34]">Past Mentor 1-on-1 Review Sessions</h4>
                            <div className="space-y-3">
                                {sessionNotes.length > 0 ? (
                                    sessionNotes.map((s, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-[#f7f0e4] border border-[#e8dcc8] space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-[#3d3a34]">Weekly Mentor 1-on-1 Session</span>
                                                <span className="text-[#787163]">{s.date || 'Recent'}</span>
                                            </div>
                                            <p className="text-xs text-[#787163] leading-relaxed">{s.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center rounded-2xl bg-[#f7f0e4] border border-[#e8dcc8]">
                                        <p className="text-xs text-[#787163]">No 1-on-1 mentor session notes logged yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* IN-PAGE ACTION MODALS (NO REROUTING FOR 01, 02, 03, 04) */}
            {activeModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setActiveModal(null)}
                >
                    <div
                        className="bg-[#fffdf8] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-[#e3d5bd] space-y-6 my-8 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-[#f0e6d4] pb-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">
                                    IN-PAGE ACTION • {activeModal.type.toUpperCase()}
                                </span>
                                <h2 className="text-xl font-serif font-bold text-[#3d3a34]">
                                    {activeModal.item?.title || activeModal.item?.nodeTitle || 'Course Video Task'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="w-8 h-8 rounded-full bg-[#f5ead8] text-[#787163] font-bold flex items-center justify-center hover:bg-[#e4d7c0]"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 1. Video Player Modal */}
                        {activeModal.type === 'video' && (
                            <div className="space-y-4">
                                <div className="aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                                    {activeModal.item?.videoUrl ? (
                                        <iframe
                                            src={
                                                activeModal.item.videoUrl.includes('youtube.com/watch?v=')
                                                    ? activeModal.item.videoUrl.replace('watch?v=', 'embed/')
                                                    : activeModal.item.videoUrl.includes('youtu.be/')
                                                    ? activeModal.item.videoUrl.replace('youtu.be/', 'youtube.com/embed/')
                                                    : activeModal.item.videoUrl
                                            }
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="text-center text-white p-6">
                                            <div className="text-4xl mb-2">🎥</div>
                                            <p className="text-sm font-bold">Standard Demo Video Lecture</p>
                                            <p className="text-xs text-slate-400 mt-1">Revolt of 1857 &amp; Modern Indian Freedom Struggle</p>
                                        </div>
                                    )}
                                </div>
                                {activeModal.item?.description && (
                                    <p className="text-xs text-[#787163] leading-relaxed">
                                        {activeModal.item.description}
                                    </p>
                                )}
                                <div className="pt-4 border-t border-[#f0e6d4] flex justify-end gap-3">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="px-5 py-2.5 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163]"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleToggleStep(activeModal.cardContext.tag, activeModal.cardContext.dayNumber, 'watch', true, undefined, undefined, activeModal.cardContext.courseId);
                                            setActiveModal(null);
                                        }}
                                        className="px-6 py-2.5 rounded-xl bg-[#b8502a] text-white text-xs font-bold shadow-md hover:bg-[#a04322]"
                                    >
                                        ✓ Mark Video Completed
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. Notes & Handout Modal */}
                        {activeModal.type === 'notes' && (
                            <div className="space-y-5">
                                <div className="p-5 bg-[#fff5ea] rounded-2xl border border-[#ffd8c2] space-y-3">
                                    <h4 className="text-xs font-bold text-[#b8502a] uppercase tracking-wider">Active Recall Prompts &amp; Lecture Summary</h4>
                                    <p className="text-xs text-[#3d3a34] whitespace-pre-line leading-relaxed">
                                        {activeModal.item?.notesText ||
                                            `Key Concept Prompts:\n1. What triggered the immediate spark of the 1857 Revolt in Meerut?\n2. Identify the role of Rani Lakshmibai in Jhansi and Nana Saheb in Kanpur.\n3. How did the Government of India Act 1858 restructure British administration in India?`}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-[#787163] uppercase tracking-wider mb-2">📥 Downloadable PDF Handouts</h4>
                                    <div className="space-y-2">
                                        {(activeModal.item?.pdfFiles && activeModal.item.pdfFiles.length > 0
                                            ? activeModal.item.pdfFiles
                                            : [{ title: 'Lecture Notes & Active Recall PDF Handout.pdf', pdfUrl: '#' }]
                                        ).map((pdf: any, pIdx: number) => (
                                            <a
                                                key={pIdx}
                                                href={pdf.pdfUrl || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#3d3a34] hover:bg-[#fff5ea]"
                                            >
                                                <span>📄 {pdf.title}</span>
                                                <span className="text-[#b8502a]">Download PDF 📥</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#f0e6d4] flex justify-end gap-3">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="px-5 py-2.5 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163]"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleToggleStep(activeModal.cardContext.tag, activeModal.cardContext.dayNumber, 'notes', true, undefined, undefined, activeModal.cardContext.courseId);
                                            setActiveModal(null);
                                        }}
                                        className="px-6 py-2.5 rounded-xl bg-[#b8502a] text-white text-xs font-bold shadow-md hover:bg-[#a04322]"
                                    >
                                        ✓ Mark Notes Completed
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 3. Take Test Modal (Prelims Practice Test Synced with Course) */}
                        {activeModal.type === 'test' && (
                            <div className="space-y-5">
                                <div className="p-4 bg-[#fff5ea] rounded-2xl border border-[#ffd8c2] flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">
                                            📝 PRELIMS PRACTICE TEST • COURSE SYNC
                                        </span>
                                        <h4 className="text-sm font-bold text-[#3d3a34]">
                                            {modalQuizData?.title || `${activeModal.item?.title || activeModal.item?.nodeTitle || 'Topic'} — Practice Quiz`}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setLearnMode(!learnMode)}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#3d3a34] text-amber-300 hover:bg-black transition-all"
                                        >
                                            {learnMode ? '💡 Learn Mode' : '⏱️ Test Mode'}
                                        </button>
                                        {quizSubmitted && (
                                            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
                                                Score: {Object.entries(quizAnswers).filter(([idx, ans]) => modalQuizData?.questions?.[Number(idx)]?.correctOptionIndex === ans || modalQuizData?.questions?.[Number(idx)]?.correctIndex === ans).length * 2} / {(modalQuizData?.questions?.length || 1) * 2} Marks
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {modalQuizLoading ? (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b8502a]"></div>
                                    </div>
                                ) : modalQuizData?.questions && modalQuizData.questions.length > 0 ? (
                                    <div className="space-y-4">
                                        {modalQuizData.questions.map((qObj: any, qIdx: number) => {
                                            const qText = qObj.questionText || qObj.question || '';
                                            const correctIdx = qObj.correctOptionIndex ?? qObj.correctIndex ?? 0;
                                            const isUserSelected = quizAnswers[qIdx] !== undefined;
                                            const isRightAns = isUserSelected && quizAnswers[qIdx] === correctIdx;
                                            const showExplanation = (learnMode && isUserSelected) || quizSubmitted;

                                            return (
                                                <div key={qIdx} className={`p-4 rounded-2xl border transition-all ${showExplanation ? (isRightAns ? 'bg-emerald-50/70 border-emerald-300' : isUserSelected ? 'bg-red-50/70 border-red-300' : 'bg-white border-[#e3d5bd]') : 'bg-white border-[#e3d5bd]'}`}>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className="text-[11px] font-bold text-[#b8502a] bg-[#fff5ea] px-2.5 py-0.5 rounded-md border border-[#ffd8c2]">
                                                            Question {qIdx + 1} of {modalQuizData.questions.length}
                                                        </span>
                                                        <span className="text-[10px] text-[#787163] font-semibold">2 Marks (+2 / -0.66)</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-[#3d3a34] whitespace-pre-line mb-3">{qText}</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {qObj.options?.map((opt: string, oIdx: number) => {
                                                            const selected = quizAnswers[qIdx] === oIdx;
                                                            const isCorrectOption = oIdx === correctIdx;
                                                            let btnStyle = 'bg-[#f7f0e4] text-[#787163] border-transparent hover:border-[#e3d5bd]';
                                                            if (showExplanation) {
                                                                if (isCorrectOption) btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-600';
                                                                else if (selected) btnStyle = 'bg-red-600 text-white font-bold border-red-600';
                                                            } else if (selected) {
                                                                btnStyle = 'bg-[#ffe8d6] text-[#b8502a] border-[#b8502a] font-bold';
                                                            }

                                                            return (
                                                                <button
                                                                    key={oIdx}
                                                                    type="button"
                                                                    disabled={quizSubmitted}
                                                                    onClick={() => setQuizAnswers((p) => ({ ...p, [qIdx]: oIdx }))}
                                                                    className={`p-2.5 rounded-xl text-xs text-left font-semibold border transition-all ${btnStyle}`}
                                                                >
                                                                    {String.fromCharCode(65 + oIdx)}. {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {showExplanation && qObj.explanation && (
                                                        <div className="mt-3 p-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#3d3a34] leading-relaxed">
                                                            <strong className="text-emerald-800">💡 Explanation:</strong> {qObj.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white rounded-2xl border border-[#e3d5bd] text-xs text-[#787163] text-center">
                                        No practice questions currently available for this module.
                                    </div>
                                )}

                                <div className="pt-4 border-t border-[#f0e6d4] flex justify-end gap-3">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="px-5 py-2.5 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163]"
                                    >
                                        Close
                                    </button>
                                    {!quizSubmitted ? (
                                        <button
                                            onClick={() => setQuizSubmitted(true)}
                                            className="px-6 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold shadow-md hover:bg-teal-800"
                                        >
                                            Submit Test Answers
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                handleToggleStep(activeModal.cardContext.tag, activeModal.cardContext.dayNumber, 'test', true, undefined, undefined, activeModal.cardContext.courseId);
                                                setActiveModal(null);
                                            }}
                                            className="px-6 py-2.5 rounded-xl bg-[#b8502a] text-white text-xs font-bold shadow-md hover:bg-[#a04322]"
                                        >
                                            ✓ Mark Test Completed
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. Upload Answer Modal (Mains Practice Synced with Course) */}
                        {activeModal.type === 'upload' && (
                            <div className="space-y-5">
                                {modalMptLoading ? (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b8502a]"></div>
                                    </div>
                                ) : (
                                    (() => {
                                        const qObj = modalMptData?.questions?.[0] || {
                                            questionText: `Discuss the key aspects and policy measures associated with ${activeModal.item?.title || activeModal.item?.nodeTitle || 'this topic'}. (15 Marks, 250 Words)`,
                                            marks: 15,
                                            wordLimit: 250,
                                            approach: '1. Introduction: Define scope.\n2. Body: Multi-dimensional analysis.\n3. Conclusion: Actionable way forward.',
                                            modelAnswer: 'Model answer reference available upon submission.',
                                        };

                                        return (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-[#fff5ea] rounded-2xl border border-[#ffd8c2] space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">
                                                            ✍️ MAINS PRACTICE QUESTION • COURSE SYNC
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                                                                {qObj.marks || 15} Marks
                                                            </span>
                                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-300">
                                                                {qObj.wordLimit || 250} Words
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs font-bold text-[#3d3a34] leading-relaxed">
                                                        {qObj.questionText}
                                                    </p>
                                                </div>

                                                {/* Approach & Structuring Guidelines Accordion */}
                                                {qObj.approach && (
                                                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                                                        <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                                            💡 Approach &amp; Structuring Guidelines
                                                        </h5>
                                                        <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                                                            {qObj.approach}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Model Answer Toggle Accordion */}
                                                <div className="border border-[#e3d5bd] rounded-2xl overflow-hidden bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowModelAnswer(!showModelAnswer)}
                                                        className="w-full p-3 bg-[#f7f0e4] text-left text-xs font-bold text-[#3d3a34] flex items-center justify-between hover:bg-[#ebe0cb]"
                                                    >
                                                        <span>📖 Official Reference Model Answer</span>
                                                        <span>{showModelAnswer ? 'Hide −' : 'Show +'}</span>
                                                    </button>
                                                    {showModelAnswer && (
                                                        <div className="p-4 text-xs text-[#3d3a34] leading-relaxed whitespace-pre-line bg-white border-t border-[#e3d5bd]">
                                                            {qObj.modelAnswer || 'Official model answer available in downloadable PDF notes.'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3 pt-2">
                                                    <label className="text-xs font-bold text-[#787163] uppercase tracking-wider block">
                                                        Select Answer Sheet PDF File to Upload &amp; Submit to Mentor
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                        className="w-full p-3 bg-[#f5ead8] border border-[#e3d5bd] rounded-2xl text-xs font-semibold"
                                                    />
                                                </div>

                                                {uploadMsg && (
                                                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                                                        {uploadMsg}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()
                                )}

                                <div className="pt-4 border-t border-[#f0e6d4] flex justify-end gap-3">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="px-5 py-2.5 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleMainsUploadSubmit(activeModal.cardContext, activeModal.item?.title || modalMptData?.title)}
                                        disabled={isSubmittingUpload}
                                        className="px-6 py-2.5 rounded-xl bg-[#b8502a] text-white text-xs font-bold shadow-md hover:bg-[#a04322] disabled:opacity-50"
                                    >
                                        {isSubmittingUpload ? 'Uploading...' : 'Submit Mains Answer Script ↗'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 1. Break Request Modal */}
            {isBreakModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-2xs" onClick={() => setIsBreakModalOpen(false)}>
                    <div className="bg-[#fffdf8] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e3d5bd]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-serif font-bold text-[#201e1d]">Request a break?</h3>
                        <p className="text-xs text-[#787163] mt-2 leading-relaxed">
                            Your mentor reviews break requests before your account changes. Daily tasks stay paused for the break.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-[10px] tracking-wider uppercase font-bold text-[#787163] mb-1.5">Reason</label>
                                <select
                                    value={breakReason}
                                    onChange={(e) => setBreakReason(e.target.value)}
                                    className="w-full border border-[#dcd3c4] bg-[#f9f4ed] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#201e1d] focus:outline-none"
                                >
                                    <option value="Health">Health</option>
                                    <option value="Family">Family</option>
                                    <option value="Other exam">Other exam</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] tracking-wider uppercase font-bold text-[#787163] mb-1.5">Return</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBreakMode('fixed')}
                                        className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                                            breakMode === 'fixed'
                                                ? 'bg-[#7c3a1e] text-white shadow-xs'
                                                : 'border border-[#dcd3c4] bg-transparent text-[#645c50]'
                                        }`}
                                    >
                                        On a set date
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBreakMode('open')}
                                        className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                                            breakMode === 'open'
                                                ? 'bg-[#7c3a1e] text-white shadow-xs'
                                                : 'border border-[#dcd3c4] bg-transparent text-[#645c50]'
                                        }`}
                                    >
                                        Open-ended
                                    </button>
                                </div>

                                {breakMode === 'fixed' ? (
                                    <input
                                        type="date"
                                        value={breakReturnDate}
                                        onChange={(e) => setBreakReturnDate(e.target.value)}
                                        className="w-full mt-2 border border-[#dcd3c4] bg-[#f9f4ed] rounded-xl px-4 py-2 text-xs font-medium text-[#201e1d] focus:outline-none"
                                    />
                                ) : (
                                    <p className="text-[11px] text-[#787163] mt-2 italic">
                                        Your mentor resumes you when you tell them you are ready.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsBreakModalOpen(false)}
                                className="px-5 py-2.5 rounded-full border border-[#dcd3c4] text-xs font-bold text-[#645c50] hover:bg-[#eee7db]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestBreak}
                                disabled={isSubmittingBreak || (breakMode === 'fixed' && !breakReturnDate)}
                                className="px-6 py-2.5 rounded-full bg-[#7c3a1e] text-white text-xs font-bold shadow-md hover:bg-[#643312] disabled:opacity-50"
                            >
                                {isSubmittingBreak ? 'Sending...' : 'Send request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Pause Subject Modal */}
            {isPauseModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-2xs" onClick={() => setIsPauseModalOpen(false)}>
                    <div className="bg-[#fffdf8] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e3d5bd]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-serif font-bold text-[#201e1d]">Pause this subject?</h3>
                        <p className="text-xs text-[#787163] mt-2 leading-relaxed">
                            Pausing <span className="font-bold text-[#201e1d]">{roadmapData.currentSubject?.name || 'this subject'}</span> will intimate your mentor. Your progress is kept, and the subject waits under Paused subjects.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-[10px] tracking-wider uppercase font-bold text-[#787163] mb-1.5">Reason</label>
                                <select
                                    value={pauseReason}
                                    onChange={(e) => setPauseReason(e.target.value)}
                                    className="w-full border border-[#dcd3c4] bg-[#f9f4ed] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#201e1d] focus:outline-none"
                                >
                                    <option value="Health">Health</option>
                                    <option value="Family">Family</option>
                                    <option value="Other exam">Other exam</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] tracking-wider uppercase font-bold text-[#787163] mb-1.5">Optional Note for Mentor</label>
                                <textarea
                                    value={pauseNote}
                                    onChange={(e) => setPauseNote(e.target.value)}
                                    placeholder="Brief note on why you are pausing this module..."
                                    rows={2}
                                    className="w-full border border-[#dcd3c4] bg-[#f9f4ed] rounded-xl px-4 py-2 text-xs font-medium text-[#201e1d] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsPauseModalOpen(false)}
                                className="px-5 py-2.5 rounded-full border border-[#dcd3c4] text-xs font-bold text-[#645c50] hover:bg-[#eee7db]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePauseSubject}
                                disabled={isSubmittingPause}
                                className="px-6 py-2.5 rounded-full bg-[#7c3a1e] text-white text-xs font-bold shadow-md hover:bg-[#643312] disabled:opacity-50"
                            >
                                {isSubmittingPause ? 'Pausing...' : 'Confirm pause'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Reorder Confirmation Modal */}
            {isReorderModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-2xs" onClick={() => setIsReorderModalOpen(false)}>
                    <div className="bg-[#fffdf8] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e3d5bd]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-serif font-bold text-[#201e1d]">Reordering needs mentor approval</h3>
                        <p className="text-xs text-[#787163] mt-2 leading-relaxed">
                            You can arrange the upcoming subjects and submit the order. Nothing changes until your mentor approves it — they may also adjust the order first.
                        </p>

                        <div className="mt-4 p-3 bg-[#f9f4ed] border border-[#e3d5bd] rounded-2xl space-y-1.5 text-xs font-mono">
                            <div className="text-[10px] uppercase font-bold text-[#787163] tracking-wider mb-1">Proposed Sequence:</div>
                            {workingUpcomingSubjects.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-[#201e1d]">
                                    <span className="font-bold text-[#7c3a1e]">{idx + 1}.</span>
                                    <span>{s.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsReorderModalOpen(false)}
                                className="px-5 py-2.5 rounded-full border border-[#dcd3c4] text-xs font-bold text-[#645c50] hover:bg-[#eee7db]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitReorder}
                                disabled={isSubmittingReorder}
                                className="px-6 py-2.5 rounded-full bg-[#7c3a1e] text-white text-xs font-bold shadow-md hover:bg-[#643312] disabled:opacity-50"
                            >
                                {isSubmittingReorder ? 'Submitting...' : 'Submit to mentor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
