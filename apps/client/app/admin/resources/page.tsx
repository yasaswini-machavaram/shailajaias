'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResourceCategory {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    icon: string;
    accentColor: string;
    order: number;
    predefinedTags: string[];
    isPublished: boolean;
    itemCount: number;
}

interface ResourceItem {
    _id: string;
    title: string;
    category: string | { _id: string; title: string };
    tag: string;
    pdfUrl: string;
    pdfKey: string;
    description?: string;
    order: number;
    isPublished: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_TAGS = ['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'];

const ACCENT_COLORS = [
    { label: 'Navy', value: '#1E3A5F' },
    { label: 'Orange', value: '#D97706' },
    { label: 'Green', value: '#059669' },
    { label: 'Blue', value: '#2563EB' },
    { label: 'Red', value: '#DC2626' },
    { label: 'Purple', value: '#7C3AED' },
    { label: 'Teal', value: '#0D9488' },
    { label: 'Indigo', value: '#4338CA' },
];

const EMOJI_OPTIONS = ['📚', '📝', '📒', '📖', '🏆', '📋', '✏️', '🎯', '📄', '📂', '🗂️', '💡'];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminResourcesPage() {
    const { token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Category State ───
    const [categories, setCategories] = useState<ResourceCategory[]>([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [showCatForm, setShowCatForm] = useState(false);
    const [editCatId, setEditCatId] = useState<string | null>(null);
    const [catTitle, setCatTitle] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [catIcon, setCatIcon] = useState('📁');
    const [catColor, setCatColor] = useState('#1E3A5F');
    const [catOrder, setCatOrder] = useState(0);
    const [catTags, setCatTags] = useState<string[]>([]);
    const [catCustomTag, setCatCustomTag] = useState('');
    const [catPublished, setCatPublished] = useState(true);
    const [catSubmitting, setCatSubmitting] = useState(false);
    const [catError, setCatError] = useState('');

    // ─── Item State ───
    const [items, setItems] = useState<ResourceItem[]>([]);
    const [isItemLoading, setIsItemLoading] = useState(false);
    const [filterCatId, setFilterCatId] = useState<string>('');
    const [showItemForm, setShowItemForm] = useState(false);
    const [editItemId, setEditItemId] = useState<string | null>(null);
    const [itemTitle, setItemTitle] = useState('');
    const [itemCat, setItemCat] = useState('');
    const [itemTag, setItemTag] = useState('');
    const [itemDesc, setItemDesc] = useState('');
    const [itemOrder, setItemOrder] = useState(0);
    const [itemPublished, setItemPublished] = useState(true);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [itemSubmitting, setItemSubmitting] = useState(false);
    const [itemError, setItemError] = useState('');

    // ─── Active Tab ───
    const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories');

    // ─── Effects ───
    useEffect(() => {
        if (token) fetchCategories();
    }, [token]);

    useEffect(() => {
        if (token && activeTab === 'items') fetchItems();
    }, [token, activeTab, filterCatId]);

    // ─── Category API ───
    const fetchCategories = async () => {
        setIsCatLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/resources/categories?includeUnpublished=true`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch (err) {
            console.error('Fetch categories error:', err);
        } finally {
            setIsCatLoading(false);
        }
    };

    const resetCatForm = () => {
        setCatTitle('');
        setCatDesc('');
        setCatIcon('📁');
        setCatColor('#1E3A5F');
        setCatOrder(0);
        setCatTags([]);
        setCatCustomTag('');
        setCatPublished(true);
        setCatError('');
        setEditCatId(null);
    };

    const openCatForm = (cat?: ResourceCategory) => {
        if (cat) {
            setEditCatId(cat._id);
            setCatTitle(cat.title);
            setCatDesc(cat.description || '');
            setCatIcon(cat.icon);
            setCatColor(cat.accentColor);
            setCatOrder(cat.order);
            setCatTags(cat.predefinedTags);
            setCatPublished(cat.isPublished);
        } else {
            resetCatForm();
        }
        setShowCatForm(true);
    };

    const handleCatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCatError('');
        if (!catTitle.trim()) { setCatError('Title is required'); return; }

        setCatSubmitting(true);
        try {
            const body = {
                title: catTitle.trim(),
                description: catDesc.trim() || undefined,
                icon: catIcon,
                accentColor: catColor,
                order: catOrder,
                predefinedTags: catTags,
                isPublished: catPublished,
            };

            const res = await fetch(
                `${API_URL}/api/resources/categories${editCatId ? `/${editCatId}` : ''}`,
                {
                    method: editCatId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await res.json();
            if (!data.success) {
                setCatError(data.message || 'Failed');
                return;
            }

            setShowCatForm(false);
            resetCatForm();
            fetchCategories();
        } catch {
            setCatError('Network error');
        } finally {
            setCatSubmitting(false);
        }
    };

    const deleteCat = async (id: string) => {
        if (!confirm('Delete this category and ALL its items? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/api/resources/categories/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setCategories(categories.filter(c => c._id !== id));
            }
        } catch (err) { console.error('Delete category error:', err); }
    };

    const addCustomTag = () => {
        const tag = catCustomTag.trim();
        if (tag && !catTags.includes(tag)) {
            setCatTags([...catTags, tag]);
        }
        setCatCustomTag('');
    };

    const removeTag = (tag: string) => {
        setCatTags(catTags.filter(t => t !== tag));
    };

    // ─── Item API ───
    const fetchItems = async () => {
        setIsItemLoading(true);
        try {
            const catParam = filterCatId ? `/${filterCatId}` : '';
            const url = filterCatId
                ? `${API_URL}/api/resources/categories/${filterCatId}`
                : `${API_URL}/api/resources/categories?includeUnpublished=true`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                if (filterCatId) {
                    // Single category with items
                    setItems(data.data.items || []);
                } else {
                    // All categories — we need to fetch all items
                    const allItems: ResourceItem[] = [];
                    for (const cat of data.data) {
                        const catRes = await fetch(`${API_URL}/api/resources/categories/${cat._id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        const catData = await catRes.json();
                        if (catData.success && catData.data.items) {
                            allItems.push(...catData.data.items.map((item: ResourceItem) => ({
                                ...item,
                                category: { _id: cat._id, title: cat.title },
                            })));
                        }
                    }
                    setItems(allItems);
                }
            }
        } catch (err) {
            console.error('Fetch items error:', err);
        } finally {
            setIsItemLoading(false);
        }
    };

    const resetItemForm = () => {
        setItemTitle('');
        setItemCat('');
        setItemTag('');
        setItemDesc('');
        setItemOrder(0);
        setItemPublished(true);
        setPdfFile(null);
        setItemError('');
        setEditItemId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const openItemForm = (item?: ResourceItem) => {
        if (item) {
            setEditItemId(item._id);
            setItemTitle(item.title);
            setItemCat(typeof item.category === 'string' ? item.category : item.category._id);
            setItemTag(item.tag);
            setItemDesc(item.description || '');
            setItemOrder(item.order);
            setItemPublished(item.isPublished);
        } else {
            resetItemForm();
            if (filterCatId) setItemCat(filterCatId);
        }
        setShowItemForm(true);
    };

    const handleItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setItemError('');
        if (!itemTitle.trim()) { setItemError('Title is required'); return; }
        if (!itemCat) { setItemError('Category is required'); return; }
        if (!itemTag.trim()) { setItemError('Tag is required'); return; }
        if (!editItemId && !pdfFile) { setItemError('Please upload a PDF'); return; }

        setItemSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', itemTitle.trim());
            formData.append('category', itemCat);
            formData.append('tag', itemTag.trim());
            formData.append('description', itemDesc.trim());
            formData.append('order', itemOrder.toString());
            formData.append('isPublished', String(itemPublished));
            if (pdfFile) formData.append('pdf', pdfFile);

            const res = await fetch(
                `${API_URL}/api/resources/items${editItemId ? `/${editItemId}` : ''}`,
                {
                    method: editItemId ? 'PUT' : 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                }
            );

            const data = await res.json();
            if (!data.success) {
                setItemError(data.message || 'Failed');
                return;
            }

            setShowItemForm(false);
            resetItemForm();
            fetchItems();
            fetchCategories(); // Update item counts
        } catch {
            setItemError('Network error');
        } finally {
            setItemSubmitting(false);
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Delete this resource item?')) return;
        try {
            const res = await fetch(`${API_URL}/api/resources/items/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setItems(items.filter(i => i._id !== id));
                fetchCategories(); // Update counts
            }
        } catch (err) { console.error('Delete item error:', err); }
    };

    // Get tags for the currently selected category in the item form
    const selectedCatTags = categories.find(c => c._id === itemCat)?.predefinedTags || [];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
                    <p className="text-gray-600 mt-1">Manage resource categories and uploaded study materials</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'categories'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Categories
                </button>
                <button
                    onClick={() => setActiveTab('items')}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'items'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Items
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* CATEGORIES TAB                                                 */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'categories' && (
                <>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => openCatForm()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            + Add Category
                        </button>
                    </div>

                    {isCatLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                            <p className="text-4xl mb-3">📂</p>
                            <p>No categories yet</p>
                            <button onClick={() => openCatForm()} className="text-blue-600 hover:underline mt-2 inline-block">
                                Create your first category
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tags</th>
                                        <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                                        <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                                        <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {categories.map((cat) => (
                                        <tr key={cat._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                                        style={{ backgroundColor: cat.accentColor + '15', borderLeft: `3px solid ${cat.accentColor}` }}
                                                    >
                                                        {cat.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{cat.title}</p>
                                                        {cat.description && (
                                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{cat.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {cat.predefinedTags.slice(0, 4).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tag}</span>
                                                    ))}
                                                    {cat.predefinedTags.length > 4 && (
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">+{cat.predefinedTags.length - 4}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-600 font-medium">{cat.itemCount}</td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">{cat.order}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${cat.isPublished
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {cat.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openCatForm(cat)} className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">Edit</button>
                                                    <button onClick={() => deleteCat(cat._id)} className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* ITEMS TAB                                                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'items' && (
                <>
                    {/* Filters + Add */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <select
                            value={filterCatId}
                            onChange={(e) => setFilterCatId(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c._id} value={c._id}>{c.icon} {c.title}</option>
                            ))}
                        </select>
                        <div className="flex-1" />
                        <button
                            onClick={() => openItemForm()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            + Add Resource
                        </button>
                    </div>

                    {isItemLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                            <p className="text-4xl mb-3">📄</p>
                            <p>No resource items found</p>
                            <button onClick={() => openItemForm()} className="text-blue-600 hover:underline mt-2 inline-block">
                                Upload your first resource
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tag</th>
                                        <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => {
                                        const catName = typeof item.category === 'string'
                                            ? categories.find(c => c._id === item.category)?.title || '—'
                                            : item.category.title;

                                        return (
                                            <tr key={item._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">📄</span>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{item.title}</p>
                                                            <a
                                                                href={getFullUrl(item.pdfUrl)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-500 hover:underline"
                                                            >View PDF ↗</a>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{catName}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{item.tag}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.isPublished
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {item.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openItemForm(item)} className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">Edit</button>
                                                        <button onClick={() => deleteItem(item._id)} className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* CATEGORY FORM MODAL                                            */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {showCatForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editCatId ? 'Edit Category' : 'Add Category'}
                            </h2>
                            <button onClick={() => { setShowCatForm(false); resetCatForm(); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">✕</button>
                        </div>

                        <form onSubmit={handleCatSubmit} className="space-y-4">
                            {catError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{catError}</div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={catTitle}
                                    onChange={e => setCatTitle(e.target.value)}
                                    placeholder="e.g., Standard Text Books"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={catDesc}
                                    onChange={e => setCatDesc(e.target.value)}
                                    placeholder="Brief description (optional)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Icon & Color */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg">
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setCatIcon(emoji)}
                                                className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-colors ${catIcon === emoji
                                                    ? 'bg-blue-100 ring-2 ring-blue-400'
                                                    : 'hover:bg-gray-100'
                                                }`}
                                            >{emoji}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                                    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg">
                                        {ACCENT_COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setCatColor(c.value)}
                                                title={c.label}
                                                className={`w-8 h-8 rounded-full transition-all ${catColor === c.value ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: c.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Predefined Tags</label>
                                {/* Preset tags (quick add) */}
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {PRESET_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => {
                                                if (catTags.includes(tag)) removeTag(tag);
                                                else setCatTags([...catTags, tag]);
                                            }}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${catTags.includes(tag)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >{tag}</button>
                                    ))}
                                </div>
                                {/* Custom tag input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={catCustomTag}
                                        onChange={e => setCatCustomTag(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                                        placeholder="Add custom tag..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button type="button" onClick={addCustomTag} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Add</button>
                                </div>
                                {/* Current tags */}
                                {catTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {catTags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Order & Published */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        value={catOrder}
                                        onChange={e => setCatOrder(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={catPublished}
                                            onChange={e => setCatPublished(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Published</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={catSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {catSubmitting ? 'Saving...' : (editCatId ? 'Update Category' : 'Create Category')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowCatForm(false); resetCatForm(); }}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* ITEM FORM MODAL                                                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {showItemForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editItemId ? 'Edit Resource' : 'Add Resource'}
                            </h2>
                            <button onClick={() => { setShowItemForm(false); resetItemForm(); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">✕</button>
                        </div>

                        <form onSubmit={handleItemSubmit} className="space-y-4">
                            {itemError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{itemError}</div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={itemTitle}
                                    onChange={e => setItemTitle(e.target.value)}
                                    placeholder="e.g., Ancient & Medieval History"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Category & Tag */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                    <select
                                        value={itemCat}
                                        onChange={e => { setItemCat(e.target.value); setItemTag(''); }}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.icon} {c.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tag *</label>
                                    {selectedCatTags.length > 0 ? (
                                        <select
                                            value={itemTag}
                                            onChange={e => setItemTag(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select tag</option>
                                            {selectedCatTags.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={itemTag}
                                            onChange={e => setItemTag(e.target.value)}
                                            placeholder="e.g., GS1"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={itemDesc}
                                    onChange={e => setItemDesc(e.target.value)}
                                    placeholder="Brief description (optional)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* PDF Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    PDF Document {editItemId ? '(optional — keep current if empty)' : '*'}
                                </label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    {pdfFile ? (
                                        <div className="text-blue-600">
                                            <span className="text-3xl">📄</span>
                                            <p className="mt-2 font-medium">{pdfFile.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">
                                            <span className="text-3xl">📎</span>
                                            <p className="mt-2 font-medium">Click to select PDF</p>
                                            <p className="text-xs">PDF format only, max 50MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Published */}
                            <div className="flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={itemPublished}
                                        onChange={e => setItemPublished(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Published</span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={itemSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {itemSubmitting ? 'Saving...' : (editItemId ? 'Update Resource' : 'Upload Resource')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowItemForm(false); resetItemForm(); }}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
