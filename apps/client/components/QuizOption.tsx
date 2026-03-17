'use client';

interface QuizOptionProps {
    option: string;
    index: number;
    isSelected: boolean;
    isCorrect: boolean;
    isAnswered: boolean;
    onSelect: (index: number) => void;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export default function QuizOption({
    option,
    index,
    isSelected,
    isCorrect,
    isAnswered,
    onSelect,
}: QuizOptionProps) {
    const getStyles = () => {
        if (!isAnswered) {
            return isSelected
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50';
        }

        if (isCorrect) {
            return 'border-green-500 bg-green-50 text-green-800';
        }

        if (isSelected && !isCorrect) {
            return 'border-red-500 bg-red-50 text-red-800';
        }

        return 'border-gray-200 bg-gray-50 opacity-60';
    };

    const getIcon = () => {
        if (!isAnswered) return null;

        if (isCorrect) {
            return <span className="ml-auto text-green-600 text-lg">✓</span>;
        }

        if (isSelected && !isCorrect) {
            return <span className="ml-auto text-red-600 text-lg">✗</span>;
        }

        return null;
    };

    return (
        <button
            onClick={() => !isAnswered && onSelect(index)}
            disabled={isAnswered}
            className={`w-full min-h-[44px] p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${getStyles()} ${isAnswered ? 'cursor-default' : 'cursor-pointer'
                }`}
        >
            <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isAnswered && isCorrect
                        ? 'bg-green-500 text-white'
                        : isAnswered && isSelected && !isCorrect
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                    }`}
            >
                {optionLabels[index]}
            </span>
            <span className="flex-1 pt-1">{option}</span>
            {getIcon()}
        </button>
    );
}
