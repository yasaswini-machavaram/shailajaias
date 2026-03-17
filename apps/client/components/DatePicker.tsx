'use client';

import { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const goToPrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        onDateChange(prev);
    };

    const goToNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        if (next <= new Date()) {
            onDateChange(next);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        if (!isNaN(date.getTime())) {
            onDateChange(date);
            setIsOpen(false);
        }
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    return (
        <div ref={ref} className="relative inline-flex items-center gap-2">
            {/* Prev Button */}
            <button
                onClick={goToPrevDay}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                aria-label="Previous day"
            >
                ‹
            </button>

            {/* Date Display */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-amber-500 transition-colors"
            >
                <span className="font-medium">{formatDate(selectedDate)}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {/* Next Button */}
            <button
                onClick={goToNextDay}
                disabled={isToday}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isToday
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                aria-label="Next day"
            >
                ›
            </button>

            {/* Calendar Popup */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
            )}
        </div>
    );
}
