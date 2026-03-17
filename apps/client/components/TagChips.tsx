'use client';

import Link from 'next/link';

interface TagChipsProps {
    tags: string[];
    onTagClick?: (tag: string) => void;
    linkToSearch?: boolean;
}

export default function TagChips({ tags, onTagClick, linkToSearch = true }: TagChipsProps) {
    if (!tags || tags.length === 0) return null;

    const handleClick = (tag: string, e: React.MouseEvent) => {
        if (onTagClick) {
            e.preventDefault();
            onTagClick(tag);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
                const content = (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer">
                        #{tag}
                    </span>
                );

                if (linkToSearch && !onTagClick) {
                    return (
                        <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
                            {content}
                        </Link>
                    );
                }

                return (
                    <button key={tag} onClick={(e) => handleClick(tag, e)}>
                        {content}
                    </button>
                );
            })}
        </div>
    );
}
