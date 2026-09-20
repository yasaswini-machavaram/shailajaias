'use client';

import { useState } from 'react';
import PurchaseConfirmModal from './PurchaseConfirmModal';

interface PurchasePromptProps {
    title: string;
    description?: string;
    itemType: 'mentorship' | 'pts' | 'mts' | 'courseGroup' | 'course';
    itemId?: string;
    tag?: string;
    price?: number;
    buttonText?: string;
}

export default function PurchasePrompt({
    title,
    description,
    itemType,
    itemId,
    tag,
    price = 0,
    buttonText = 'Unlock Access',
}: PurchasePromptProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300/60">
                            🔒 Locked Content
                        </div>
                        <h4 className="text-base font-bold text-[#1E3A5F]">{title}</h4>
                        {description && <p className="text-xs text-gray-600 max-w-xl">{description}</p>}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {price > 0 && (
                            <span className="text-lg font-bold text-[#1E3A5F]">₹{price.toLocaleString()}</span>
                        )}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="py-2.5 px-5 rounded-xl bg-[#1E3A5F] hover:bg-[#152C4A] text-white font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-95"
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>

            <PurchaseConfirmModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {}}
                title={title}
                description={description}
                itemType={itemType}
                itemId={itemId}
                tag={tag}
                price={price}
            />
        </>
    );
}
