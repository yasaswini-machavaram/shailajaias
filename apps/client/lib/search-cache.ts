/**
 * Search Cache Manager
 *
 * Manages the search index in sessionStorage for zero-cost
 * repeat searches within the same browser session.
 */

import type { ArticleMeta } from './search-engine';

interface CachedData {
    articles: ArticleMeta[];
    etag: string;
    timestamp: number; // Date.now() when cached
}

const STORAGE_KEY = 'shailaja_search_index';

export class SearchCache {
    /**
     * Save the search index to sessionStorage.
     */
    static save(articles: ArticleMeta[], etag: string): void {
        try {
            const data: CachedData = {
                articles,
                etag,
                timestamp: Date.now(),
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (err) {
            // sessionStorage might be full or unavailable — fail silently
            console.warn('SearchCache: Failed to save to sessionStorage', err);
        }
    }

    /**
     * Load the search index from sessionStorage.
     * Returns null if not cached or if parsing fails.
     */
    static load(): CachedData | null {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data: CachedData = JSON.parse(raw);
            // Basic validation
            if (!data.articles || !data.etag || !data.timestamp) return null;
            return data;
        } catch {
            return null;
        }
    }

    /** Clear the cached search index */
    static clear(): void {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            // fail silently
        }
    }

    /** Check if a cached index exists */
    static isCached(): boolean {
        try {
            return sessionStorage.getItem(STORAGE_KEY) !== null;
        } catch {
            return false;
        }
    }

    /** Get the ETag of the cached index, or null */
    static getEtag(): string | null {
        const cached = SearchCache.load();
        return cached?.etag || null;
    }

    /**
     * Get human-readable cache age.
     * Returns "Just now", "2 minutes ago", "1 hour ago", etc.
     */
    static getCacheAge(): string {
        const cached = SearchCache.load();
        if (!cached) return '';

        const diffMs = Date.now() - cached.timestamp;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);

        if (diffSec < 30) return 'Just now';
        if (diffMin < 1) return `${diffSec}s ago`;
        if (diffMin < 60) return `${diffMin} min ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        return 'Over a day ago';
    }
}
