'use client';

/**
 * useSearchEngine Hook
 *
 * Provides a ready-to-use SearchEngine instance backed by sessionStorage cache.
 * On first load: fetches the index from the API (1 call).
 * On subsequent loads (same session): uses cached data (0 API calls).
 * Supports force-refresh with ETag validation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchEngine, type ArticleMeta } from '@/lib/search-engine';
import { SearchCache } from '@/lib/search-cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UseSearchEngineReturn {
    /** The search engine instance — null while loading */
    engine: SearchEngine | null;
    /** True while fetching the index for the first time */
    isLoading: boolean;
    /** True if data was loaded from sessionStorage (not API) */
    isCached: boolean;
    /** Human-readable cache age ("3 min ago", "Just now") */
    cacheAge: string;
    /** Timestamp of when the index was last fetched */
    lastUpdated: Date | null;
    /** Force re-fetch from API (uses ETag for zero-bandwidth if unchanged) */
    refresh: () => Promise<void>;
    /** Error message if the fetch failed */
    error: string | null;
    /** Total number of articles in the index */
    totalArticles: number;
}

export function useSearchEngine(): UseSearchEngineReturn {
    const [engine, setEngine] = useState<SearchEngine | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCached, setIsCached] = useState(false);
    const [cacheAge, setCacheAge] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [totalArticles, setTotalArticles] = useState(0);
    const engineRef = useRef<SearchEngine | null>(null);

    /** Build/rebuild the SearchEngine from article data */
    const buildEngine = useCallback((articles: ArticleMeta[]) => {
        const eng = new SearchEngine();
        eng.build(articles);
        engineRef.current = eng;
        setEngine(eng);
        setTotalArticles(eng.size);
    }, []);

    /** Fetch the search index from the API */
    const fetchIndex = useCallback(async (forceRefresh = false) => {
        try {
            setError(null);

            // Build headers for ETag validation
            const headers: Record<string, string> = {};
            if (!forceRefresh) {
                const etag = SearchCache.getEtag();
                if (etag) {
                    headers['If-None-Match'] = etag;
                }
            }

            const response = await fetch(`${API_URL}/api/search/index`, { headers });

            if (response.status === 304) {
                // Data hasn't changed — keep using cached version
                const cached = SearchCache.load();
                if (cached) {
                    buildEngine(cached.articles);
                    setIsCached(true);
                    setCacheAge(SearchCache.getCacheAge());
                    setLastUpdated(new Date(cached.timestamp));
                }
                return;
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const json = await response.json();
            if (!json.success || !json.data) {
                throw new Error('Invalid API response');
            }

            const articles: ArticleMeta[] = json.data;
            const etag = response.headers.get('etag') || `"${Date.now()}"`;

            // Save to sessionStorage
            SearchCache.save(articles, etag);

            // Build the engine
            buildEngine(articles);
            setIsCached(false);
            setCacheAge('Just now');
            setLastUpdated(new Date());
        } catch (err) {
            console.error('useSearchEngine: Failed to fetch index', err);
            setError(err instanceof Error ? err.message : 'Failed to load search index');

            // Fallback: try to use cached data even if refresh failed
            const cached = SearchCache.load();
            if (cached) {
                buildEngine(cached.articles);
                setIsCached(true);
                setCacheAge(SearchCache.getCacheAge());
                setLastUpdated(new Date(cached.timestamp));
            }
        }
    }, [buildEngine]);

    /** Initialize: load from cache or fetch from API */
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);

            // Check sessionStorage first
            const cached = SearchCache.load();
            if (cached) {
                // Build engine from cache immediately (0 API calls)
                buildEngine(cached.articles);
                setIsCached(true);
                setCacheAge(SearchCache.getCacheAge());
                setLastUpdated(new Date(cached.timestamp));
                setIsLoading(false);
                return;
            }

            // No cache — fetch from API
            await fetchIndex(true);
            setIsLoading(false);
        };

        init();
    }, [buildEngine, fetchIndex]);

    /** Update cache age display periodically */
    useEffect(() => {
        const interval = setInterval(() => {
            if (SearchCache.isCached()) {
                setCacheAge(SearchCache.getCacheAge());
            }
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    /** Force refresh — re-fetch from API */
    const refresh = useCallback(async () => {
        setIsLoading(true);
        SearchCache.clear();
        await fetchIndex(true);
        setIsLoading(false);
    }, [fetchIndex]);

    return {
        engine,
        isLoading,
        isCached,
        cacheAge,
        lastUpdated,
        refresh,
        error,
        totalArticles,
    };
}
