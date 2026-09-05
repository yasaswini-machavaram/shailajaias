'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type LevelType = 'course' | 'subject' | 'topic' | 'subtopic';
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
    level: LevelType;
    videos: VideoItem[];
    contentTabs?: any[];
    isPublished: boolean;
    isPracticeLocked: boolean;
    isHelpLocked: boolean;
    isLocked: boolean;
    children?: CourseNode[];
}

interface QuizOption {
    _id: string;
    title: string;
    date?: string;
}

interface MptOption {
    _id: string;
    title: string;
    subjectCategory?: string;
}

export default function CourseBuilderPage() {
    const params = useParams();
    const courseId = params?.id as string;
    const { token } = useAuth();

    const [rootCourse, setRootCourse] = useState<CourseNode | null>(null);
    const [treeData, setTreeData] = useState<CourseNode[]>([]);
    const [selectedNode, setSelectedNode] = useState<CourseNode | null>(null);
    const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
    const [mptList, setMptList] = useState<MptOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    // Modal state for adding child node
    const [showAddModal, setShowAddModal] = useState(false);
    const [addChildParent, setAddChildParent] = useState<CourseNode | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newLevel, setNewLevel] = useState<LevelType>('subject');

    // Editor form state for selected node
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublished, setEditIsPublished] = useState(false);
    const [editIsPracticeLocked, setEditIsPracticeLocked] = useState(false);
    const [editIsHelpLocked, setEditIsHelpLocked] = useState(false);
    const [editIsLocked, setEditIsLocked] = useState(false);

    // Multi-video playlist state for selected node
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);

    useEffect(() => {
        if (token && courseId) {
            fetchCourseTree();
            fetchAvailableQuizzes();
            fetchAvailableMpt();
        }
    }, [token, courseId]);

    const fetchCourseTree = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/courses/tree/${courseId}`);
            const data = await res.json();
            if (data.success) {
                setRootCourse(data.data);
                setTreeData(data.data.children || []);
                if (!selectedNode) {
                    selectNodeToEdit(data.data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch course tree:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableQuizzes = async () => {
        try {
            const res = await fetch(`${API_URL}/api/quizzes`);
            const data = await res.json();
            if (data.success) {
                setQuizzes(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch quizzes:', err);
        }
    };

    const fetchAvailableMpt = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mpt`);
            const data = await res.json();
            if (data.success) {
                setMptList(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch Mains Practice Tests:', err);
        }
    };

    const selectNodeToEdit = (node: CourseNode) => {
        setSelectedNode(node);
        setEditTitle(node.title || '');
        setEditDescription(node.description || '');
        setEditIsPublished(node.isPublished || false);
        setEditIsPracticeLocked(node.isPracticeLocked || false);
        setEditIsHelpLocked(node.isHelpLocked || false);
        setEditIsLocked(node.isLocked || false);

        // Populate videos or create a default empty video if none exist
        const nodeVideos = node.videos && node.videos.length > 0 ? node.videos : [];
        if (nodeVideos.length === 0) {
            // Check legacy contentTabs fallback
            const legacyVideo = node.contentTabs?.find((t: any) => t.type === 'video');
            const legacyNotes = node.contentTabs?.find((t: any) => t.type === 'notes');
            const legacyTest = node.contentTabs?.find((t: any) => t.type === 'test');
            const legacyMains = node.contentTabs?.find((t: any) => t.type === 'mains');
            const legacyHelp = node.contentTabs?.find((t: any) => t.type === 'help');

            nodeVideos.push({
                title: node.title || 'Lecture Video 1',
                videoProvider: legacyVideo?.videoProvider || 'youtube',
                videoUrl: legacyVideo?.videoUrl || '',
                notesText: legacyNotes?.notesText || '',
                pdfFiles: legacyNotes?.pdfUrl ? [{ title: 'Lecture Notes PDF', pdfUrl: legacyNotes.pdfUrl }] : [],
                prelimsQuizId: legacyTest?.testId || '',
                mainsQuestionText: legacyMains?.mainsQuestionText || '',
                mainsModelAnswer: legacyMains?.mainsModelAnswer || '',
                helpContactInfo: legacyHelp?.helpContactInfo || '',
                faqs: [],
            });
        }
        setVideos(nodeVideos);
        setSelectedVideoIndex(0);
    };

    const handleAddVideo = () => {
        const newVid: VideoItem = {
            title: `Video #${videos.length + 1}`,
            videoProvider: 'youtube',
            videoUrl: '',
            notesText: '',
            pdfFiles: [],
            prelimsQuizId: '',
            prelimsDiscussionVideoProvider: 'youtube',
            prelimsDiscussionVideoUrl: '',
            mainsPracticeTestId: '',
            mainsQuestionText: '',
            mainsModelAnswer: '',
            mainsDiscussionVideoProvider: 'youtube',
            mainsDiscussionVideoUrl: '',
            helpContactInfo: '',
            faqs: [],
        };
        const updated = [...videos, newVid];
        setVideos(updated);
        setSelectedVideoIndex(updated.length - 1);
    };

    const handleRemoveVideo = (indexToRemove: number) => {
        if (videos.length <= 1) {
            alert('A lecture node must have at least 1 video slot.');
            return;
        }
        const updated = videos.filter((_, idx) => idx !== indexToRemove);
        setVideos(updated);
        setSelectedVideoIndex(Math.max(0, indexToRemove - 1));
    };

    const updateCurrentVideoField = (field: keyof VideoItem, value: any) => {
        if (videos.length === 0) return;
        const updated = [...videos];
        updated[selectedVideoIndex] = {
            ...updated[selectedVideoIndex],
            [field]: value,
        };
        setVideos(updated);
    };

    // PDF Files Manager Helpers for Current Video
    const handleAddPdfFile = () => {
        const currentVid = videos[selectedVideoIndex];
        if (!currentVid) return;
        const newPdf: PdfFile = { title: 'Reference Material', pdfUrl: '' };
        updateCurrentVideoField('pdfFiles', [...(currentVid.pdfFiles || []), newPdf]);
    };

    const handleUpdatePdfFile = (pdfIdx: number, field: keyof PdfFile, val: string) => {
        const currentVid = videos[selectedVideoIndex];
        if (!currentVid) return;
        const updatedPdfs = [...(currentVid.pdfFiles || [])];
        updatedPdfs[pdfIdx] = { ...updatedPdfs[pdfIdx], [field]: val };
        updateCurrentVideoField('pdfFiles', updatedPdfs);
    };

    const handleRemovePdfFile = (pdfIdx: number) => {
        const currentVid = videos[selectedVideoIndex];
        if (!currentVid) return;
        const updatedPdfs = (currentVid.pdfFiles || []).filter((_, idx) => idx !== pdfIdx);
        updateCurrentVideoField('pdfFiles', updatedPdfs);
    };

    // FAQ Items Manager Helpers for Current Video
    const handleAddFaq = () => {
        const currentVid = videos[selectedVideoIndex];
        if (!currentVid) return;
        const newFaq: FaqItem = { question: '', answer: '' };
        updateCurrentVideoField('faqs', [...(currentVid.faqs || []), newFaq]);
    };

    const handleUpdateFaq = (faqIdx: number, field: keyof FaqItem, val: string) => {
        const currentVid = videos[selectedVideoIndex];
        if (!currentVid) return;
        const updatedFaqs = [...(currentVid.faqs || [])];
        updatedFaqs[faqIdx] = { ...updatedFaqs[faqIdx], [field]: val };
        updateCurrentVideoField('faqs', updatedFaqs);
    };

    const handleRemoveFaq = (faqIdx: number) => {
        const currentVid = videos[selectedVideoIndex];
        if (!currentVid) return;
        const updatedFaqs = (currentVid.faqs || []).filter((_, idx) => idx !== faqIdx);
        updateCurrentVideoField('faqs', updatedFaqs);
    };

    const handleSaveNode = async () => {
        if (!selectedNode || !token) return;
        setIsSaving(true);
        setStatusMsg('');

        try {
            const res = await fetch(`${API_URL}/api/courses/${selectedNode._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: editTitle,
                    description: editDescription,
                    isPublished: editIsPublished,
                    isPracticeLocked: editIsPracticeLocked,
                    isHelpLocked: editIsHelpLocked,
                    isLocked: editIsLocked,
                    videos: videos.map((v) => ({
                        ...v,
                        title: v.title.trim() || 'Untitled Video',
                        videoUrl: v.videoUrl.trim(),
                        prelimsQuizId: v.prelimsQuizId && v.prelimsQuizId.trim() !== '' ? v.prelimsQuizId : null,
                        mainsPracticeTestId: v.mainsPracticeTestId && v.mainsPracticeTestId.trim() !== '' ? v.mainsPracticeTestId : null,
                        pdfFiles: (v.pdfFiles || []).filter((p) => p.pdfUrl.trim() !== ''),
                        faqs: (v.faqs || []).filter((f) => f.question.trim() !== '' && f.answer.trim() !== ''),
                    })),
                }),
            });

            const data = await res.json();
            if (data.success) {
                setStatusMsg('Saved successfully!');
                setTimeout(() => setStatusMsg(''), 3000);
                fetchCourseTree();
            } else {
                setStatusMsg(data.message || 'Failed to save');
            }
        } catch (err) {
            console.error('Save node error:', err);
            setStatusMsg('Error saving node');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddChild = async () => {
        if (!newTitle.trim() || !addChildParent || !token) return;

        try {
            const res = await fetch(`${API_URL}/api/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    level: newLevel,
                    parent: addChildParent._id,
                    order: (addChildParent.children?.length || 0) + 1,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setShowAddModal(false);
                setNewTitle('');
                fetchCourseTree();
            }
        } catch (err) {
            console.error('Create child node error:', err);
        }
    };

    const handleDeleteNode = async (nodeId: string) => {
        if (!confirm('Are you sure you want to delete this module and all its sub-items?')) return;
        try {
            const res = await fetch(`${API_URL}/api/courses/${nodeId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                if (selectedNode?._id === nodeId) {
                    setSelectedNode(rootCourse);
                }
                fetchCourseTree();
            }
        } catch (err) {
            console.error('Delete node error:', err);
        }
    };

    const renderTreeNodes = (nodes: CourseNode[], depth = 0) => {
        return nodes.map((node) => {
            const isSelected = selectedNode?._id === node._id;
            return (
                <div key={node._id} className="select-none">
                    <div
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            isSelected
                                ? 'bg-amber-100 text-amber-950 font-semibold border border-amber-300'
                                : 'hover:bg-gray-100 text-gray-700'
                        }`}
                        style={{ paddingLeft: `${depth * 16 + 12}px` }}
                        onClick={() => selectNodeToEdit(node)}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span>
                                {node.level === 'subject' && '📘'}
                                {node.level === 'topic' && '📁'}
                                {node.level === 'subtopic' && '🎥'}
                            </span>
                            <span className="truncate">{node.title}</span>
                            {node.videos && node.videos.length > 1 && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                    {node.videos.length} vids
                                </span>
                            )}
                            {node.isLocked && <span className="text-xs">🔒</span>}
                            {!node.isPublished && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                                    Draft
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                            {node.level !== 'subtopic' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAddChildParent(node);
                                        const nextLevel =
                                            node.level === 'course'
                                                ? 'subject'
                                                : node.level === 'subject'
                                                ? 'topic'
                                                : 'subtopic';
                                        setNewLevel(nextLevel);
                                        setShowAddModal(true);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded text-xs text-amber-700 font-bold"
                                    title="Add child item"
                                >
                                    + Add
                                </button>
                            )}
                            {node._id !== rootCourse?._id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNode(node._id);
                                    }}
                                    className="p-1 hover:bg-red-100 rounded text-xs text-red-600"
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                    {node.children && node.children.length > 0 && (
                        <div>{renderTreeNodes(node.children, depth + 1)}</div>
                    )}
                </div>
            );
        });
    };

    const currentVid = videos[selectedVideoIndex] || null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Link href="/admin/courses" className="hover:underline">
                            Courses
                        </Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">{rootCourse?.title}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{rootCourse?.title} - Course Builder</h1>
                </div>

                <div className="flex items-center gap-3">
                    {statusMsg && (
                        <span
                            className={`text-sm px-3 py-1 rounded-md font-medium ${
                                statusMsg.includes('Saved')
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                            }`}
                        >
                            {statusMsg}
                        </span>
                    )}
                    <button
                        onClick={handleSaveNode}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#152C4A] text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : '💾 Save Selected Node'}
                    </button>
                </div>
            </div>

            {/* Main 2-Column Workspace */}
            <div className="grid grid-cols-12 gap-8">
                {/* Left Column: Tree Hierarchy Navigator */}
                <div className="col-span-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col h-[820px]">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 text-base">Course Hierarchy</h2>
                        <button
                            onClick={() => {
                                if (rootCourse) {
                                    setAddChildParent(rootCourse);
                                    setNewLevel('subject');
                                    setShowAddModal(true);
                                }
                            }}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                        >
                            + Add Subject
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {rootCourse && (
                            <div
                                onClick={() => selectNodeToEdit(rootCourse)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer mb-2 ${
                                    selectedNode?._id === rootCourse._id
                                        ? 'bg-amber-200 text-amber-950 font-bold border border-amber-400'
                                        : 'bg-gray-50 text-gray-900 font-semibold'
                                }`}
                            >
                                <span>🎓 {rootCourse.title} (Root)</span>
                            </div>
                        )}
                        {renderTreeNodes(treeData)}
                    </div>
                </div>

                {/* Right Column: Node Details & Multi-Video Content Editor */}
                <div className="col-span-8 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-[820px] overflow-y-auto">
                    {selectedNode ? (
                        <div className="space-y-6">
                            {/* Selected Node Heading & Lock Panel */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            Level: {selectedNode.level}
                                        </span>
                                        <h2 className="text-xl font-bold text-gray-900 mt-1">
                                            Editing Node: {selectedNode.title}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editIsPublished}
                                                onChange={(e) => setEditIsPublished(e.target.checked)}
                                                className="w-4 h-4 text-amber-600 rounded"
                                            />
                                            Published
                                        </label>
                                    </div>
                                </div>

                                {/* Admin Lock Switches */}
                                <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-4">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editIsPracticeLocked}
                                            onChange={(e) => setEditIsPracticeLocked(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded"
                                        />
                                        🔒 Lock Practice (Prelims/Mains)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editIsHelpLocked}
                                            onChange={(e) => setEditIsHelpLocked(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded"
                                        />
                                        🔒 Lock Help/FAQ Section
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editIsLocked}
                                            onChange={(e) => setEditIsLocked(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded"
                                        />
                                        🔒 Lock Entire Lecture Node
                                    </label>
                                </div>
                            </div>

                            {/* Node Title & Description */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Node Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Node Description
                                    </label>
                                    <input
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            {/* ─── MULTI-VIDEO PLAYLIST MANAGER ─────────────────────────────── */}
                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                            🎬 Lecture Video Playlist ({videos.length} Videos)
                                        </h3>
                                        <p className="text-[11px] text-gray-600">
                                            Add multiple videos to this lecture node. Each video will have its own Notes, Practice, and FAQs.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleAddVideo}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs"
                                    >
                                        + Add Video to Node
                                    </button>
                                </div>

                                {/* Video Tab Pill Selectors */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-amber-200 mb-4">
                                    {videos.map((vid, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedVideoIndex(idx)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-2 transition-all ${
                                                selectedVideoIndex === idx
                                                    ? 'bg-[#1E3A5F] text-amber-300 shadow-xs'
                                                    : 'bg-white text-gray-700 hover:bg-amber-100 border border-gray-200'
                                            }`}
                                        >
                                            <span>🎥 {vid.title || `Video #${idx + 1}`}</span>
                                            {videos.length > 1 && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveVideo(idx);
                                                    }}
                                                    className="hover:text-red-400 font-bold ml-1"
                                                    title="Remove video"
                                                >
                                                    ×
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Active Video Setup Form */}
                                {currentVid && (
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-5">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Video Title *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currentVid.title}
                                                    onChange={(e) => updateCurrentVideoField('title', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    placeholder="e.g. Part 1: Concept Introduction"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Provider
                                                </label>
                                                <select
                                                    value={currentVid.videoProvider}
                                                    onChange={(e) =>
                                                        updateCurrentVideoField('videoProvider', e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                >
                                                    <option value="youtube">YouTube Embed</option>
                                                    <option value="bunny">Bunny.net Stream</option>
                                                    <option value="custom">Custom Iframe Link</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Video URL / Embed Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currentVid.videoUrl}
                                                    onChange={(e) => updateCurrentVideoField('videoUrl', e.target.value)}
                                                    placeholder="https://www.youtube.com/watch?v=..."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* ─── SECTION: NOTES (WITH MULTI-PDF SUPPORT) ─────────────── */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 space-y-3">
                                            <h4 className="font-bold text-gray-900 text-xs flex items-center justify-between">
                                                <span>📄 Notes &amp; Multiple PDF Handouts for Video</span>
                                            </h4>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Notes Text / Summary
                                                </label>
                                                <textarea
                                                    value={currentVid.notesText || ''}
                                                    onChange={(e) => updateCurrentVideoField('notesText', e.target.value)}
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    placeholder="Enter lecture text notes or class summary..."
                                                />
                                            </div>

                                            {/* Multi-PDF File List */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-xs font-semibold text-gray-700">
                                                        Downloadable PDF Handouts ({currentVid.pdfFiles?.length || 0})
                                                    </label>
                                                    <button
                                                        onClick={handleAddPdfFile}
                                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold"
                                                    >
                                                        + Add PDF File
                                                    </button>
                                                </div>

                                                {(currentVid.pdfFiles || []).length === 0 ? (
                                                    <p className="text-[11px] text-gray-400 italic">
                                                        No PDF files attached yet. Click &quot;+ Add PDF File&quot; to add class handouts.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {currentVid.pdfFiles.map((pdf, pIdx) => (
                                                            <div key={pIdx} className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={pdf.title}
                                                                    onChange={(e) =>
                                                                        handleUpdatePdfFile(pIdx, 'title', e.target.value)
                                                                    }
                                                                    placeholder="PDF Title (e.g. Class PPT)"
                                                                    className="w-1/3 px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={pdf.pdfUrl}
                                                                    onChange={(e) =>
                                                                        handleUpdatePdfFile(pIdx, 'pdfUrl', e.target.value)
                                                                    }
                                                                    placeholder="https://.../handout.pdf"
                                                                    className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white"
                                                                />
                                                                <button
                                                                    onClick={() => handleRemovePdfFile(pIdx)}
                                                                    className="text-red-600 hover:bg-red-50 p-1 rounded text-xs font-bold"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ─── SECTION: PRELIMS PRACTICE ─────────────────────────────── */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 space-y-3">
                                            <h4 className="font-bold text-gray-900 text-xs flex items-center justify-between">
                                                <span>📝 Prelims Practice &amp; Discussion Video</span>
                                            </h4>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        Attach Prelims Quiz
                                                    </label>
                                                    <select
                                                        value={currentVid.prelimsQuizId || ''}
                                                        onChange={(e) =>
                                                            updateCurrentVideoField('prelimsQuizId', e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    >
                                                        <option value="">-- No Quiz Attached --</option>
                                                        {quizzes.map((q) => (
                                                            <option key={q._id} value={q._id}>
                                                                {q.title} {q.date ? `(${q.date})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        Prelims Discussion Video URL (Separate)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={currentVid.prelimsDiscussionVideoUrl || ''}
                                                        onChange={(e) =>
                                                            updateCurrentVideoField('prelimsDiscussionVideoUrl', e.target.value)
                                                        }
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ─── SECTION: MAINS PRACTICE (WITH MPT TAGGING) ─────────────── */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 space-y-3">
                                            <h4 className="font-bold text-gray-900 text-xs flex items-center justify-between">
                                                <span>✍️ Mains Practice &amp; Discussion Video</span>
                                            </h4>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        Tag / Link Mains Practice Test
                                                    </label>
                                                    <select
                                                        value={currentVid.mainsPracticeTestId || ''}
                                                        onChange={(e) =>
                                                            updateCurrentVideoField('mainsPracticeTestId', e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    >
                                                        <option value="">-- Select Mains Practice Test --</option>
                                                        {mptList.map((m) => (
                                                            <option key={m._id} value={m._id}>
                                                                {m.title} ({m.subjectCategory || 'Mains'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        Mains Discussion Video URL (Separate)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={currentVid.mainsDiscussionVideoUrl || ''}
                                                        onChange={(e) =>
                                                            updateCurrentVideoField('mainsDiscussionVideoUrl', e.target.value)
                                                        }
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-1">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        Direct Mains Question Text
                                                    </label>
                                                    <textarea
                                                        value={currentVid.mainsQuestionText || ''}
                                                        onChange={(e) =>
                                                            updateCurrentVideoField('mainsQuestionText', e.target.value)
                                                        }
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                        placeholder="Write custom Mains practice question..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        Model Answer / Framework
                                                    </label>
                                                    <textarea
                                                        value={currentVid.mainsModelAnswer || ''}
                                                        onChange={(e) =>
                                                            updateCurrentVideoField('mainsModelAnswer', e.target.value)
                                                        }
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                        placeholder="Model answer guidance..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ─── SECTION: HELP & MULTI-FAQ ─────────────────────────────── */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 space-y-3">
                                            <h4 className="font-bold text-gray-900 text-xs flex items-center justify-between">
                                                <span>❓ Help &amp; FAQs for Video</span>
                                            </h4>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Help &amp; Doubt Contact Info
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currentVid.helpContactInfo || ''}
                                                    onChange={(e) =>
                                                        updateCurrentVideoField('helpContactInfo', e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    placeholder="e.g. Email mentor@shailajaias.com or post in thread..."
                                                />
                                            </div>

                                            {/* Multi-FAQ List */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-xs font-semibold text-gray-700">
                                                        Frequently Asked Questions (FAQs: {currentVid.faqs?.length || 0})
                                                    </label>
                                                    <button
                                                        onClick={handleAddFaq}
                                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold"
                                                    >
                                                        + Add FAQ Question
                                                    </button>
                                                </div>

                                                {(currentVid.faqs || []).length === 0 ? (
                                                    <p className="text-[11px] text-gray-400 italic">
                                                        No FAQs added yet. Click &quot;+ Add FAQ Question&quot; to add lecture FAQs.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {currentVid.faqs.map((faq, fIdx) => (
                                                            <div key={fIdx} className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-gray-700">
                                                                        FAQ #{fIdx + 1}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleRemoveFaq(fIdx)}
                                                                        className="text-red-600 hover:bg-red-50 px-2 py-0.5 rounded text-xs font-bold"
                                                                    >
                                                                        Remove FAQ
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={faq.question}
                                                                    onChange={(e) =>
                                                                        handleUpdateFaq(fIdx, 'question', e.target.value)
                                                                    }
                                                                    placeholder="Question (e.g. What is the scope of Article 21?)"
                                                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                                                                />
                                                                <textarea
                                                                    value={faq.answer}
                                                                    onChange={(e) =>
                                                                        handleUpdateFaq(fIdx, 'answer', e.target.value)
                                                                    }
                                                                    rows={2}
                                                                    placeholder="Answer details..."
                                                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Select an item from the left hierarchy to edit.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Adding Child Node */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            Add Sub-Item under &quot;{addChildParent?.title}&quot;
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Adding item at level: <strong>{newLevel}</strong>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder={`Name of ${newLevel}...`}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Level Type
                                </label>
                                <select
                                    value={newLevel}
                                    onChange={(e) => setNewLevel(e.target.value as LevelType)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                    <option value="subject">Subject (e.g. Indian Polity)</option>
                                    <option value="topic">Chapter / Module (e.g. Preamble)</option>
                                    <option value="subtopic">Lecture / Lesson (e.g. Lecture 1)</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleAddChild}
                                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold"
                                >
                                    Add Item
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
