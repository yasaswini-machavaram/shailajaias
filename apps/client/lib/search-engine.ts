/**
 * Client-Side Search Engine
 *
 * Implements Trie (prefix tree) for title keyword search and
 * Inverted Index for O(1) tag lookups. Built entirely in the browser
 * from a lightweight article metadata index — zero API calls per search.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ArticleMeta {
    _id: string;
    title: string;
    type: string; // 'daily_prelims' | 'mains' | 'burning_issue_gallery' | 'quiz'
    date: string;
    tags: string[];
}

export interface SearchFilters {
    type?: string;
    year?: number;
    month?: number; // 1-based
}

// ─── Trie Node ──────────────────────────────────────────────────────────────

class TrieNode {
    children: Map<string, TrieNode> = new Map();
    /** Article IDs where this character sequence completes a word */
    articleIds: Set<string> = new Set();
}

// ─── Trie ───────────────────────────────────────────────────────────────────

class Trie {
    private root: TrieNode = new TrieNode();

    /**
     * Insert a word into the trie, associated with an article ID.
     * e.g. insert("banking", "article123")
     */
    insert(word: string, articleId: string): void {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.articleIds.add(articleId);
    }

    /**
     * Search for all article IDs matching a prefix.
     * Traverses to the prefix node, then collects all IDs from the subtree.
     * e.g. search("ban") → finds "banking", "bangalore", etc.
     */
    search(prefix: string): Set<string> {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children.has(char)) {
                return new Set(); // No match
            }
            node = node.children.get(char)!;
        }
        // Collect all article IDs from this subtree
        return this.collectIds(node);
    }

    /**
     * Remove an article ID from a specific word in the trie.
     */
    remove(word: string, articleId: string): void {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) return;
            node = node.children.get(char)!;
        }
        node.articleIds.delete(articleId);
    }

    /**
     * Recursively collect all article IDs from a node and its descendants.
     */
    private collectIds(node: TrieNode): Set<string> {
        const ids = new Set<string>(node.articleIds);
        for (const child of node.children.values()) {
            for (const id of this.collectIds(child)) {
                ids.add(id);
            }
        }
        return ids;
    }
}

// ─── Inverted Index ─────────────────────────────────────────────────────────

class InvertedIndex {
    /** lowercase tag → Set of article IDs */
    private tagMap: Map<string, Set<string>> = new Map();

    addArticle(id: string, tags: string[]): void {
        for (const tag of tags) {
            const key = tag.toLowerCase().trim();
            if (!key) continue;
            if (!this.tagMap.has(key)) {
                this.tagMap.set(key, new Set());
            }
            this.tagMap.get(key)!.add(id);
        }
    }

    /** O(1) lookup — returns article IDs matching the exact tag */
    getByTag(tag: string): Set<string> {
        return this.tagMap.get(tag.toLowerCase().trim()) || new Set();
    }

    removeArticle(id: string, tags: string[]): void {
        for (const tag of tags) {
            const key = tag.toLowerCase().trim();
            const set = this.tagMap.get(key);
            if (set) {
                set.delete(id);
                if (set.size === 0) this.tagMap.delete(key);
            }
        }
    }

    /** Get all unique tags, optionally filtered by a set of article IDs */
    getAllTags(articleIds?: Set<string>): string[] {
        const tags: string[] = [];
        for (const [tag, ids] of this.tagMap.entries()) {
            if (!articleIds || [...ids].some(id => articleIds.has(id))) {
                tags.push(tag);
            }
        }
        return tags.sort();
    }
}

// ─── Search Engine (Orchestrator) ───────────────────────────────────────────

/** Extracts lowercase words from a title string */
function extractWords(title: string): string[] {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 0);
}

export class SearchEngine {
    private trie: Trie = new Trie();
    private invertedIndex: InvertedIndex = new InvertedIndex();
    private articles: Map<string, ArticleMeta> = new Map();
    /** Reverse map for efficient removal: articleId → { tags, words } */
    private reverseMap: Map<string, { tags: string[]; words: string[] }> = new Map();

    /** Total number of articles indexed */
    get size(): number {
        return this.articles.size;
    }

    /**
     * Build the entire index from an array of article metadata.
     * Called once when the index is first loaded.
     */
    build(articles: ArticleMeta[]): void {
        this.trie = new Trie();
        this.invertedIndex = new InvertedIndex();
        this.articles = new Map();
        this.reverseMap = new Map();

        for (const article of articles) {
            this.addArticle(article);
        }
    }

