'use client';

import { useState } from 'react';
import { useStudentAuth } from '../contexts/StudentAuthContext';

interface PurchaseConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title: string;
    description?: string;
    itemType: 'mentorship' | 'pts' | 'mts' | 'courseGroup' | 'course';
    itemId?: string;
    tag?: string;
    price?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function PurchaseConfirmModal({
    isOpen,
    onClose,
    onSuccess,
    title,
    description,
    itemType,
    itemId,
    tag,
    price = 0,
}: PurchaseConfirmModalProps) {
    const { token, isLoggedIn, refreshUser } = useStudentAuth();
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirmPurchase = async () => {
        if (!isLoggedIn || !token) {
            setError('Please log in to purchase.');
            return;
        }

        setIsPurchasing(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ itemType, itemId, tag }),
            });

            const data = await res.json();

            if (data.success) {
                await refreshUser();
                onSuccess();
                onClose();
            } else {
                setError(data.message || 'Purchase failed');
            }
        } catch (e) {
            console.error('Purchase error:', e);
            setError('Network error. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-xl font-bold text-[#1E3A5F] font-serif">Confirm Access Purchase</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60">
                        <div className="text-xs uppercase tracking-wider font-semibold text-[#D97706] mb-1">
                            {itemType === 'mentorship' ? 'Mentorship Master Access' : 'Standalone Module Access'}
                        </div>
                        <h4 className="font-semibold text-gray-900 text-base">{title}</h4>
                        {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
                    </div>

                    <div className="flex justify-between items-center py-2 px-1">
                        <span className="text-sm font-medium text-gray-600">Access Fee</span>
                        <span className="text-2xl font-bold text-[#1E3A5F]">
                            {price > 0 ? `₹${price.toLocaleString()}` : 'Free Instant Unlock'}
                        </span>
                    </div>

                    <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200/80">
                        {itemType === 'mentorship'
                            ? '✨ Mentorship unlocks ALL Prelims, Mains, and Course modules permanently!'
                            : '🔓 Unlocks all features for this specific test series or course module.'}
                    </p>

                    {error && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isPurchasing}
                        className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmPurchase}
                        disabled={isPurchasing}
                        className="flex-1 py-3 px-4 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm hover:bg-[#152C4A] transition-colors shadow-md disabled:opacity-50"
                    >
                        {isPurchasing ? 'Unlocking...' : 'Confirm & Unlock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
