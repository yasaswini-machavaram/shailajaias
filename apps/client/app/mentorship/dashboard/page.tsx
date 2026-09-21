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
        cardContext: { tag: string; dayNumber: number };
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

    // Roadmap state
    const [subscribedTags, setSubscribedTags] = useState<string[]>([]);
    const [roadmapCategoryFilter, setRoadmapCategoryFilter] = useState<'all' | 'courses' | 'mts' | 'pts' | 'partial'>('all');

    const [coursesRoadmap, setCoursesRoadmap] = useState<{ inProgress: any[]; completed: any[] }>({
        inProgress: [
            {
                _id: 'c_prog_1',
                title: 'General Studies Paper I — Environment & Ecology',
                tag: 'GS-3',
                totalTasks: 15,
                completedTasks: 5,
                percentage: 33,
                ptsGroupCode: 'PTS-ENV-2026',
                mtsGroupCode: 'MTS-ENV-2026',
                startedOn: '01 Aug 2026',
            },
            {
                _id: 'c_prog_2',
                title: 'Indian Economy & Macro Development',
                tag: 'GS-3',
                totalTasks: 18,
                completedTasks: 9,
                percentage: 50,
                ptsGroupCode: 'PTS-ECO-2026',
                mtsGroupCode: 'MTS-ECO-2026',
                startedOn: '10 Aug 2026',
            }
        ],
        completed: [
            {
                _id: 'c_comp_1',
                title: 'Indian Polity & Constitutional Governance',
                tag: 'GS-2',
                totalTasks: 14,
                completedTasks: 14,
                percentage: 100,
                finishedOn: '31 Jul 2026',
                ptsGroupCode: 'PTS-POLITY-2026',
                mtsGroupCode: 'MTS-POLITY-2026',
            }
        ]
    });

    const [mtsRoadmap, setMtsRoadmap] = useState<{ inProgress: any[]; completed: any[] }>({
        inProgress: [
            {
                _id: 'mts_prog_1',
                title: 'Mains Test Series 2026 — GS Paper II Focus Batch',
                tag: 'MTS-GS2',
                totalTests: 12,
                completedTests: 4,
                percentage: 33,
                lastSubmission: '18 Sep 2026',
            }
        ],
        completed: [
            {
                _id: 'mts_comp_1',
                title: 'Mains Test Series 2026 — Ethics & Essay Foundation Batch',
                tag: 'MTS-ETHICS',
                totalTests: 8,
                completedTests: 8,
                percentage: 100,
                finishedOn: '10 Aug 2026',
            }
        ]
    });

    const [ptsRoadmap, setPtsRoadmap] = useState<{ inProgress: any[]; completed: any[] }>({
        inProgress: [
            {
                _id: 'pts_prog_1',
                title: 'Prelims Test Series 2026 — All India Mock Series',
                tag: 'PTS-AIMS',
                totalTests: 25,
                completedTests: 8,
                percentage: 32,
                lastAttempt: '19 Sep 2026',
            }
        ],
        completed: [
            {
                _id: 'pts_comp_1',
                title: 'Prelims Test Series 2026 — Sectional Static Revision',
                tag: 'PTS-STATIC',
                totalTests: 10,
                completedTests: 10,
                percentage: 100,
                finishedOn: '05 Aug 2026',
            }
        ]
    });

    const [subjectsList, setSubjectsList] = useState<any[]>([
        { name: 'Polity', state: 'done', total: 14, done: 14, startedOn: '15 Jul', finishedOn: '31 Jul' },
        { name: 'Economy', state: 'done', total: 16, done: 16, startedOn: '01 Aug', finishedOn: '14 Aug' },
        { name: 'Environment & Ecology', state: 'current', total: 15, done: 4, startDate: new Date() },
        { name: 'Modern History', state: 'upcoming', total: 12, done: 0 },
        { name: 'Geography', state: 'upcoming', total: 10, done: 0 },
        { name: 'Ethics (GS-IV)', state: 'upcoming', total: 9, done: 0 },
    ]);
    const [partialTasks, setPartialTasks] = useState<any[]>([]);
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
    const [chatMessages, setChatMessages] = useState<any[]>([
        { from: 'them', text: 'Welcome to your mentorship program! Keep logging your daily study hours and complete your tasks.', meta: '10:00 AM' },
    ]);
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
                    });
                    setTaskProgressMap(pMap);
                }
            }

            // 2. Roadmap data
            const resRoadmap = await fetch(`${API_URL}/api/mentorship-student/roadmap`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataRoadmap = await resRoadmap.json();
            if (dataRoadmap.success && dataRoadmap.data) {
                setSubscribedTags(dataRoadmap.data.subscribedTags || []);
                if (dataRoadmap.data.subjects?.length > 0) {
                    setSubjectsList(dataRoadmap.data.subjects);
                }
                if (dataRoadmap.data.coursesRoadmap) {
                    setCoursesRoadmap(dataRoadmap.data.coursesRoadmap);
                }
                if (dataRoadmap.data.mtsRoadmap) {
                    setMtsRoadmap(dataRoadmap.data.mtsRoadmap);
                }
                if (dataRoadmap.data.ptsRoadmap) {
                    setPtsRoadmap(dataRoadmap.data.ptsRoadmap);
                }
                if (dataRoadmap.data.partialTasks) {
                    setPartialTasks(dataRoadmap.data.partialTasks);
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

            // 5. Chat data
            fetchChatMessages();
        } catch (e) {
            console.error('Fetch initial mentorship data error:', e);
        }
    };

    const fetchChatMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/chat?threadType=${activeThread}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data?.length > 0) {
                setChatMessages(data.data);
            }
        } catch (e) {
            console.error('Fetch chat error:', e);
        }
    };

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

    const handleToggleStep = async (tag: string, dayNumber: number, taskType: 'watch' | 'notes' | 'test' | 'upload', completed: boolean, notesText?: string, mainsUrl?: string) => {
        const key = `${tag}_${dayNumber}_${taskType}`;
        setTaskProgressMap((prev) => ({ ...prev, [key]: completed }));

        try {
            await fetch(`${API_URL}/api/mentorship-student/task-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    tag: String(tag),
                    dayNumber: Number(dayNumber),
                    taskType,
                    completed,
                    notesText,
                    mainsAnswerFileUrl: mainsUrl,
                }),
            });
            fetchInitialData();
        } catch (e) {
            console.error('Save task progress error:', e);
        }
    };

    const handleMarkOverallTask = async (tag: string, dayNumber: number, status: 'partial' | 'completed') => {
        const isComp = status === 'completed';
        const isPart = status === 'partial';

        setTaskProgressMap((prev) => {
            const next = { ...prev };
            ['watch', 'notes', 'test', 'upload', 'overall'].forEach((st) => {
                next[`${tag}_${dayNumber}_${st}`] = isComp;
            });
            return next;
        });

        try {
            await fetch(`${API_URL}/api/mentorship-student/task-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    tag: String(tag),
                    dayNumber: Number(dayNumber),
                    taskType: 'overall',
                    completed: isComp,
                    isPartial: isPart,
                }),
            });
            fetchInitialData();
        } catch (e) {
            console.error('Save overall task progress error:', e);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const text = chatInput.trim();
        setChatInput('');

        setChatMessages((prev) => [
            ...prev,
            { from: 'me', senderRole: 'student', text, meta: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);

        try {
            await fetch(`${API_URL}/api/mentorship-student/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text, threadType: activeThread }),
            });
        } catch (e) {
            console.error('Send chat error:', e);
        }
    };

    const handleMainsUploadSubmit = async (cardContext: { tag: string; dayNumber: number }, itemTitle: string) => {
        setIsSubmittingUpload(true);
        setUploadMsg('');
        try {
            const simulatedUrl = uploadFile ? `/uploads/${uploadFile.name}` : `https://shailajaias.com/uploads/mains-submission-${Date.now()}.pdf`;
            
            await handleToggleStep(cardContext.tag, cardContext.dayNumber, 'upload', true, 'Submitted practice answer script', simulatedUrl);

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
            const vList = c.videos && c.videos.length > 0 ? c.videos : [{ title: c.title, nodeTitle: c.title }];
            vList.forEach((v: any, vIdx: number) => {
                cards.push({
                    type: 'task',
                    id: `${c._id}_v_${vIdx}`,
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
                courseTitle: c.title,
                tag: c.mentorTags?.[0] || c.title || 'GS Foundation',
                ptsGroupCode: c.ptsGroupCode || 'PTS-2026-01',
                mtsGroupCode: c.mtsGroupCode || 'MTS-2026-01',
            });
        });
        return cards;
    };

    const carouselCards = buildCarouselCards();
    const activeCard = carouselCards[Math.min(currentCardIndex, carouselCards.length - 1)];

    const activeSubject = subjectsList.find((s) => s.state === 'current') || subjectsList[2];
    const completedSubjects = subjectsList.filter((s) => s.state === 'done');
    const upcomingSubjects = subjectsList.filter((s) => s.state === 'upcoming');

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
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                            </span>
                        </div>
                        <button
                            onClick={() => setShowBreakModal(true)}
                            className="text-xs text-slate-500 hover:text-[#1E3A5F] font-semibold underline"
                        >
                            Take a break
                        </button>
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
                                            className="w-9 h-9 rounded-full border border-[#e3d5bd] bg-[#f5ead8] text-[#3d3a34] font-bold hover:bg-[#b8502a] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center text-base"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            onClick={() => setCurrentCardIndex((p) => Math.min(carouselCards.length - 1, p + 1))}
                                            disabled={currentCardIndex === carouselCards.length - 1}
                                            className="w-9 h-9 rounded-full border border-[#e3d5bd] bg-[#f5ead8] text-[#3d3a34] font-bold hover:bg-[#b8502a] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center text-base"
                                        >
                                            ›
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
                                                {activeCard.courseTitle} • TASK #{activeCard.dayNumber}
                                            </span>
                                            <h3 className="text-2xl font-serif font-bold text-[#3d3a34] mt-1">{activeCard.title}</h3>
                                        </div>

                                        <div className="divide-y divide-[#f0e6d4]">
                                            {/* Row 01: Watch Video */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_watch`;
                                                const done = !!taskProgressMap[key];
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={done}
                                                                onChange={(e) => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'watch', e.target.checked)}
                                                                className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-bold text-[#3d3a34]">01 Watch Video — {activeCard.video?.title || activeCard.title}</p>
                                                                <p className="text-xs text-[#787163]">Video Lecture • In-Page Player</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {done && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Done ✓</span>}
                                                            <button
                                                                onClick={() => setActiveModal({ type: 'video', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber } })}
                                                                className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                                            >
                                                                Watch Video ↗
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Row 02: Recall Notes */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_notes`;
                                                const done = !!taskProgressMap[key];
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={done}
                                                                onChange={(e) => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'notes', e.target.checked)}
                                                                className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-bold text-[#3d3a34]">02 Recall Notes — Active Recall &amp; PDF Handout</p>
                                                                <p className="text-xs text-[#787163]">Study Handout • Printable Notes</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {done && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Done ✓</span>}
                                                            <button
                                                                onClick={() => setActiveModal({ type: 'notes', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber } })}
                                                                className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                                            >
                                                                Open Notes ↗
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Row 03: Take Test */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_test`;
                                                const done = !!taskProgressMap[key];
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={done}
                                                                onChange={(e) => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'test', e.target.checked)}
                                                                className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-bold text-[#3d3a34]">03 Take Test — Sectional Topic Quiz</p>
                                                                <p className="text-xs text-[#787163]">Prelims MCQ Solver In-Modal</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {done && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Done ✓</span>}
                                                            <button
                                                                onClick={() => {
                                                                    setQuizAnswers({});
                                                                    setQuizSubmitted(false);
                                                                    setActiveModal({ type: 'test', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber } });
                                                                }}
                                                                className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                                            >
                                                                Take Test ↗
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Row 04: Upload Answer */}
                                            {(() => {
                                                const key = `${activeCard.tag}_${activeCard.dayNumber}_upload`;
                                                const done = !!taskProgressMap[key];
                                                return (
                                                    <div className="py-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={done}
                                                                onChange={(e) => handleToggleStep(activeCard.tag, activeCard.dayNumber, 'upload', e.target.checked)}
                                                                className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-bold text-[#3d3a34]">04 Upload Answer — Mains Practice Script Submission</p>
                                                                <p className="text-xs text-[#787163]">Upload PDF Answer • Tracked in Uploads tab</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {done && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">✓ Submitted</span>}
                                                            <button
                                                                onClick={() => {
                                                                    setUploadFile(null);
                                                                    setUploadMsg('');
                                                                    setActiveModal({ type: 'upload', item: activeCard.video, cardContext: { tag: activeCard.tag, dayNumber: activeCard.dayNumber } });
                                                                }}
                                                                className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                                            >
                                                                Upload Answer ↗
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Card Footer Bar: Two explicit Buttons (Partially Done & Completed) */}
                                        <div className="pt-5 border-t border-[#f0e6d4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <span className="text-xs text-[#787163] font-medium">
                                                Task Tracking Status: {taskProgressMap[`${activeCard.tag}_${activeCard.dayNumber}_overall`] ? 'Completed ✓' : 'In Progress'}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                <button
                                                    onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'partial')}
                                                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#fff5ea] hover:bg-[#ffe8d6] text-[#b8502a] border border-[#ffd8c2] text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <span>🟡</span> Mark Partially Done
                                                </button>

                                                <button
                                                    onClick={() => handleMarkOverallTask(activeCard.tag, activeCard.dayNumber, 'completed')}
                                                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <span>✓</span> Mark Completed
                                                </button>

                                                {currentCardIndex < carouselCards.length - 1 && (
                                                    <button
                                                        onClick={() => setCurrentCardIndex((p) => p + 1)}
                                                        className="px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold shadow-sm transition-all"
                                                    >
                                                        Next Task →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
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
                    <div className="space-y-6">
                        {/* Roadmap Header Banner */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">PREPARATION ROADMAP • CSE 2027</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Subscribed Courses, MTS, &amp; PTS Tracks</h1>
                                <p className="text-xs text-[#787163] mt-0.5">Separate progress and completion tracking for all your subscribed modules.</p>
                            </div>

                            <div className="flex flex-wrap items-center bg-[#f5ead8] p-1 rounded-2xl border border-[#e3d5bd]">
                                {[
                                    { id: 'all', label: 'All Tracks' },
                                    { id: 'courses', label: 'Courses' },
                                    { id: 'mts', label: 'MTS (Mains)' },
                                    { id: 'pts', label: 'PTS (Prelims)' },
                                    { id: 'partial', label: `Partial Tasks (${partialTasks.length})` },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setRoadmapCategoryFilter(tab.id as any)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            roadmapCategoryFilter === tab.id
                                                ? 'bg-[#1E3A5F] text-white shadow-xs'
                                                : 'text-[#787163] hover:text-[#3d3a34]'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subscribed Tags Banner */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-5 shadow-sm">
                            <h4 className="text-xs font-bold text-[#787163] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>🔖</span> Subscribed Mentorship Tags (Synced via Subscribed Courses, MTS, &amp; PTS)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {subscribedTags.length > 0 ? (
                                    subscribedTags.map((tag) => (
                                        <span key={tag} className="px-3.5 py-1.5 bg-[#fff5ea] text-[#b8502a] border border-[#ffd8c2] rounded-full text-xs font-bold shadow-2xs flex items-center gap-1.5">
                                            <span>#{tag}</span>
                                            <span className="text-[10px] bg-[#b8502a] text-white px-1.5 py-0.2 rounded-full">Synced ✓</span>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-[#787163]">No active mentorship tags subscribed yet across Courses, MTS, or PTS.</span>
                                )}
                            </div>
                        </div>

                        {/* Partial Tasks View */}
                        {roadmapCategoryFilter === 'partial' ? (
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-4">
                                <h4 className="text-sm font-serif font-bold text-[#3d3a34]">Partially Done Tasks</h4>
                                {partialTasks.map((pt, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-[#fff5ea] border border-[#ffd8c2] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#b8502a]">{pt.day}</span>
                                            <button className="px-4 py-1.5 bg-[#b8502a] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#a04322] transition-colors">
                                                Mark Completed
                                            </button>
                                        </div>
                                        <h5 className="font-bold text-[#3d3a34] text-sm">{pt.title}</h5>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* 1. COURSES ROADMAP SECTION */}
                                {(roadmapCategoryFilter === 'all' || roadmapCategoryFilter === 'courses') && (
                                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between border-b border-[#f0e6d4] pb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">📚</span>
                                                <div>
                                                    <h3 className="text-lg font-serif font-bold text-[#1E3A5F]">Subscribed Courses Roadmap</h3>
                                                    <p className="text-xs text-[#787163]">Structured subject coverage &amp; daily study tasks</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-[#1E3A5F] bg-[#eef2f6] px-3 py-1 rounded-full border border-[#cbd5e1]">
                                                {coursesRoadmap.inProgress.length} In Progress • {coursesRoadmap.completed.length} Completed
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* In Progress Courses */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[#b8502a] bg-[#fff0e6] px-3 py-1 rounded-full border border-[#ffd8c2] uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-[#b8502a] animate-pulse"></span>
                                                        IN PROGRESS COURSES ({coursesRoadmap.inProgress.length})
                                                    </span>
                                                </div>

                                                {coursesRoadmap.inProgress.length > 0 ? (
                                                    coursesRoadmap.inProgress.map((item) => (
                                                        <div key={item._id} className="bg-white border-2 border-[#b8502a] rounded-2xl p-5 shadow-sm space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold bg-[#fff0e6] text-[#b8502a] px-2 py-0.5 rounded-md border border-[#ffd8c2]">
                                                                        #{item.tag}
                                                                    </span>
                                                                    <h4 className="text-base font-bold text-[#1E3A5F] mt-1">{item.title}</h4>
                                                                </div>
                                                                <span className="text-base font-extrabold text-[#b8502a] whitespace-nowrap">
                                                                    {item.percentage}%
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-[#f5ead8] rounded-full h-2.5 overflow-hidden border border-[#e3d5bd]">
                                                                <div
                                                                    className="bg-[#b8502a] h-full transition-all duration-500 rounded-full"
                                                                    style={{ width: `${item.percentage}%` }}
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-[#787163] font-medium pt-1">
                                                                <span>Tasks Done: {item.completedTasks} of {item.totalTasks}</span>
                                                                <span>Started: {item.startedOn || '15 Jul 2026'}</span>
                                                            </div>

                                                            {(item.ptsGroupCode || item.mtsGroupCode) && (
                                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#f0e6d4] text-[11px]">
                                                                    {item.ptsGroupCode && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">PTS: #{item.ptsGroupCode}</span>}
                                                                    {item.mtsGroupCode && <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">MTS: #{item.mtsGroupCode}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#787163] p-4 bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e1]">No courses currently in progress.</p>
                                                )}
                                            </div>

                                            {/* Completed Courses */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span>✓</span> COMPLETED COURSES ({coursesRoadmap.completed.length})
                                                    </span>
                                                </div>

                                                {coursesRoadmap.completed.length > 0 ? (
                                                    coursesRoadmap.completed.map((item) => (
                                                        <div key={item._id} className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-xs space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                                                        #{item.tag}
                                                                    </span>
                                                                    <h4 className="text-base font-bold text-[#1E3A5F] mt-1">{item.title}</h4>
                                                                </div>
                                                                <span className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                                                                    ✓ 100% Done
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                                                                <div className="bg-emerald-600 h-full rounded-full w-full" />
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-[#787163] font-medium pt-1">
                                                                <span>Completed {item.completedTasks} of {item.totalTasks} tasks</span>
                                                                <span className="text-emerald-700 font-semibold">Finished: {item.finishedOn || '31 Jul 2026'}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#787163] p-4 bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e1]">No completed courses yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. MTS (MAINS TEST SERIES) ROADMAP SECTION */}
                                {(roadmapCategoryFilter === 'all' || roadmapCategoryFilter === 'mts') && (
                                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between border-b border-[#f0e6d4] pb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">✍️</span>
                                                <div>
                                                    <h3 className="text-lg font-serif font-bold text-[#1E3A5F]">Mains Test Series (MTS) Roadmap</h3>
                                                    <p className="text-xs text-[#787163]">Answer writing practice, model answers &amp; mentor evaluation desk</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                                {mtsRoadmap.inProgress.length} In Progress • {mtsRoadmap.completed.length} Completed
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* In Progress MTS */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                                                        IN PROGRESS MTS ({mtsRoadmap.inProgress.length})
                                                    </span>
                                                </div>

                                                {mtsRoadmap.inProgress.length > 0 ? (
                                                    mtsRoadmap.inProgress.map((item) => (
                                                        <div key={item._id} className="bg-white border-2 border-amber-500 rounded-2xl p-5 shadow-sm space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                                                                        #{item.tag}
                                                                    </span>
                                                                    <h4 className="text-base font-bold text-[#1E3A5F] mt-1">{item.title}</h4>
                                                                </div>
                                                                <span className="text-base font-extrabold text-amber-700 whitespace-nowrap">
                                                                    {item.percentage}%
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-amber-100 rounded-full h-2.5 overflow-hidden">
                                                                <div
                                                                    className="bg-amber-600 h-full transition-all duration-500 rounded-full"
                                                                    style={{ width: `${item.percentage}%` }}
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-[#787163] font-medium pt-1">
                                                                <span>Mains Tests Evaluated: {item.completedTests} of {item.totalTests}</span>
                                                                <span>Last Active: {item.lastSubmission || 'Recently'}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#787163] p-4 bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e1]">No MTS batches currently in progress.</p>
                                                )}
                                            </div>

                                            {/* Completed MTS */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span>✓</span> COMPLETED MTS ({mtsRoadmap.completed.length})
                                                    </span>
                                                </div>

                                                {mtsRoadmap.completed.length > 0 ? (
                                                    mtsRoadmap.completed.map((item) => (
                                                        <div key={item._id} className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-xs space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                                                        #{item.tag}
                                                                    </span>
                                                                    <h4 className="text-base font-bold text-[#1E3A5F] mt-1">{item.title}</h4>
                                                                </div>
                                                                <span className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                                                                    ✓ Finished
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                                                                <div className="bg-emerald-600 h-full rounded-full w-full" />
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-[#787163] font-medium pt-1">
                                                                <span>Completed all {item.completedTests} of {item.totalTests} test papers</span>
                                                                <span className="text-emerald-700 font-semibold">Finished: {item.finishedOn || '10 Aug 2026'}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#787163] p-4 bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e1]">No completed MTS batches yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. PTS (PRELIMS TEST SERIES) ROADMAP SECTION */}
                                {(roadmapCategoryFilter === 'all' || roadmapCategoryFilter === 'pts') && (
                                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between border-b border-[#f0e6d4] pb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">🎯</span>
                                                <div>
                                                    <h3 className="text-lg font-serif font-bold text-[#1E3A5F]">Prelims Test Series (PTS) Roadmap</h3>
                                                    <p className="text-xs text-[#787163]">Prelims MCQ practice tests, instant analysis &amp; score tracking</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                                                {ptsRoadmap.inProgress.length} In Progress • {ptsRoadmap.completed.length} Completed
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* In Progress PTS */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-sky-800 bg-sky-100 px-3 py-1 rounded-full border border-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
                                                        IN PROGRESS PTS ({ptsRoadmap.inProgress.length})
                                                    </span>
                                                </div>

                                                {ptsRoadmap.inProgress.length > 0 ? (
                                                    ptsRoadmap.inProgress.map((item) => (
                                                        <div key={item._id} className="bg-white border-2 border-sky-500 rounded-2xl p-5 shadow-sm space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded-md">
                                                                        #{item.tag}
                                                                    </span>
                                                                    <h4 className="text-base font-bold text-[#1E3A5F] mt-1">{item.title}</h4>
                                                                </div>
                                                                <span className="text-base font-extrabold text-sky-700 whitespace-nowrap">
                                                                    {item.percentage}%
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-sky-100 rounded-full h-2.5 overflow-hidden">
                                                                <div
                                                                    className="bg-sky-600 h-full transition-all duration-500 rounded-full"
                                                                    style={{ width: `${item.percentage}%` }}
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-[#787163] font-medium pt-1">
                                                                <span>Prelims Tests Attempted: {item.completedTests} of {item.totalTests}</span>
                                                                <span>Last Attempt: {item.lastAttempt || 'Recently'}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#787163] p-4 bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e1]">No PTS batches currently in progress.</p>
                                                )}
                                            </div>

                                            {/* Completed PTS */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span>✓</span> COMPLETED PTS ({ptsRoadmap.completed.length})
                                                    </span>
                                                </div>

                                                {ptsRoadmap.completed.length > 0 ? (
                                                    ptsRoadmap.completed.map((item) => (
                                                        <div key={item._id} className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-xs space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                                                        #{item.tag}
                                                                    </span>
                                                                    <h4 className="text-base font-bold text-[#1E3A5F] mt-1">{item.title}</h4>
                                                                </div>
                                                                <span className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                                                                    ✓ Finished
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                                                                <div className="bg-emerald-600 h-full rounded-full w-full" />
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-[#787163] font-medium pt-1">
                                                                <span>Completed all {item.completedTests} of {item.totalTests} test papers</span>
                                                                <span className="text-emerald-700 font-semibold">Finished: {item.finishedOn || '05 Aug 2026'}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#787163] p-4 bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e1]">No completed PTS batches yet.</p>
                                                )}
                                            </div>
                                        </div>
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
                                            fetchChatMessages();
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
                                {chatMessages.map((m, idx) => {
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
                                                    {m.meta || '10:00 AM'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
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

                            <span className="px-4 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold">
                                Account Status: ACTIVE
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
                                    <div className="p-4 rounded-2xl bg-[#f7f0e4] border border-[#e8dcc8] space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-[#3d3a34]">Weekly review — answer structure</span>
                                            <span className="text-[#787163]">23 Aug 2026 • 32 min</span>
                                        </div>
                                        <p className="text-xs text-[#787163] leading-relaxed">
                                            Conclusions are the weak link. Fixed a three-line close: verdict, forward step, one committee.
                                        </p>
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
                                            handleToggleStep(activeModal.cardContext.tag, activeModal.cardContext.dayNumber, 'watch', true);
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
                                            handleToggleStep(activeModal.cardContext.tag, activeModal.cardContext.dayNumber, 'notes', true);
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
                                                handleToggleStep(activeModal.cardContext.tag, activeModal.cardContext.dayNumber, 'test', true);
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

            {/* Break Request Modal */}
            {showBreakModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBreakModal(false)}>
                    <div className="bg-[#fffdf8] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e3d5bd]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-serif font-bold text-[#3d3a34] mb-2">Request a Break?</h3>
                        <p className="text-xs text-[#787163] mb-4">
                            Your mentor reviews break requests before your account status changes. Daily task deadlines will be paused.
                        </p>
                        <div className="space-y-3">
                            <select className="w-full border border-[#e3d5bd] bg-[#f5ead8] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none">
                                <option value="Health">Health / Medical</option>
                                <option value="Family">Family Emergency</option>
                                <option value="Exams">University Exams</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowBreakModal(false)} className="flex-1 py-3 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163]">
                                Cancel
                            </button>
                            <button onClick={() => setShowBreakModal(false)} className="flex-1 py-3 rounded-xl bg-[#b8502a] text-white text-xs font-bold shadow-md">
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