    /** Add a single article to both data structures */
    addArticle(article: ArticleMeta): void {
        this.articles.set(article._id, article);

        // Inverted Index — tags
        this.invertedIndex.addArticle(article._id, article.tags || []);

        // Trie — each word in the title
        const words = extractWords(article.title);
        for (const word of words) {
            this.trie.insert(word, article._id);
        }

        // Reverse map for removal
        this.reverseMap.set(article._id, {
            tags: article.tags || [],
            words,
        });
    }

    /** Remove an article from both data structures */
    removeArticle(articleId: string): void {
        const meta = this.reverseMap.get(articleId);
        if (!meta) return;

        this.invertedIndex.removeArticle(articleId, meta.tags);
        for (const word of meta.words) {
            this.trie.remove(word, articleId);
        }
        this.articles.delete(articleId);
        this.reverseMap.delete(articleId);
    }

    /**
     * Tag search — O(1) lookup.
     * Returns articles matching the exact tag, with optional filters.
     */
    searchByTag(tag: string, filters?: SearchFilters): ArticleMeta[] {
        const ids = this.invertedIndex.getByTag(tag);
        return this.resolveAndFilter(ids, filters);
    }

    /**
     * Title keyword search — O(k) per word.
     * Splits the query into words and intersects results (AND logic).
     * Enforces 3-character minimum.
     *
     * Examples:
     *  - "ban" → finds articles with "banking", "bangalore" in title
     *  - "banking sector" → finds articles with BOTH "banking" AND "sector"
     */
    searchByTitle(query: string, filters?: SearchFilters): ArticleMeta[] {
        const trimmed = query.trim().toLowerCase();

        // Enforce 3-character minimum
        if (trimmed.length < 3) return [];

        const queryWords = trimmed.split(/\s+/).filter(w => w.length > 0);
        if (queryWords.length === 0) return [];

        // Get matching IDs for each word, then intersect (AND logic)
        let resultIds: Set<string> | null = null;

        for (const word of queryWords) {
            // Only search words with 2+ chars (skip single char words like "a", "in")
            // But if it's the only word, use it regardless
            if (word.length < 2 && queryWords.length > 1) continue;

            const ids = this.trie.search(word);
            if (resultIds === null) {
                resultIds = new Set(ids);
            } else {
                // Intersect: keep only IDs present in both sets
                for (const id of resultIds) {
                    if (!ids.has(id)) resultIds.delete(id);
                }
            }

            // Early exit: if intersection is empty, no need to check more words
            if (resultIds.size === 0) return [];
        }

        return this.resolveAndFilter(resultIds || new Set(), filters);
    }

    /**
     * Get all articles matching the given filters (no search term needed).
     * Used when browsing all articles of a type without a specific search query.
     */
    getAll(filters?: SearchFilters): ArticleMeta[] {
        const allIds = new Set(this.articles.keys());
        return this.resolveAndFilter(allIds, filters);
    }

    /**
     * Get all unique tags, optionally filtered by article type.
     * Returns tags in their original casing (uses the first occurrence found).
     */
    getAllTags(type?: string): string[] {
        if (!type) return this.invertedIndex.getAllTags();

        // Get article IDs of the specified type
        const typeIds = new Set<string>();
        for (const [id, article] of this.articles) {
            if (article.type === type) typeIds.add(id);
        }
        return this.invertedIndex.getAllTags(typeIds);
    }

    /**
     * Resolve article IDs to metadata and apply filters.
     * Results are sorted by date (newest first).
     */
    private resolveAndFilter(ids: Set<string>, filters?: SearchFilters): ArticleMeta[] {
        let results: ArticleMeta[] = [];

        for (const id of ids) {
            const article = this.articles.get(id);
            if (!article) continue;

            // Type filter
            if (filters?.type && filters.type !== 'all') {
                if (article.type !== filters.type) continue;
            }

            // Year filter
            if (filters?.year) {
                const articleYear = new Date(article.date).getUTCFullYear();
                if (articleYear !== filters.year) continue;
            }

            // Month filter (1-based)
            if (filters?.month) {
                const articleMonth = new Date(article.date).getUTCMonth() + 1;
                if (articleMonth !== filters.month) continue;
            }

            results.push(article);
        }

        // Sort by date, newest first
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return results;
    }
}
